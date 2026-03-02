import { Hono } from "hono";
import {
  queryOne,
  queryAll,
  transaction,
} from "../services/database/client.js";
import { insertOne, updateOne } from "../services/database/query-helpers.js";
import { invalidateTenant } from "../services/database/tenant-cache.js";
import { getAuthTenantId, getAuthUserId } from "../middleware/index.js";

export const tenantsRoutes = new Hono();

/** Row type for tenant data */
interface TenantRow {
  id: string;
  business_name: string;
  industry: string;
  phone_number: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  agent_name?: string;
  agent_personality?: object;
  voice_config?: object;
  greeting_standard?: string;
  greeting_after_hours?: string;
  greeting_returning?: string;
  timezone?: string;
  operating_hours?: object;
  escalation_enabled?: boolean;
  escalation_phone?: string;
  escalation_triggers?: string[];
  features?: object;
  subscription_tier?: string;
  custom_instructions?: string;
  questionnaire_answers?: object;
  responses?: object;
}

/** Row type for membership data */
interface MembershipRow {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  invited_at?: string;
  accepted_at?: string;
  invited_by?: string;
}

/**
 * GET /api/tenants
 * List tenants the user has access to (not all tenants)
 */
tenantsRoutes.get("/", async (c) => {
  const userId = getAuthUserId(c);

  try {
    // Get tenants the user is a member of using a JOIN
    const tenants = await queryAll<TenantRow & { role: string }>(
      `SELECT
        t.id,
        t.business_name,
        t.industry,
        t.phone_number,
        t.is_active,
        t.created_at,
        tm.role
      FROM tenant_members tm
      JOIN tenants t ON tm.tenant_id = t.id
      WHERE tm.user_id = $1 AND tm.is_active = true`,
      [userId],
    );

    return c.json({ tenants });
  } catch (err) {
    console.error("[tenants] GET / error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Database error" },
      500,
    );
  }
});

/**
 * GET /api/tenants/current
 * Get the current tenant (from X-Tenant-ID header, validated via auth)
 */
tenantsRoutes.get("/current", async (c) => {
  const tenantId = getAuthTenantId(c);

  try {
    const data = await queryOne<TenantRow>(
      `SELECT * FROM tenants WHERE id = $1`,
      [tenantId],
    );

    if (!data) {
      return c.json({ error: "Tenant not found" }, 404);
    }

    return c.json(data);
  } catch (err) {
    console.error("[tenants] GET /current error:", err);
    return c.json({ error: "Tenant not found" }, 404);
  }
});

/**
 * GET /api/tenants/:id
 * Get tenant details (must be a member)
 */
tenantsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const userId = getAuthUserId(c);

  try {
    // Verify user has access to this tenant
    const membership = await queryOne<{ role: string }>(
      `SELECT role FROM tenant_members
       WHERE user_id = $1 AND tenant_id = $2 AND is_active = true`,
      [userId, id],
    );

    if (!membership) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const data = await queryOne<TenantRow>(
      `SELECT * FROM tenants WHERE id = $1`,
      [id],
    );

    if (!data) {
      return c.json({ error: "Tenant not found" }, 404);
    }

    return c.json({ ...data, userRole: membership.role });
  } catch (err) {
    console.error("[tenants] GET /:id error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Database error" },
      500,
    );
  }
});

/**
 * POST /api/tenants
 * Create a new tenant and link the creating user as owner
 */
tenantsRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const userId = getAuthUserId(c);

  // Validate required fields
  if (!body.business_name || !body.phone_number || !body.industry) {
    return c.json(
      {
        error: "Missing required fields: business_name, phone_number, industry",
      },
      400,
    );
  }

  try {
    // Check if phone number is already in use
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM tenants WHERE phone_number = $1`,
      [body.phone_number],
    );

    if (existing) {
      return c.json({ error: "Phone number already in use" }, 400);
    }

    // Set defaults
    const tenant = {
      business_name: body.business_name,
      phone_number: body.phone_number,
      industry: body.industry,
      agent_name: body.agent_name || "AI Assistant",
      agent_personality: body.agent_personality || {
        tone: "professional",
        verbosity: "balanced",
        empathy: "medium",
        humor: false,
      },
      voice_config: body.voice_config || {
        provider: "cartesia",
        voice_id: "02fe5732-a072-4767-83e3-a91d41d274ca",
        voice_name: "Madison",
        speaking_rate: 1.0,
        pitch: 1.0,
      },
      greeting_standard:
        body.greeting_standard ||
        `Hello, thank you for calling {business_name}. This is {agent_name}. How can I help you today?`,
      greeting_after_hours:
        body.greeting_after_hours ||
        `Thank you for calling {business_name}. We're currently closed, but I can still help you with questions or schedule an appointment.`,
      greeting_returning: body.greeting_returning || null,
      timezone: body.timezone || "America/New_York",
      operating_hours: body.operating_hours || {
        schedule: [
          { day: 0, enabled: false, open_time: "09:00", close_time: "17:00" },
          { day: 1, enabled: true, open_time: "09:00", close_time: "17:00" },
          { day: 2, enabled: true, open_time: "09:00", close_time: "17:00" },
          { day: 3, enabled: true, open_time: "09:00", close_time: "17:00" },
          { day: 4, enabled: true, open_time: "09:00", close_time: "17:00" },
          { day: 5, enabled: true, open_time: "09:00", close_time: "17:00" },
          { day: 6, enabled: false, open_time: "09:00", close_time: "17:00" },
        ],
        holidays: [],
      },
      escalation_enabled: body.escalation_enabled ?? true,
      escalation_phone: body.escalation_phone || null,
      escalation_triggers: body.escalation_triggers || [
        "speak to human",
        "manager",
      ],
      features: body.features || {
        sms_confirmations: true,
        email_notifications: false,
        live_transfer: true,
        voicemail_fallback: true,
        sentiment_analysis: true,
        recording_enabled: true,
        transcription_enabled: true,
      },
      is_active: true,
      subscription_tier: body.subscription_tier || "starter",
    };

    // Use transaction to ensure tenant and membership are created atomically
    const tenantData = await transaction(async (client) => {
      // Create tenant
      const insertTenantSql = `
        INSERT INTO tenants (
          business_name, phone_number, industry, agent_name, agent_personality,
          voice_config, greeting_standard, greeting_after_hours, greeting_returning,
          timezone, operating_hours, escalation_enabled, escalation_phone,
          escalation_triggers, features, is_active, subscription_tier
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        ) RETURNING *
      `;
      const tenantResult = await client.query<TenantRow>(insertTenantSql, [
        tenant.business_name,
        tenant.phone_number,
        tenant.industry,
        tenant.agent_name,
        tenant.agent_personality,
        tenant.voice_config,
        tenant.greeting_standard,
        tenant.greeting_after_hours,
        tenant.greeting_returning,
        tenant.timezone,
        tenant.operating_hours,
        tenant.escalation_enabled,
        tenant.escalation_phone,
        tenant.escalation_triggers,
        tenant.features,
        tenant.is_active,
        tenant.subscription_tier,
      ]);

      const createdTenant = tenantResult.rows[0];

      // Create tenant membership for the creating user as owner
      const insertMembershipSql = `
        INSERT INTO tenant_members (tenant_id, user_id, role, accepted_at)
        VALUES ($1, $2, $3, $4)
      `;
      await client.query(insertMembershipSql, [
        createdTenant.id,
        userId,
        "owner",
        new Date().toISOString(),
      ]);

      return createdTenant;
    });

    return c.json(tenantData, 201);
  } catch (err) {
    console.error("[tenants] POST / error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Database error" },
      500,
    );
  }
});

/**
 * PUT /api/tenants/:id
 * Update tenant configuration (owner/admin only)
 */
tenantsRoutes.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const userId = getAuthUserId(c);

  try {
    // Verify user is owner or admin
    const membership = await queryOne<{ role: string }>(
      `SELECT role FROM tenant_members
       WHERE user_id = $1 AND tenant_id = $2 AND is_active = true`,
      [userId, id],
    );

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return c.json({ error: "Forbidden - owner or admin role required" }, 403);
    }

    // Remove fields that shouldn't be updated directly
    delete body.id;
    delete body.created_at;
    delete body.phone_number; // Phone number changes need special handling

    // Validate industry if provided
    const VALID_INDUSTRIES = [
      "hotel",
      "motel",
      "restaurant",
      "medical",
      "dental",
      "salon",
      "auto_service",
    ];
    if (body.industry && !VALID_INDUSTRIES.includes(body.industry)) {
      return c.json({ error: "Invalid industry type" }, 400);
    }

    body.updated_at = new Date().toISOString();

    const data = await updateOne<TenantRow>("tenants", body, { id });

    if (!data) {
      return c.json({ error: "Tenant not found" }, 404);
    }

    // Invalidate cache so changes take effect immediately
    await invalidateTenant(id);

    return c.json(data);
  } catch (err) {
    console.error("[tenants] PUT /:id error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Database error" },
      500,
    );
  }
});

/**
 * DELETE /api/tenants/:id
 * Deactivate a tenant (owner only)
 */
tenantsRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const userId = getAuthUserId(c);

  try {
    // Verify user is owner
    const membership = await queryOne<{ role: string }>(
      `SELECT role FROM tenant_members
       WHERE user_id = $1 AND tenant_id = $2 AND is_active = true`,
      [userId, id],
    );

    if (!membership || membership.role !== "owner") {
      return c.json({ error: "Forbidden - owner role required" }, 403);
    }

    await updateOne<TenantRow>(
      "tenants",
      {
        is_active: false,
        updated_at: new Date().toISOString(),
      },
      { id },
    );

    // Invalidate cache
    await invalidateTenant(id);

    return c.json({ success: true });
  } catch (err) {
    console.error("[tenants] DELETE /:id error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Database error" },
      500,
    );
  }
});

/**
 * PUT /api/tenants/:id/phone
 * Update tenant phone number (owner only)
 * This requires special handling since phone numbers map to tenant lookups
 */
tenantsRoutes.put("/:id/phone", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const userId = getAuthUserId(c);

  try {
    // Verify user is owner
    const membership = await queryOne<{ role: string }>(
      `SELECT role FROM tenant_members
       WHERE user_id = $1 AND tenant_id = $2 AND is_active = true`,
      [userId, id],
    );

    if (!membership || membership.role !== "owner") {
      return c.json({ error: "Forbidden - owner role required" }, 403);
    }

    if (!body.phone_number) {
      return c.json({ error: "phone_number is required" }, 400);
    }

    // Normalize phone number (ensure +1 prefix for US numbers)
    let phoneNumber = body.phone_number.replace(/\D/g, "");
    if (phoneNumber.length === 10) {
      phoneNumber = "+1" + phoneNumber;
    } else if (phoneNumber.length === 11 && phoneNumber.startsWith("1")) {
      phoneNumber = "+" + phoneNumber;
    } else if (!phoneNumber.startsWith("+")) {
      phoneNumber = "+" + phoneNumber;
    }

    // Check if phone number is already in use by another tenant
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM tenants WHERE phone_number = $1 AND id != $2`,
      [phoneNumber, id],
    );

    if (existing) {
      return c.json(
        { error: "Phone number already in use by another tenant" },
        400,
      );
    }

    // Update phone number
    const data = await updateOne<TenantRow>(
      "tenants",
      {
        phone_number: phoneNumber,
        updated_at: new Date().toISOString(),
      },
      { id },
    );

    if (!data) {
      return c.json({ error: "Tenant not found" }, 404);
    }

    // Invalidate cache so new phone number mapping takes effect
    await invalidateTenant(id);

    return c.json(data);
  } catch (err) {
    console.error("[tenants] PUT /:id/phone error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Database error" },
      500,
    );
  }
});

/**
 * POST /api/tenants/:id/members
 * Invite a user to the tenant (owner/admin only)
 */
tenantsRoutes.post("/:id/members", async (c) => {
  const tenantId = c.req.param("id");
  const body = await c.req.json();
  const userId = getAuthUserId(c);

  try {
    // Verify user is owner or admin
    const membership = await queryOne<{ role: string }>(
      `SELECT role FROM tenant_members
       WHERE user_id = $1 AND tenant_id = $2 AND is_active = true`,
      [userId, tenantId],
    );

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    if (!body.user_id || !body.role) {
      return c.json({ error: "user_id and role are required" }, 400);
    }

    // Can't add owner role unless you are owner
    if (body.role === "owner" && membership.role !== "owner") {
      return c.json({ error: "Only owners can add other owners" }, 403);
    }

    const data = await insertOne<MembershipRow>("tenant_members", {
      tenant_id: tenantId,
      user_id: body.user_id,
      role: body.role,
      invited_by: userId,
      invited_at: new Date().toISOString(),
      accepted_at: new Date().toISOString(), // Auto-accept for now
    });

    return c.json(data, 201);
  } catch (err) {
    console.error("[tenants] POST /:id/members error:", err);

    // Check for unique constraint violation (user already a member)
    const pgError = err as { code?: string };
    if (pgError.code === "23505") {
      return c.json({ error: "User is already a member" }, 400);
    }

    return c.json(
      { error: err instanceof Error ? err.message : "Database error" },
      500,
    );
  }
});

/**
 * GET /api/tenants/:id/members
 * List tenant members
 */
tenantsRoutes.get("/:id/members", async (c) => {
  const tenantId = c.req.param("id");
  const userId = getAuthUserId(c);

  try {
    // Verify user has access
    const membership = await queryOne<{ role: string }>(
      `SELECT role FROM tenant_members
       WHERE user_id = $1 AND tenant_id = $2 AND is_active = true`,
      [userId, tenantId],
    );

    if (!membership) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const data = await queryAll<
      Pick<
        MembershipRow,
        "id" | "user_id" | "role" | "created_at" | "invited_at" | "accepted_at"
      >
    >(
      `SELECT id, user_id, role, created_at, invited_at, accepted_at
       FROM tenant_members
       WHERE tenant_id = $1 AND is_active = true`,
      [tenantId],
    );

    return c.json({ members: data });
  } catch (err) {
    console.error("[tenants] GET /:id/members error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Database error" },
      500,
    );
  }
});

/**
 * DELETE /api/tenants/:id/members/:memberId
 * Remove a member from the tenant
 */
tenantsRoutes.delete("/:id/members/:memberId", async (c) => {
  const tenantId = c.req.param("id");
  const memberId = c.req.param("memberId");
  const userId = getAuthUserId(c);

  try {
    // Verify user is owner or admin
    const membership = await queryOne<{ role: string }>(
      `SELECT role FROM tenant_members
       WHERE user_id = $1 AND tenant_id = $2 AND is_active = true`,
      [userId, tenantId],
    );

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // Get target member info
    const targetMember = await queryOne<{ role: string; user_id: string }>(
      `SELECT role, user_id FROM tenant_members
       WHERE id = $1 AND tenant_id = $2`,
      [memberId, tenantId],
    );

    if (!targetMember) {
      return c.json({ error: "Member not found" }, 404);
    }

    // Can't remove owner unless you are owner
    if (targetMember.role === "owner" && membership.role !== "owner") {
      return c.json({ error: "Only owners can remove owners" }, 403);
    }

    // Can't remove yourself if you're the last owner
    if (targetMember.user_id === userId && targetMember.role === "owner") {
      const countResult = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM tenant_members
         WHERE tenant_id = $1 AND role = $2 AND is_active = true`,
        [tenantId, "owner"],
      );

      const count = parseInt(countResult?.count || "0", 10);
      if (count === 1) {
        return c.json({ error: "Cannot remove the last owner" }, 400);
      }
    }

    await updateOne<MembershipRow>(
      "tenant_members",
      { is_active: false },
      { id: memberId },
    );

    return c.json({ success: true });
  } catch (err) {
    console.error("[tenants] DELETE /:id/members/:memberId error:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Database error" },
      500,
    );
  }
});
