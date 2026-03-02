// Resources API Routes - Staff, Rooms, Equipment management
import { Hono } from "hono";
import { z } from "zod";
import {
  createResource,
  getResource,
  updateResource,
  deleteResource,
  listResources,
  getActiveResources,
  getBookableResources,
  getResourcesByType,
  getResourceAvailability,
  reorderResources,
  ResourceFilters,
} from "../services/resources/resource-service.js";
import { PaginationParams } from "../types/crm.js";

import { getAuthTenantId } from "../middleware/index.js";

export const resourcesRoutes = new Hono();

// Helper to get tenant ID from auth context
function getTenantId(c: Parameters<typeof getAuthTenantId>[0]): string {
  return getAuthTenantId(c);
}

// Helper to transform null to undefined
const nullToUndefined = <T>(val: T | null | undefined): T | undefined =>
  val === null ? undefined : val;

// Validation schemas
const createResourceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["staff", "room", "equipment", "service", "other"]),
  description: z.string().optional(),
  capacity: z.number().positive().optional(),
  default_duration_minutes: z.number().positive().optional(),
  accepts_bookings: z.boolean().optional(),
  buffer_before_minutes: z.number().nonnegative().optional(),
  buffer_after_minutes: z.number().nonnegative().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color")
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateResourceSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["staff", "room", "equipment", "service", "other"]).optional(),
  description: z.string().nullish().transform(nullToUndefined),
  capacity: z.number().positive().optional(),
  default_duration_minutes: z.number().positive().optional(),
  accepts_bookings: z.boolean().optional(),
  buffer_before_minutes: z.number().nonnegative().optional(),
  buffer_after_minutes: z.number().nonnegative().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullish()
    .transform(nullToUndefined),
  is_active: z.boolean().optional(),
  sort_order: z.number().nonnegative().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// LIST & SEARCH
// ============================================================================

/**
 * GET /api/resources
 * List resources with filters and pagination
 */
resourcesRoutes.get("/", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const query = c.req.query();

    const filters: ResourceFilters = {};
    const pagination: PaginationParams = {};

    // Parse filters
    if (query.type) {
      filters.type = query.type.includes(",")
        ? query.type.split(",")
        : query.type;
    }
    if (query.is_active !== undefined) {
      filters.is_active = query.is_active === "true";
    }
    if (query.accepts_bookings !== undefined) {
      filters.accepts_bookings = query.accepts_bookings === "true";
    }
    if (query.search) {
      filters.search = query.search;
    }

    // Parse pagination
    if (query.limit) pagination.limit = parseInt(query.limit);
    if (query.offset) pagination.offset = parseInt(query.offset);
    if (query.sort_by) pagination.sort_by = query.sort_by;
    if (query.sort_order)
      pagination.sort_order = query.sort_order as "asc" | "desc";

    const result = await listResources(tenantId, filters, pagination);

    return c.json({
      resources: result.data,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      has_more: result.has_more,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("X-Tenant-ID")) {
      return c.json({ error: message }, 400);
    }
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/resources/active
 * Get all active resources
 */
resourcesRoutes.get("/active", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const resources = await getActiveResources(tenantId);
    return c.json({ resources });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/resources/bookable
 * Get all bookable resources (active and accepts_bookings=true)
 */
resourcesRoutes.get("/bookable", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const resources = await getBookableResources(tenantId);
    return c.json({ resources });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/resources/type/:type
 * Get resources by type
 */
resourcesRoutes.get("/type/:type", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const type = c.req.param("type");

    const validTypes = ["staff", "room", "equipment", "service", "other"];
    if (!validTypes.includes(type)) {
      return c.json({ error: "Invalid resource type" }, 400);
    }

    const resources = await getResourcesByType(tenantId, type);
    return c.json({ resources });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// CRUD
// ============================================================================

/**
 * GET /api/resources/:id
 * Get a single resource by ID
 */
resourcesRoutes.get("/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");

    const resource = await getResource(tenantId, id);

    if (!resource) {
      return c.json({ error: "Resource not found" }, 404);
    }

    return c.json(resource);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /api/resources
 * Create a new resource
 */
resourcesRoutes.post("/", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json();

    const parsed = createResourceSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parsed.error.issues,
        },
        400,
      );
    }

    const resource = await createResource(tenantId, parsed.data);

    return c.json(resource, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * PUT /api/resources/:id
 * Update a resource
 */
resourcesRoutes.put("/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const body = await c.req.json();

    const parsed = updateResourceSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parsed.error.issues,
        },
        400,
      );
    }

    const resource = await updateResource(tenantId, id, parsed.data);

    return c.json(resource);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 500);
  }
});

/**
 * PATCH /api/resources/:id
 * Partial update a resource
 */
resourcesRoutes.patch("/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const body = await c.req.json();

    const parsed = updateResourceSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parsed.error.issues,
        },
        400,
      );
    }

    const resource = await updateResource(tenantId, id, parsed.data);

    return c.json(resource);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 500);
  }
});

/**
 * DELETE /api/resources/:id
 * Soft delete (deactivate) a resource
 */
resourcesRoutes.delete("/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");

    await deleteResource(tenantId, id);

    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// AVAILABILITY
// ============================================================================

/**
 * GET /api/resources/:id/availability
 * Get availability for a specific resource
 */
resourcesRoutes.get("/:id/availability", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const { start_date, end_date } = c.req.query();

    if (!start_date || !end_date) {
      return c.json({ error: "start_date and end_date required" }, 400);
    }

    const availability = await getResourceAvailability(
      tenantId,
      id,
      start_date,
      end_date,
    );

    return c.json({ availability });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// REORDERING
// ============================================================================

/**
 * POST /api/resources/reorder
 * Reorder resources (for drag-and-drop UI)
 */
resourcesRoutes.post("/reorder", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json();

    const schema = z.object({
      resource_ids: z.array(z.string().uuid()),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parsed.error.issues,
        },
        400,
      );
    }

    await reorderResources(tenantId, parsed.data.resource_ids);

    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});
