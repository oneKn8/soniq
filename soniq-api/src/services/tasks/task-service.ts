// Task Service - CRM task management operations
// Handles CRUD, search, upcoming/overdue queries, and aggregation

import { queryOne, queryAll } from "../database/client.js";
import { insertOne, updateOne, deleteRows } from "../database/query-helpers.js";
import {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  TaskCounts,
  PaginationParams,
  PaginatedResult,
} from "../../types/crm.js";

// Allowed columns for ORDER BY (prevents SQL injection via sort_by param)
const ALLOWED_SORT_COLUMNS = new Set([
  "created_at",
  "updated_at",
  "title",
  "type",
  "priority",
  "due_date",
  "due_time",
  "done_at",
  "source",
]);

// ============================================================================
// SEARCH & LIST
// ============================================================================

/**
 * Search tasks with filters and pagination.
 * Supports status filtering (pending, done, overdue), type, priority,
 * contact/deal associations, and date ranges.
 */
export async function searchTasks(
  tenantId: string,
  filters: TaskFilters = {},
  pagination: PaginationParams = {},
): Promise<PaginatedResult<Task>> {
  const limit = Math.min(pagination.limit || 20, 100);
  const offset = pagination.offset || 0;
  const rawSort = pagination.sort_by || "due_date";
  const sortBy = ALLOWED_SORT_COLUMNS.has(rawSort) ? rawSort : "due_date";
  const sortOrder = pagination.sort_order || "asc";

  const conditions: string[] = ["t.tenant_id = $1"];
  const params: unknown[] = [tenantId];
  let paramIndex = 2;

  // Status filter
  if (filters.status === "pending") {
    conditions.push("t.done_at IS NULL");
  } else if (filters.status === "done") {
    conditions.push("t.done_at IS NOT NULL");
  } else if (filters.status === "overdue") {
    conditions.push("t.done_at IS NULL");
    conditions.push("t.due_date < CURRENT_DATE");
  }

  // Type filter
  if (filters.type) {
    const types = Array.isArray(filters.type) ? filters.type : [filters.type];
    conditions.push(`t.type = ANY($${paramIndex})`);
    params.push(types);
    paramIndex++;
  }

  // Priority filter
  if (filters.priority) {
    const priorities = Array.isArray(filters.priority)
      ? filters.priority
      : [filters.priority];
    conditions.push(`t.priority = ANY($${paramIndex})`);
    params.push(priorities);
    paramIndex++;
  }

  // Contact filter
  if (filters.contact_id) {
    conditions.push(`t.contact_id = $${paramIndex}`);
    params.push(filters.contact_id);
    paramIndex++;
  }

  // Deal filter
  if (filters.deal_id) {
    conditions.push(`t.deal_id = $${paramIndex}`);
    params.push(filters.deal_id);
    paramIndex++;
  }

  // Date range filter on due_date
  if (filters.start_date) {
    conditions.push(`t.due_date >= $${paramIndex}`);
    params.push(filters.start_date);
    paramIndex++;
  }

  if (filters.end_date) {
    conditions.push(`t.due_date <= $${paramIndex}`);
    params.push(filters.end_date);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  // Count query
  const countResult = await queryOne<{ total: string }>(
    `SELECT COUNT(*) as total FROM tasks t ${whereClause}`,
    params,
  );
  const total = parseInt(countResult?.total || "0", 10);

  // Data query with joined contact name
  const direction = sortOrder === "desc" ? "DESC" : "ASC";
  const data = await queryAll<Task>(
    `SELECT t.*, c.name as contact_name
     FROM tasks t
     LEFT JOIN contacts c ON c.id = t.contact_id
     ${whereClause}
     ORDER BY t.${sortBy} ${direction}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset],
  );

  return {
    data: data || [],
    total,
    limit,
    offset,
    has_more: total > offset + limit,
  };
}

// ============================================================================
// UPCOMING & OVERDUE
// ============================================================================

/**
 * Get tasks due within the next N days that are not yet completed.
 */
export async function getUpcomingTasks(
  tenantId: string,
  days: number = 7,
): Promise<Task[]> {
  return queryAll<Task>(
    `SELECT t.*, c.name as contact_name
     FROM tasks t
     LEFT JOIN contacts c ON c.id = t.contact_id
     WHERE t.tenant_id = $1
       AND t.done_at IS NULL
       AND t.due_date >= CURRENT_DATE
       AND t.due_date <= CURRENT_DATE + $2 * INTERVAL '1 day'
     ORDER BY t.due_date ASC, t.due_time ASC NULLS LAST`,
    [tenantId, days],
  );
}

/**
 * Get past-due tasks that have not been completed.
 */
export async function getOverdueTasks(tenantId: string): Promise<Task[]> {
  return queryAll<Task>(
    `SELECT t.*, c.name as contact_name
     FROM tasks t
     LEFT JOIN contacts c ON c.id = t.contact_id
     WHERE t.tenant_id = $1
       AND t.done_at IS NULL
       AND t.due_date < CURRENT_DATE
     ORDER BY t.due_date ASC`,
    [tenantId],
  );
}

// ============================================================================
// CRUD
// ============================================================================

/**
 * Get a single task by ID with joined contact name.
 */
export async function getTask(
  tenantId: string,
  id: string,
): Promise<Task | null> {
  return queryOne<Task>(
    `SELECT t.*, c.name as contact_name
     FROM tasks t
     LEFT JOIN contacts c ON c.id = t.contact_id
     WHERE t.tenant_id = $1 AND t.id = $2`,
    [tenantId, id],
  );
}

/**
 * Create a new task.
 */
export async function createTask(
  tenantId: string,
  input: CreateTaskInput,
): Promise<Task> {
  const data: Record<string, unknown> = {
    tenant_id: tenantId,
    title: input.title,
    due_date: input.due_date,
    type: input.type || "follow_up",
    priority: input.priority || "medium",
    source: input.source || "manual",
  };

  if (input.description !== undefined) data.description = input.description;
  if (input.due_time !== undefined) data.due_time = input.due_time;
  if (input.contact_id !== undefined) data.contact_id = input.contact_id;
  if (input.deal_id !== undefined) data.deal_id = input.deal_id;
  if (input.call_id !== undefined) data.call_id = input.call_id;
  if (input.assigned_to !== undefined) data.assigned_to = input.assigned_to;
  if (input.created_by !== undefined) data.created_by = input.created_by;

  return insertOne<Task>("tasks", data);
}

/**
 * Update an existing task.
 */
export async function updateTask(
  tenantId: string,
  id: string,
  input: UpdateTaskInput,
): Promise<Task> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.due_date !== undefined) updateData.due_date = input.due_date;
  if (input.due_time !== undefined) updateData.due_time = input.due_time;
  if (input.contact_id !== undefined) updateData.contact_id = input.contact_id;
  if (input.deal_id !== undefined) updateData.deal_id = input.deal_id;
  if (input.assigned_to !== undefined)
    updateData.assigned_to = input.assigned_to;

  const result = await updateOne<Task>("tasks", updateData, {
    tenant_id: tenantId,
    id,
  });

  if (!result) {
    throw new Error("Task not found");
  }

  return result;
}

/**
 * Mark a task as completed by setting done_at to now.
 */
export async function completeTask(
  tenantId: string,
  id: string,
): Promise<Task> {
  const result = await updateOne<Task>(
    "tasks",
    { done_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { tenant_id: tenantId, id },
  );

  if (!result) {
    throw new Error("Task not found");
  }

  return result;
}

/**
 * Hard-delete a task.
 */
export async function deleteTask(tenantId: string, id: string): Promise<void> {
  const deleted = await deleteRows("tasks", { tenant_id: tenantId, id });

  if (deleted === 0) {
    throw new Error("Task not found");
  }
}

// ============================================================================
// RELATED QUERIES
// ============================================================================

/**
 * Get all tasks for a specific contact.
 */
export async function getTasksForContact(
  tenantId: string,
  contactId: string,
): Promise<Task[]> {
  return queryAll<Task>(
    `SELECT t.*, c.name as contact_name
     FROM tasks t
     LEFT JOIN contacts c ON c.id = t.contact_id
     WHERE t.tenant_id = $1 AND t.contact_id = $2
     ORDER BY t.due_date ASC`,
    [tenantId, contactId],
  );
}

/**
 * Get all tasks for a specific deal.
 */
export async function getTasksForDeal(
  tenantId: string,
  dealId: string,
): Promise<Task[]> {
  return queryAll<Task>(
    `SELECT t.*, c.name as contact_name
     FROM tasks t
     LEFT JOIN contacts c ON c.id = t.contact_id
     WHERE t.tenant_id = $1 AND t.deal_id = $2
     ORDER BY t.due_date ASC`,
    [tenantId, dealId],
  );
}

// ============================================================================
// AGGREGATION
// ============================================================================

/**
 * Get task counts for dashboard widgets.
 * Returns pending, overdue, due today, and completed this week.
 */
export async function getTaskCounts(tenantId: string): Promise<TaskCounts> {
  const result = await queryOne<{
    pending: string;
    overdue: string;
    due_today: string;
    completed_this_week: string;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE done_at IS NULL) as pending,
       COUNT(*) FILTER (WHERE done_at IS NULL AND due_date < CURRENT_DATE) as overdue,
       COUNT(*) FILTER (WHERE done_at IS NULL AND due_date = CURRENT_DATE) as due_today,
       COUNT(*) FILTER (WHERE done_at IS NOT NULL AND done_at >= date_trunc('week', CURRENT_DATE)) as completed_this_week
     FROM tasks
     WHERE tenant_id = $1`,
    [tenantId],
  );

  return {
    pending: parseInt(result?.pending || "0", 10),
    overdue: parseInt(result?.overdue || "0", 10),
    due_today: parseInt(result?.due_today || "0", 10),
    completed_this_week: parseInt(result?.completed_this_week || "0", 10),
  };
}
