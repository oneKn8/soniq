// Tasks API Routes
// CRM task management - follow-ups, reminders, action items

import { Hono } from "hono";
import { z } from "zod";
import {
  searchTasks,
  getUpcomingTasks,
  getOverdueTasks,
  getTask,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  getTaskCounts,
} from "../services/tasks/task-service.js";
import { TaskFilters, PaginationParams } from "../types/crm.js";
import { getAuthTenantId } from "../middleware/index.js";

export const tasksRoutes = new Hono();

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullish(),
  type: z.string().min(1).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  due_date: z.string().min(1, "Due date is required"),
  due_time: z.string().nullish(),
  contact_id: z.string().uuid().nullish(),
  deal_id: z.string().uuid().nullish(),
  call_id: z.string().uuid().nullish(),
  assigned_to: z.string().nullish(),
  created_by: z.string().nullish(),
  source: z.enum(["manual", "auto", "voice_agent"]).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullish(),
  type: z.string().min(1).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  due_date: z.string().optional(),
  due_time: z.string().nullish(),
  contact_id: z.string().uuid().nullish(),
  deal_id: z.string().uuid().nullish(),
  assigned_to: z.string().nullish(),
});

// Helper to get tenant ID from auth context
function getTenantId(c: Parameters<typeof getAuthTenantId>[0]): string {
  return getAuthTenantId(c);
}

// ============================================================================
// LIST & SEARCH
// ============================================================================

/**
 * GET /api/tasks
 * List tasks with filters and pagination
 */
tasksRoutes.get("/", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const query = c.req.query();

    const filters: TaskFilters = {};
    const pagination: PaginationParams = {};

    // Parse filters
    if (query.status) {
      filters.status = query.status as "pending" | "done" | "overdue";
    }
    if (query.type) {
      filters.type = query.type.includes(",")
        ? (query.type.split(",") as any)
        : (query.type as any);
    }
    if (query.priority) {
      filters.priority = query.priority.includes(",")
        ? (query.priority.split(",") as any)
        : (query.priority as any);
    }
    if (query.contact_id) filters.contact_id = query.contact_id;
    if (query.deal_id) filters.deal_id = query.deal_id;
    if (query.start_date) filters.start_date = query.start_date;
    if (query.end_date) filters.end_date = query.end_date;

    // Parse pagination
    if (query.limit) pagination.limit = parseInt(query.limit);
    if (query.offset) pagination.offset = parseInt(query.offset);
    if (query.sort_by) pagination.sort_by = query.sort_by;
    if (query.sort_order)
      pagination.sort_order = query.sort_order as "asc" | "desc";

    const result = await searchTasks(tenantId, filters, pagination);

    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("X-Tenant-ID")) {
      return c.json({ error: message }, 400);
    }
    console.error("[TASKS] List error:", message);
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// AGGREGATION
// ============================================================================

/**
 * GET /api/tasks/counts
 * Get task counts for dashboard widgets
 */
tasksRoutes.get("/counts", async (c) => {
  try {
    const tenantId = getTenantId(c);

    const counts = await getTaskCounts(tenantId);

    return c.json(counts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[TASKS] Counts error:", message);
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/tasks/upcoming
 * Get tasks due in the next N days (default 7)
 */
tasksRoutes.get("/upcoming", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const query = c.req.query();

    const days = query.days ? parseInt(query.days) : 7;

    const tasks = await getUpcomingTasks(tenantId, days);

    return c.json({ data: tasks, count: tasks.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[TASKS] Upcoming error:", message);
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/tasks/overdue
 * Get past-due uncompleted tasks
 */
tasksRoutes.get("/overdue", async (c) => {
  try {
    const tenantId = getTenantId(c);

    const tasks = await getOverdueTasks(tenantId);

    return c.json({ data: tasks, count: tasks.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[TASKS] Overdue error:", message);
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// CRUD
// ============================================================================

/**
 * GET /api/tasks/:id
 * Get a single task
 */
tasksRoutes.get("/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");

    const task = await getTask(tenantId, id);

    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }

    return c.json(task);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[TASKS] Get error:", message);
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /api/tasks
 * Create a new task
 */
tasksRoutes.post("/", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json();

    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parsed.error.issues,
        },
        400,
      );
    }

    const task = await createTask(tenantId, {
      title: parsed.data.title,
      description: parsed.data.description ?? undefined,
      type: parsed.data.type,
      priority: parsed.data.priority,
      due_date: parsed.data.due_date,
      due_time: parsed.data.due_time ?? undefined,
      contact_id: parsed.data.contact_id ?? undefined,
      deal_id: parsed.data.deal_id ?? undefined,
      call_id: parsed.data.call_id ?? undefined,
      assigned_to: parsed.data.assigned_to ?? undefined,
      created_by: parsed.data.created_by ?? undefined,
      source: parsed.data.source,
    });

    return c.json(task, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[TASKS] Create error:", message);
    return c.json({ error: message }, 500);
  }
});

/**
 * PUT /api/tasks/:id
 * Update a task
 */
tasksRoutes.put("/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const body = await c.req.json();

    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parsed.error.issues,
        },
        400,
      );
    }

    const task = await updateTask(tenantId, id, {
      title: parsed.data.title,
      description: parsed.data.description ?? undefined,
      type: parsed.data.type,
      priority: parsed.data.priority,
      due_date: parsed.data.due_date,
      due_time: parsed.data.due_time ?? undefined,
      contact_id: parsed.data.contact_id ?? undefined,
      deal_id: parsed.data.deal_id ?? undefined,
      assigned_to: parsed.data.assigned_to ?? undefined,
    });

    return c.json(task);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return c.json({ error: message }, 404);
    }
    console.error("[TASKS] Update error:", message);
    return c.json({ error: message }, 500);
  }
});

/**
 * PATCH /api/tasks/:id/complete
 * Mark a task as done
 */
tasksRoutes.patch("/:id/complete", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");

    const task = await completeTask(tenantId, id);

    return c.json(task);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return c.json({ error: message }, 404);
    }
    console.error("[TASKS] Complete error:", message);
    return c.json({ error: message }, 500);
  }
});

/**
 * DELETE /api/tasks/:id
 * Hard-delete a task
 */
tasksRoutes.delete("/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");

    await deleteTask(tenantId, id);

    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return c.json({ error: message }, 404);
    }
    console.error("[TASKS] Delete error:", message);
    return c.json({ error: message }, 500);
  }
});
