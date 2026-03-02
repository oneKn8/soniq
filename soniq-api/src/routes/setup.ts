import { Hono } from "hono";
import {
  queryOne,
  queryAll,
  transaction,
} from "../services/database/client.js";
import { updateOne } from "../services/database/query-helpers.js";
import { getAuthUserId } from "../middleware/index.js";
import { invalidateTenant } from "../services/database/tenant-cache.js";
import type { SetupStep } from "../types/database.js";
import type { PoolClient } from "pg";

export const setupRoutes = new Hono();

const SETUP_STEPS: SetupStep[] = [
  "business",
  "capabilities",
  "details",
  "integrations",
  "assistant",
  "phone",
  "hours",
  "escalation",
  "review",
];

function getNextStep(currentStep: SetupStep): SetupStep | null {
  const idx = SETUP_STEPS.indexOf(currentStep);
  if (idx === -1 || idx >= SETUP_STEPS.length - 1) return null;
  return SETUP_STEPS[idx + 1];
}

/** Type definitions for database rows */
interface TenantRow {
  id: string;
  business_name: string | null;
  industry: string | null;
  location_city: string | null;
  location_address: string | null;
  agent_name: string | null;
  agent_personality: string | null;
  voice_config: Record<string, unknown> | null;
  greeting_standard: string | null;
  greeting_after_hours: string | null;
  greeting_returning: string | null;
  timezone: string | null;
  operating_hours: Record<string, unknown> | null;
  escalation_enabled: boolean | null;
  escalation_phone: string | null;
  escalation_triggers: string[] | null;
  features: Record<string, unknown> | null;
  setup_step: SetupStep | null;
  setup_completed_at: string | null;
  status: string | null;
  assisted_mode: boolean | null;
  after_hours_behavior: Record<string, unknown> | null;
  transfer_behavior: Record<string, unknown> | null;
  phone_number: string | null;
  is_active: boolean;
}

interface MembershipRow {
  tenant_id: string;
  role: string;
}

interface CapabilityRow {
  capability: string;
  config: Record<string, unknown>;
  is_enabled: boolean;
}

interface PhoneConfigRow {
  id: string;
  phone_number: string | null;
  status: string;
  setup_type: string;
  provider: string | null;
  provider_sid: string | null;
  port_request_id: string | null;
  verified_at: string | null;
}

interface EscalationContactRow {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  role: string | null;
  is_primary: boolean;
  availability: string;
  availability_hours: Record<string, unknown> | null;
  sort_order: number;
}

interface IntegrationRow {
  provider: string;
  status: string;
  external_account_id: string | null;
}

/**
 * GET /api/setup/progress
 * Returns current setup step and saved data for resuming
 */
setupRoutes.get("/progress", async (c) => {
  const userId = getAuthUserId(c);

  try {
    // Get tenant the user owns (for setup, we need owner role)
    const membershipSql = `
      SELECT tm.tenant_id, tm.role
      FROM tenant_members tm
      WHERE tm.user_id = $1
        AND tm.role = 'owner'
        AND tm.is_active = true
      LIMIT 1
    `;
    const membership = await queryOne<MembershipRow>(membershipSql, [userId]);

    // No tenant yet - start fresh
    if (!membership) {
      return c.json({
        step: "business",
        completed: false,
        data: {},
      });
    }

    // Get tenant data
    const tenantSql = `
      SELECT
        id, business_name, industry, location_city, location_address,
        agent_name, agent_personality, voice_config,
        greeting_standard, greeting_after_hours, greeting_returning,
        timezone, operating_hours, escalation_enabled, escalation_phone,
        escalation_triggers, features, setup_step, setup_completed_at,
        status, assisted_mode, after_hours_behavior, transfer_behavior
      FROM tenants
      WHERE id = $1
    `;
    const tenant = await queryOne<TenantRow>(tenantSql, [membership.tenant_id]);

    if (!tenant) {
      return c.json({
        step: "business",
        completed: false,
        data: {},
      });
    }

    // Get capabilities
    const capabilitiesSql = `
      SELECT capability, config, is_enabled
      FROM tenant_capabilities
      WHERE tenant_id = $1
    `;
    const capabilities = await queryAll<CapabilityRow>(capabilitiesSql, [
      tenant.id,
    ]);

    // Get phone configuration
    const phoneConfigSql = `
      SELECT *
      FROM phone_configurations
      WHERE tenant_id = $1
      LIMIT 1
    `;
    const phoneConfig = await queryOne<PhoneConfigRow>(phoneConfigSql, [
      tenant.id,
    ]);

    // Get escalation contacts
    const escalationContactsSql = `
      SELECT *
      FROM escalation_contacts
      WHERE tenant_id = $1
      ORDER BY sort_order ASC
    `;
    const escalationContacts = await queryAll<EscalationContactRow>(
      escalationContactsSql,
      [tenant.id],
    );

    // Get integrations
    const integrationsSql = `
      SELECT provider, status, external_account_id
      FROM tenant_integrations
      WHERE tenant_id = $1
    `;
    const integrations = await queryAll<IntegrationRow>(integrationsSql, [
      tenant.id,
    ]);

    return c.json({
      step: tenant.setup_step || "business",
      completed: !!tenant.setup_completed_at,
      tenantId: tenant.id,
      data: {
        // Business step
        business_name: tenant.business_name,
        industry: tenant.industry,
        location_city: tenant.location_city,
        location_address: tenant.location_address,
        // Capabilities step
        capabilities: capabilities || [],
        // Integrations step
        integrations: integrations || [],
        assisted_mode: tenant.assisted_mode,
        // Assistant step
        agent_name: tenant.agent_name,
        agent_personality: tenant.agent_personality,
        voice_config: tenant.voice_config,
        greeting_standard: tenant.greeting_standard,
        greeting_after_hours: tenant.greeting_after_hours,
        greeting_returning: tenant.greeting_returning,
        // Phone step
        phone_config: phoneConfig,
        // Hours step
        timezone: tenant.timezone,
        operating_hours: tenant.operating_hours,
        after_hours_behavior: tenant.after_hours_behavior,
        // Escalation step
        escalation_enabled: tenant.escalation_enabled,
        escalation_phone: tenant.escalation_phone,
        escalation_triggers: tenant.escalation_triggers,
        escalation_contacts: escalationContacts || [],
        transfer_behavior: tenant.transfer_behavior,
        // Features
        features: tenant.features,
      },
    });
  } catch (error) {
    console.error("[SETUP] Error fetching progress:", error);
    return c.json({ error: "Failed to fetch setup progress" }, 500);
  }
});

/**
 * PUT /api/setup/step/:step
 * Saves data for a specific step
 */
setupRoutes.put("/step/:step", async (c) => {
  const step = c.req.param("step") as SetupStep;
  const body = await c.req.json();
  const userId = getAuthUserId(c);

  // Validate step parameter
  if (!SETUP_STEPS.includes(step)) {
    return c.json({ error: "Invalid step" }, 400);
  }

  try {
    // Get or create tenant
    let tenantId: string;

    const membershipSql = `
      SELECT tenant_id
      FROM tenant_members
      WHERE user_id = $1
        AND role = 'owner'
        AND is_active = true
      LIMIT 1
    `;
    const membership = await queryOne<{ tenant_id: string }>(membershipSql, [
      userId,
    ]);

    if (step === "business") {
      // Validate required business fields
      if (!body.business_name || !body.industry) {
        return c.json(
          { error: "business_name and industry are required" },
          400,
        );
      }

      if (membership) {
        // Update existing tenant
        tenantId = membership.tenant_id;
        await updateOne(
          "tenants",
          {
            business_name: body.business_name,
            industry: body.industry,
            location_city: body.location_city || null,
            location_address: body.location_address || null,
            setup_step: getNextStep(step) || step,
            updated_at: new Date().toISOString(),
          },
          { id: tenantId },
        );
      } else {
        // Create new tenant with membership in a transaction
        const result = await transaction(async (client: PoolClient) => {
          // Create tenant
          const tenantResult = await client.query<TenantRow>(
            `INSERT INTO tenants (business_name, industry, location_city, location_address, phone_number, setup_step, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [
              body.business_name,
              body.industry,
              body.location_city || null,
              body.location_address || null,
              `pending_${Date.now()}`,
              getNextStep(step) || step,
              "draft",
            ],
          );

          const newTenantId = tenantResult.rows[0].id;

          // Create membership
          await client.query(
            `INSERT INTO tenant_members (tenant_id, user_id, role, accepted_at)
             VALUES ($1, $2, $3, $4)`,
            [newTenantId, userId, "owner", new Date().toISOString()],
          );

          return newTenantId;
        });

        tenantId = result;
      }
    } else {
      // All other steps require existing tenant
      if (!membership) {
        return c.json(
          { error: "No tenant found. Complete business step first." },
          400,
        );
      }
      tenantId = membership.tenant_id;
    }

    // Handle step-specific data
    switch (step) {
      case "capabilities": {
        if (!body.capabilities || !Array.isArray(body.capabilities)) {
          return c.json({ error: "capabilities array is required" }, 400);
        }

        await transaction(async (client: PoolClient) => {
          // Delete existing capabilities
          await client.query(
            "DELETE FROM tenant_capabilities WHERE tenant_id = $1",
            [tenantId],
          );

          // Insert new capabilities
          if (body.capabilities.length > 0) {
            for (const cap of body.capabilities) {
              const capability = typeof cap === "string" ? cap : cap.capability;
              const config =
                typeof cap === "object" && cap.config ? cap.config : {};

              await client.query(
                `INSERT INTO tenant_capabilities (tenant_id, capability, config, is_enabled)
                 VALUES ($1, $2, $3, $4)`,
                [tenantId, capability, JSON.stringify(config), true],
              );
            }
          }

          // Update tenant setup step
          await client.query(
            `UPDATE tenants SET setup_step = $1, updated_at = $2 WHERE id = $3`,
            [getNextStep(step) || step, new Date().toISOString(), tenantId],
          );
        });
        break;
      }

      case "details": {
        // Update capability configs
        if (body.capability_details) {
          for (const [capability, config] of Object.entries(
            body.capability_details as Record<string, Record<string, unknown>>,
          )) {
            await updateOne(
              "tenant_capabilities",
              { config: JSON.stringify(config) },
              { tenant_id: tenantId, capability },
            );
          }
        }

        await updateOne(
          "tenants",
          {
            setup_step: getNextStep(step) || step,
            updated_at: new Date().toISOString(),
          },
          { id: tenantId },
        );
        break;
      }

      case "integrations": {
        await updateOne(
          "tenants",
          {
            assisted_mode: body.integration_mode === "assisted",
            setup_step: getNextStep(step) || step,
            updated_at: new Date().toISOString(),
          },
          { id: tenantId },
        );
        break;
      }

      case "assistant": {
        const updateData: Record<string, unknown> = {
          setup_step: getNextStep(step) || step,
          updated_at: new Date().toISOString(),
        };

        if (body.agent_name) updateData.agent_name = body.agent_name;
        if (body.agent_personality)
          updateData.agent_personality = JSON.stringify(
            typeof body.agent_personality === "string"
              ? { tone: body.agent_personality }
              : body.agent_personality,
          );
        if (body.voice_config)
          updateData.voice_config = JSON.stringify(body.voice_config);
        if (body.greeting_standard)
          updateData.greeting_standard = body.greeting_standard;
        if (body.greeting_after_hours !== undefined)
          updateData.greeting_after_hours = body.greeting_after_hours;
        if (body.greeting_returning !== undefined)
          updateData.greeting_returning = body.greeting_returning;

        await updateOne("tenants", updateData, { id: tenantId });
        break;
      }

      case "phone": {
        // Phone setup is handled by separate phone config API
        // Just advance the step
        await updateOne(
          "tenants",
          {
            setup_step: getNextStep(step) || step,
            updated_at: new Date().toISOString(),
          },
          { id: tenantId },
        );
        break;
      }

      case "hours": {
        const updateData: Record<string, unknown> = {
          setup_step: getNextStep(step) || step,
          updated_at: new Date().toISOString(),
        };

        if (body.timezone) updateData.timezone = body.timezone;
        if (body.operating_hours)
          updateData.operating_hours = JSON.stringify(body.operating_hours);
        if (body.after_hours_behavior)
          updateData.after_hours_behavior = JSON.stringify(
            body.after_hours_behavior,
          );

        await updateOne("tenants", updateData, { id: tenantId });
        break;
      }

      case "escalation": {
        const updateData: Record<string, unknown> = {
          setup_step: getNextStep(step) || step,
          updated_at: new Date().toISOString(),
        };

        if (body.escalation_enabled !== undefined)
          updateData.escalation_enabled = body.escalation_enabled;
        if (body.escalation_phone !== undefined)
          updateData.escalation_phone = body.escalation_phone;
        if (body.escalation_triggers)
          updateData.escalation_triggers = body.escalation_triggers;
        if (body.transfer_behavior)
          updateData.transfer_behavior = JSON.stringify(body.transfer_behavior);

        await updateOne("tenants", updateData, { id: tenantId });

        // Handle contacts if provided
        if (body.contacts && Array.isArray(body.contacts)) {
          await transaction(async (client: PoolClient) => {
            // Delete existing contacts
            await client.query(
              "DELETE FROM escalation_contacts WHERE tenant_id = $1",
              [tenantId],
            );

            // Insert new contacts
            for (let idx = 0; idx < body.contacts.length; idx++) {
              const contact = body.contacts[idx];
              await client.query(
                `INSERT INTO escalation_contacts
                   (tenant_id, name, phone, role, is_primary, availability, availability_hours, sort_order)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                  tenantId,
                  contact.name,
                  contact.phone,
                  contact.role || null,
                  contact.is_primary || idx === 0,
                  contact.availability || "business_hours",
                  contact.availability_hours
                    ? JSON.stringify(contact.availability_hours)
                    : null,
                  idx,
                ],
              );
            }
          });
        }
        break;
      }

      case "review": {
        // Just save the step - completion is via separate endpoint
        await updateOne(
          "tenants",
          {
            setup_step: step,
            updated_at: new Date().toISOString(),
          },
          { id: tenantId },
        );
        break;
      }
    }

    // Invalidate cache
    await invalidateTenant(tenantId);

    return c.json({
      success: true,
      nextStep: getNextStep(step),
    });
  } catch (error) {
    console.error("[SETUP] Error saving step:", error);
    return c.json({ error: "Failed to save setup step" }, 500);
  }
});

/**
 * POST /api/setup/complete
 * Finalizes setup and launches agent
 */
setupRoutes.post("/complete", async (c) => {
  const userId = getAuthUserId(c);

  try {
    // Get tenant
    const membershipSql = `
      SELECT tenant_id
      FROM tenant_members
      WHERE user_id = $1
        AND role = 'owner'
        AND is_active = true
      LIMIT 1
    `;
    const membership = await queryOne<{ tenant_id: string }>(membershipSql, [
      userId,
    ]);

    if (!membership) {
      return c.json({ error: "No tenant found" }, 400);
    }

    const tenantId = membership.tenant_id;

    // Get tenant to verify setup state
    const tenantSql = `SELECT * FROM tenants WHERE id = $1`;
    const tenant = await queryOne<TenantRow>(tenantSql, [tenantId]);

    if (!tenant) {
      return c.json({ error: "Tenant not found" }, 404);
    }

    // Verify required data is present
    if (!tenant.business_name || !tenant.industry) {
      return c.json({ error: "Business information incomplete" }, 400);
    }

    // Check phone configuration
    const phoneConfigSql = `
      SELECT phone_number, status
      FROM phone_configurations
      WHERE tenant_id = $1
      LIMIT 1
    `;
    const phoneConfig = await queryOne<{
      phone_number: string;
      status: string;
    }>(phoneConfigSql, [tenantId]);

    // Build update data
    const updateData: Record<string, unknown> = {
      status: "active",
      setup_completed: true,
      setup_completed_at: new Date().toISOString(),
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    // Update phone number from phone_configurations if available
    if (phoneConfig?.phone_number) {
      updateData.phone_number = phoneConfig.phone_number;
    }

    await updateOne("tenants", updateData, { id: tenantId });

    // Invalidate cache
    await invalidateTenant(tenantId);

    return c.json({
      success: true,
      tenantId,
    });
  } catch (error) {
    console.error("[SETUP] Error completing setup:", error);
    return c.json({ error: "Failed to complete setup" }, 500);
  }
});

/**
 * POST /api/setup/go-back
 * Navigate to a previous step
 */
setupRoutes.post("/go-back", async (c) => {
  const body = await c.req.json();
  const userId = getAuthUserId(c);

  const targetStep = body.step as SetupStep;

  if (!SETUP_STEPS.includes(targetStep)) {
    return c.json({ error: "Invalid step" }, 400);
  }

  try {
    const membershipSql = `
      SELECT tenant_id
      FROM tenant_members
      WHERE user_id = $1
        AND role = 'owner'
        AND is_active = true
      LIMIT 1
    `;
    const membership = await queryOne<{ tenant_id: string }>(membershipSql, [
      userId,
    ]);

    if (!membership) {
      return c.json({ error: "No tenant found" }, 400);
    }

    await updateOne(
      "tenants",
      {
        setup_step: targetStep,
        updated_at: new Date().toISOString(),
      },
      { id: membership.tenant_id },
    );

    await invalidateTenant(membership.tenant_id);

    return c.json({ success: true, step: targetStep });
  } catch (error) {
    console.error("[SETUP] Error going back:", error);
    return c.json({ error: "Failed to navigate back" }, 500);
  }
});
