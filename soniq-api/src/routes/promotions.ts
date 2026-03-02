import { Hono } from "hono";
import { queryOne, queryAll } from "../services/database/client.js";
import {
  insertOne,
  updateOne,
  deleteRows,
} from "../services/database/query-helpers.js";
import { getAuthUserId } from "../middleware/index.js";

export const promotionsRoutes = new Hono();

/** Type definitions for database rows */
interface MembershipRow {
  tenant_id: string;
  role: string;
}

interface PromotionRow {
  id: string;
  tenant_id: string;
  offer_text: string;
  mention_behavior: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/promotions
 * Get promotions for tenant
 */
promotionsRoutes.get("/", async (c) => {
  const activeOnly = c.req.query("active") === "true";
  const userId = getAuthUserId(c);

  try {
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
      return c.json({ promotions: [] });
    }

    let promotionsSql: string;
    let params: unknown[];

    if (activeOnly) {
      promotionsSql = `
        SELECT *
        FROM tenant_promotions
        WHERE tenant_id = $1 AND is_active = true
        ORDER BY created_at DESC
      `;
      params = [membership.tenant_id];
    } else {
      promotionsSql = `
        SELECT *
        FROM tenant_promotions
        WHERE tenant_id = $1
        ORDER BY created_at DESC
      `;
      params = [membership.tenant_id];
    }

    const promotions = await queryAll<PromotionRow>(promotionsSql, params);

    return c.json({ promotions: promotions || [] });
  } catch (error) {
    console.error("[PROMOTIONS] Error fetching promotions:", error);
    return c.json({ error: "Failed to fetch promotions" }, 500);
  }
});

/**
 * POST /api/promotions
 * Create a promotion
 */
promotionsRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const userId = getAuthUserId(c);

  if (!body.offer_text) {
    return c.json({ error: "offer_text is required" }, 400);
  }

  try {
    // Get tenant
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

    const promotion = await insertOne<PromotionRow>("tenant_promotions", {
      tenant_id: membership.tenant_id,
      offer_text: body.offer_text,
      mention_behavior: body.mention_behavior || "relevant",
      is_active: body.is_active !== undefined ? body.is_active : true,
      starts_at: body.starts_at || null,
      ends_at: body.ends_at || null,
    });

    return c.json(promotion, 201);
  } catch (error) {
    console.error("[PROMOTIONS] Error creating promotion:", error);
    return c.json({ error: "Failed to create promotion" }, 500);
  }
});

/**
 * GET /api/promotions/:id
 * Get a specific promotion
 */
promotionsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const userId = getAuthUserId(c);

  try {
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
      return c.json({ error: "Forbidden" }, 403);
    }

    const promotionSql = `
      SELECT *
      FROM tenant_promotions
      WHERE id = $1 AND tenant_id = $2
    `;
    const promotion = await queryOne<PromotionRow>(promotionSql, [
      id,
      membership.tenant_id,
    ]);

    if (!promotion) {
      return c.json({ error: "Promotion not found" }, 404);
    }

    return c.json(promotion);
  } catch (error) {
    console.error("[PROMOTIONS] Error fetching promotion:", error);
    return c.json({ error: "Failed to fetch promotion" }, 500);
  }
});

/**
 * PUT /api/promotions/:id
 * Update a promotion
 */
promotionsRoutes.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const userId = getAuthUserId(c);

  try {
    // Get tenant
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

    // Verify promotion belongs to tenant
    const existingSql = `
      SELECT tenant_id
      FROM tenant_promotions
      WHERE id = $1
    `;
    const existing = await queryOne<{ tenant_id: string }>(existingSql, [id]);

    if (!existing || existing.tenant_id !== membership.tenant_id) {
      return c.json({ error: "Promotion not found" }, 404);
    }

    const updateData: Record<string, unknown> = {};
    if (body.offer_text !== undefined) updateData.offer_text = body.offer_text;
    if (body.mention_behavior !== undefined)
      updateData.mention_behavior = body.mention_behavior;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.starts_at !== undefined) updateData.starts_at = body.starts_at;
    if (body.ends_at !== undefined) updateData.ends_at = body.ends_at;

    const promotion = await updateOne<PromotionRow>(
      "tenant_promotions",
      updateData,
      { id },
    );

    return c.json(promotion);
  } catch (error) {
    console.error("[PROMOTIONS] Error updating promotion:", error);
    return c.json({ error: "Failed to update promotion" }, 500);
  }
});

/**
 * DELETE /api/promotions/:id
 * Delete a promotion
 */
promotionsRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const userId = getAuthUserId(c);

  try {
    // Get tenant
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

    // Verify promotion belongs to tenant
    const existingSql = `
      SELECT tenant_id
      FROM tenant_promotions
      WHERE id = $1
    `;
    const existing = await queryOne<{ tenant_id: string }>(existingSql, [id]);

    if (!existing || existing.tenant_id !== membership.tenant_id) {
      return c.json({ error: "Promotion not found" }, 404);
    }

    await deleteRows("tenant_promotions", { id });

    return c.json({ success: true });
  } catch (error) {
    console.error("[PROMOTIONS] Error deleting promotion:", error);
    return c.json({ error: "Failed to delete promotion" }, 500);
  }
});

/**
 * POST /api/promotions/:id/toggle
 * Toggle promotion active state
 */
promotionsRoutes.post("/:id/toggle", async (c) => {
  const id = c.req.param("id");
  const userId = getAuthUserId(c);

  try {
    // Get tenant
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

    // Get current state
    const existingSql = `
      SELECT tenant_id, is_active
      FROM tenant_promotions
      WHERE id = $1
    `;
    const existing = await queryOne<{ tenant_id: string; is_active: boolean }>(
      existingSql,
      [id],
    );

    if (!existing || existing.tenant_id !== membership.tenant_id) {
      return c.json({ error: "Promotion not found" }, 404);
    }

    const promotion = await updateOne<PromotionRow>(
      "tenant_promotions",
      { is_active: !existing.is_active },
      { id },
    );

    return c.json(promotion);
  } catch (error) {
    console.error("[PROMOTIONS] Error toggling promotion:", error);
    return c.json({ error: "Failed to toggle promotion" }, 500);
  }
});
