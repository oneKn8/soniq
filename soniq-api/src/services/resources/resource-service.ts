// Resource Service - Staff, Rooms, Equipment management
import { queryOne, queryAll } from "../database/client.js";
import { insertOne, updateOne, deleteRows } from "../database/query-helpers.js";
import {
  Resource,
  CreateResourceInput,
  PaginationParams,
  PaginatedResult,
} from "../../types/crm.js";

// ============================================================================
// CRUD
// ============================================================================

/**
 * Create a new resource for a tenant
 */
export async function createResource(
  tenantId: string,
  input: CreateResourceInput,
): Promise<Resource> {
  return insertOne<Resource>("resources", {
    tenant_id: tenantId,
    name: input.name,
    type: input.type,
    description: input.description,
    capacity: input.capacity ?? 1,
    default_duration_minutes: input.default_duration_minutes ?? 60,
    accepts_bookings: input.accepts_bookings ?? true,
    buffer_before_minutes: input.buffer_before_minutes ?? 0,
    buffer_after_minutes: input.buffer_after_minutes ?? 0,
    color: input.color,
    metadata: input.metadata ?? {},
    is_active: true,
    sort_order: 0,
  });
}

/**
 * Get a single resource by ID
 */
export async function getResource(
  tenantId: string,
  id: string,
): Promise<Resource | null> {
  return queryOne<Resource>(
    `SELECT * FROM resources WHERE tenant_id = $1 AND id = $2`,
    [tenantId, id],
  );
}

/**
 * Update a resource
 */
export async function updateResource(
  tenantId: string,
  id: string,
  updates: Partial<
    CreateResourceInput & { is_active?: boolean; sort_order?: number }
  >,
): Promise<Resource> {
  // Don't allow updating id or tenant_id
  const cleanUpdates: Record<string, unknown> = { ...updates };
  delete cleanUpdates.id;
  delete cleanUpdates.tenant_id;

  const result = await updateOne<Resource>("resources", cleanUpdates, {
    tenant_id: tenantId,
    id,
  });

  if (!result) {
    throw new Error("Resource not found");
  }

  return result;
}

/**
 * Soft delete a resource (set is_active to false)
 */
export async function deleteResource(
  tenantId: string,
  id: string,
): Promise<void> {
  await updateOne(
    "resources",
    { is_active: false },
    { tenant_id: tenantId, id },
  );
}

/**
 * Permanently delete a resource
 */
export async function hardDeleteResource(
  tenantId: string,
  id: string,
): Promise<void> {
  await deleteRows("resources", { tenant_id: tenantId, id });
}

// ============================================================================
// LIST & SEARCH
// ============================================================================

export interface ResourceFilters {
  type?: string | string[];
  is_active?: boolean;
  accepts_bookings?: boolean;
  search?: string;
}

/**
 * List resources with filtering and pagination
 */
export async function listResources(
  tenantId: string,
  filters: ResourceFilters = {},
  pagination: PaginationParams = {},
): Promise<PaginatedResult<Resource>> {
  const limit = pagination.limit || 50;
  const offset = pagination.offset || 0;
  const sortBy = pagination.sort_by || "sort_order";
  const sortOrder = pagination.sort_order || "asc";

  // Build WHERE clause dynamically
  const conditions: string[] = ["tenant_id = $1"];
  const params: unknown[] = [tenantId];
  let paramIndex = 2;

  if (filters.type !== undefined) {
    const types = Array.isArray(filters.type) ? filters.type : [filters.type];
    conditions.push(`type = ANY($${paramIndex})`);
    params.push(types);
    paramIndex++;
  }

  if (filters.is_active !== undefined) {
    conditions.push(`is_active = $${paramIndex}`);
    params.push(filters.is_active);
    paramIndex++;
  }

  if (filters.accepts_bookings !== undefined) {
    conditions.push(`accepts_bookings = $${paramIndex}`);
    params.push(filters.accepts_bookings);
    paramIndex++;
  }

  if (filters.search) {
    conditions.push(
      `(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`,
    );
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const orderDirection = sortOrder === "desc" ? "DESC" : "ASC";

  // Count query
  const countSql = `SELECT COUNT(*) as total FROM resources ${whereClause}`;
  const countResult = await queryOne<{ total: string }>(countSql, params);
  const total = parseInt(countResult?.total || "0", 10);

  // Data query
  const dataSql = `
    SELECT * FROM resources
    ${whereClause}
    ORDER BY ${sortBy} ${orderDirection}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  const data = await queryAll<Resource>(dataSql, [...params, limit, offset]);

  return {
    data,
    total,
    limit,
    offset,
    has_more: total > offset + limit,
  };
}

/**
 * Get all active resources for a tenant
 */
export async function getActiveResources(
  tenantId: string,
): Promise<Resource[]> {
  const result = await listResources(
    tenantId,
    { is_active: true },
    { limit: 1000 },
  );
  return result.data;
}

/**
 * Get all resources that accept bookings
 */
export async function getBookableResources(
  tenantId: string,
): Promise<Resource[]> {
  const result = await listResources(
    tenantId,
    { is_active: true, accepts_bookings: true },
    { limit: 1000 },
  );
  return result.data;
}

/**
 * Get resources of a specific type
 */
export async function getResourcesByType(
  tenantId: string,
  type: string,
): Promise<Resource[]> {
  const result = await listResources(
    tenantId,
    { type, is_active: true },
    { limit: 1000 },
  );
  return result.data;
}

// ============================================================================
// AVAILABILITY INTEGRATION
// ============================================================================

interface AvailabilitySlotRow {
  slot_date: string;
  total_capacity: number;
  booked_count: number;
  status: string;
}

/**
 * Get resource availability for a date range
 */
export async function getResourceAvailability(
  tenantId: string,
  resourceId: string,
  startDate: string,
  endDate: string,
): Promise<{ date: string; available_slots: number; total_slots: number }[]> {
  const sql = `
    SELECT slot_date, total_capacity, booked_count, status
    FROM availability_slots
    WHERE tenant_id = $1
      AND resource_id = $2
      AND slot_date >= $3
      AND slot_date <= $4
      AND status = 'available'
  `;

  const data = await queryAll<AvailabilitySlotRow>(sql, [
    tenantId,
    resourceId,
    startDate,
    endDate,
  ]);

  // Group by date
  const byDate: Record<string, { available: number; total: number }> = {};
  for (const slot of data) {
    if (!byDate[slot.slot_date]) {
      byDate[slot.slot_date] = { available: 0, total: 0 };
    }
    byDate[slot.slot_date].total += slot.total_capacity;
    byDate[slot.slot_date].available += Math.max(
      0,
      slot.total_capacity - slot.booked_count,
    );
  }

  return Object.entries(byDate)
    .map(([date, { available, total }]) => ({
      date,
      available_slots: available,
      total_slots: total,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================================
// SORTING
// ============================================================================

/**
 * Reorder resources by updating their sort_order
 */
export async function reorderResources(
  tenantId: string,
  resourceIds: string[],
): Promise<void> {
  // Update sort_order for each resource
  for (let i = 0; i < resourceIds.length; i++) {
    await updateOne(
      "resources",
      { sort_order: i },
      { tenant_id: tenantId, id: resourceIds[i] },
    );
  }
}
