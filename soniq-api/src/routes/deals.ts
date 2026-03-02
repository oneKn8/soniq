// Deals API Routes
// Sales pipeline and deal management

import { Hono } from "hono";
import { z } from "zod";
import {
  searchDeals,
  getPipeline,
  getDeal,
  createDeal,
  updateDeal,
  updateStage,
  archiveDeal,
} from "../services/deals/deal-service.js";
import { DealFilters, PaginationParams } from "../types/crm.js";
import { getAuthTenantId } from "../middleware/index.js";
import { getTenantById } from "../services/database/tenant-cache.js";
import { getStagesForIndustry } from "../config/industry-pipeline.js";

export const dealsRoutes = new Hono();

// Validation schemas
const createDealSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullish(),
  company: z.string().nullish(),
  stage: z.string().min(1).optional(),
  amount_cents: z.number().int().min(0).optional(),
  expected_close: z.string().nullish(),
  contact_id: z.string().uuid().nullish(),
  call_id: z.string().uuid().nullish(),
  source: z.enum(["call", "web", "manual", "import"]).optional(),
  created_by: z.string().nullish(),
});

const updateDealSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullish(),
  company: z.string().nullish(),
  stage: z.string().min(1).optional(),
  amount_cents: z.number().int().min(0).optional(),
  expected_close: z.string().nullish(),
  contact_id: z.string().uuid().nullish(),
});

const updateStageSchema = z.object({
  stage: z.string().min(1),
  sort_index: z.number().int().min(0).optional(),
});

// Helper to get tenant ID from auth context
function getTenantId(c: Parameters<typeof getAuthTenantId>[0]): string {
  return getAuthTenantId(c);
}

// Helper to resolve tenant industry (defaults to "default" if tenant not cached)
function getTenantIndustry(tenantId: string): string {
  const tenant = getTenantById(tenantId);
  return tenant?.industry || "default";
}

// ============================================================================
// LIST & SEARCH
// ============================================================================

/**
 * GET /api/deals
 * List deals with search, filters, pagination
 */
dealsRoutes.get("/", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const query = c.req.query();

    const filters: DealFilters = {};
    const pagination: PaginationParams = {};

    // Parse filters
    if (query.search) filters.search = query.search;
    if (query.stage) {
      filters.stage = query.stage.includes(",")
        ? (query.stage.split(",") as any)
        : (query.stage as any);
    }
    if (query.contact_id) filters.contact_id = query.contact_id;
    if (query.source) {
      filters.source = query.source.includes(",")
        ? (query.source.split(",") as any)
        : (query.source as any);
    }
    if (query.start_date) filters.start_date = query.start_date;
    if (query.end_date) filters.end_date = query.end_date;

    // Parse pagination
    if (query.limit) pagination.limit = parseInt(query.limit);
    if (query.offset) pagination.offset = parseInt(query.offset);
    if (query.sort_by) pagination.sort_by = query.sort_by;
    if (query.sort_order)
      pagination.sort_order = query.sort_order as "asc" | "desc";

    const result = await searchDeals(tenantId, filters, pagination);

    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("X-Tenant-ID")) {
      return c.json({ error: message }, 400);
    }
    console.error("[DEALS] List error:", message);
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// PIPELINE VIEW
// ============================================================================

/**
 * GET /api/deals/pipeline
 * Get pipeline view grouped by stage (for Kanban board)
 */
dealsRoutes.get("/pipeline", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const industry = getTenantIndustry(tenantId);

    const pipeline = await getPipeline(tenantId, industry);

    return c.json({ stages: pipeline });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[DEALS] Pipeline error:", message);
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// CRUD
// ============================================================================

/**
 * GET /api/deals/:id
 * Get a single deal
 */
dealsRoutes.get("/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");

    const deal = await getDeal(tenantId, id);

    if (!deal) {
      return c.json({ error: "Deal not found" }, 404);
    }

    return c.json(deal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[DEALS] Get error:", message);
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /api/deals
 * Create a new deal
 */
dealsRoutes.post("/", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const industry = getTenantIndustry(tenantId);
    const body = await c.req.json();

    const parsed = createDealSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parsed.error.issues,
        },
        400,
      );
    }

    const deal = await createDeal(
      tenantId,
      {
        name: parsed.data.name,
        description: parsed.data.description ?? undefined,
        company: parsed.data.company ?? undefined,
        stage: parsed.data.stage,
        amount_cents: parsed.data.amount_cents,
        expected_close: parsed.data.expected_close ?? undefined,
        contact_id: parsed.data.contact_id ?? undefined,
        call_id: parsed.data.call_id ?? undefined,
        source: parsed.data.source,
        created_by: parsed.data.created_by ?? undefined,
      },
      industry,
    );

    return c.json(deal, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[DEALS] Create error:", message);
    return c.json({ error: message }, 500);
  }
});

/**
 * PUT /api/deals/:id
 * Update a deal
 */
dealsRoutes.put("/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const body = await c.req.json();

    const parsed = updateDealSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parsed.error.issues,
        },
        400,
      );
    }

    const deal = await updateDeal(tenantId, id, {
      name: parsed.data.name,
      description: parsed.data.description ?? undefined,
      company: parsed.data.company ?? undefined,
      stage: parsed.data.stage,
      amount_cents: parsed.data.amount_cents,
      expected_close: parsed.data.expected_close ?? undefined,
      contact_id: parsed.data.contact_id ?? undefined,
    });

    return c.json(deal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return c.json({ error: message }, 404);
    }
    console.error("[DEALS] Update error:", message);
    return c.json({ error: message }, 500);
  }
});

/**
 * PATCH /api/deals/:id/stage
 * Update deal stage only (for Kanban drag-and-drop)
 */
dealsRoutes.patch("/:id/stage", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const industry = getTenantIndustry(tenantId);
    const id = c.req.param("id");
    const body = await c.req.json();

    const parsed = updateStageSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parsed.error.issues,
        },
        400,
      );
    }

    // Validate stage exists in the tenant's industry pipeline
    const validStages = new Set(
      getStagesForIndustry(industry).map((s) => s.id),
    );
    if (!validStages.has(parsed.data.stage)) {
      return c.json(
        {
          error: `Invalid stage "${parsed.data.stage}" for industry "${industry}". Valid stages: ${[...validStages].join(", ")}`,
        },
        400,
      );
    }

    const deal = await updateStage(
      tenantId,
      id,
      parsed.data.stage,
      parsed.data.sort_index,
    );

    return c.json(deal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return c.json({ error: message }, 404);
    }
    console.error("[DEALS] Stage update error:", message);
    return c.json({ error: message }, 500);
  }
});

/**
 * DELETE /api/deals/:id
 * Soft-delete (archive) a deal
 */
dealsRoutes.delete("/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");

    await archiveDeal(tenantId, id);

    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return c.json({ error: message }, 404);
    }
    console.error("[DEALS] Archive error:", message);
    return c.json({ error: message }, 500);
  }
});
