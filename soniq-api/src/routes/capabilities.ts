import { Hono } from "hono";
import {
  queryOne,
  queryAll,
  transaction,
} from "../services/database/client.js";
import { getAuthUserId } from "../middleware/index.js";
import type { PoolClient } from "pg";

export const capabilitiesRoutes = new Hono();

/** Type definitions for database rows */
interface MembershipRow {
  tenant_id: string;
  role: string;
}

interface CapabilityRow {
  id: string;
  tenant_id: string;
  capability: string;
  config: Record<string, unknown>;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// The one flat universal capability set. No per-industry menus.
const UNIVERSAL_CAPABILITY_OPTIONS: {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: "core" | "communication" | "advanced";
  requiresIntegration?: boolean;
}[] = [
  {
    id: "appointment_booking",
    label: "Appointment Booking",
    description: "Book and manage appointments for callers",
    icon: "calendar",
    category: "core",
  },
  {
    id: "order_taking",
    label: "Order / Request Taking",
    description: "Take orders or log caller requests",
    icon: "package",
    category: "core",
  },
  {
    id: "faq",
    label: "FAQ & Knowledge",
    description: "Answer common questions about the business",
    icon: "help-circle",
    category: "advanced",
  },
  {
    id: "call_transfer",
    label: "Call Transfer / Escalation",
    description: "Connect callers to a person when needed",
    icon: "phone-forwarded",
    category: "communication",
  },
  {
    id: "voicemail",
    label: "Voicemail",
    description: "Take messages when no one is available",
    icon: "message-square",
    category: "communication",
  },
  {
    id: "callbacks",
    label: "Callbacks",
    description: "Record callback requests for follow-up",
    icon: "phone-call",
    category: "communication",
  },
];

/**
 * GET /api/capabilities/options/:industry
 * Returns the universal capability set. The :industry path param is retained
 * for wire compatibility but is ignored.
 */
capabilitiesRoutes.get("/options/:industry", async (c) => {
  return c.json({ capabilities: UNIVERSAL_CAPABILITY_OPTIONS });
});

/**
 * GET /api/capabilities
 * Returns tenant's enabled capabilities
 */
capabilitiesRoutes.get("/", async (c) => {
  const userId = getAuthUserId(c);

  try {
    // Get tenant
    const membershipSql = `
      SELECT tenant_id
      FROM tenant_members
      WHERE user_id = $1
        AND is_active = true
      LIMIT 1
    `;
    const membership = await queryOne<{ tenant_id: string }>(membershipSql, [
      userId,
    ]);

    if (!membership) {
      return c.json({ capabilities: [] });
    }

    const capabilitiesSql = `
      SELECT *
      FROM tenant_capabilities
      WHERE tenant_id = $1
      ORDER BY created_at ASC
    `;
    const capabilities = await queryAll<CapabilityRow>(capabilitiesSql, [
      membership.tenant_id,
    ]);

    return c.json({ capabilities: capabilities || [] });
  } catch (error) {
    console.error("[CAPABILITIES] Error fetching capabilities:", error);
    return c.json({ error: "Failed to fetch capabilities" }, 500);
  }
});

/**
 * PUT /api/capabilities
 * Updates tenant's capabilities
 */
capabilitiesRoutes.put("/", async (c) => {
  const body = await c.req.json();
  const userId = getAuthUserId(c);

  if (!body.capabilities || !Array.isArray(body.capabilities)) {
    return c.json({ error: "capabilities array is required" }, 400);
  }

  try {
    // Get tenant (must be owner or admin)
    const membershipSql = `
      SELECT tenant_id, role
      FROM tenant_members
      WHERE user_id = $1
        AND is_active = true
        AND role = ANY($2)
      LIMIT 1
    `;
    const membership = await queryOne<MembershipRow>(membershipSql, [
      userId,
      ["owner", "admin"],
    ]);

    if (!membership) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const tenantId = membership.tenant_id;

    // Delete existing capabilities and insert new ones in a transaction
    await transaction(async (client: PoolClient) => {
      // Delete existing capabilities
      await client.query(
        "DELETE FROM tenant_capabilities WHERE tenant_id = $1",
        [tenantId],
      );

      // Insert new capabilities
      for (const cap of body.capabilities) {
        await client.query(
          `INSERT INTO tenant_capabilities (tenant_id, capability, config, is_enabled)
           VALUES ($1, $2, $3, $4)`,
          [tenantId, cap.capability, JSON.stringify(cap.config || {}), true],
        );
      }
    });

    // Return updated list
    const updatedSql = `
      SELECT *
      FROM tenant_capabilities
      WHERE tenant_id = $1
      ORDER BY created_at ASC
    `;
    const updated = await queryAll<CapabilityRow>(updatedSql, [tenantId]);

    return c.json({ capabilities: updated || [] });
  } catch (error) {
    console.error("[CAPABILITIES] Error updating capabilities:", error);
    return c.json({ error: "Failed to update capabilities" }, 500);
  }
});

/**
 * PUT /api/capabilities/:capability
 * Update a specific capability's config
 */
capabilitiesRoutes.put("/:capability", async (c) => {
  const capability = c.req.param("capability");
  const body = await c.req.json();
  const userId = getAuthUserId(c);

  try {
    // Get tenant (must be owner or admin)
    const membershipSql = `
      SELECT tenant_id, role
      FROM tenant_members
      WHERE user_id = $1
        AND is_active = true
        AND role = ANY($2)
      LIMIT 1
    `;
    const membership = await queryOne<MembershipRow>(membershipSql, [
      userId,
      ["owner", "admin"],
    ]);

    if (!membership) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const updateSql = `
      UPDATE tenant_capabilities
      SET config = $1, is_enabled = $2
      WHERE tenant_id = $3 AND capability = $4
      RETURNING *
    `;
    const data = await queryOne<CapabilityRow>(updateSql, [
      JSON.stringify(body.config || {}),
      body.is_enabled !== undefined ? body.is_enabled : true,
      membership.tenant_id,
      capability,
    ]);

    if (!data) {
      return c.json({ error: "Capability not found" }, 404);
    }

    return c.json(data);
  } catch (error) {
    console.error("[CAPABILITIES] Error updating capability:", error);
    return c.json({ error: "Failed to update capability" }, 500);
  }
});
