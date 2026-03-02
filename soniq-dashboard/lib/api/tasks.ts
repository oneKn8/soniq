/**
 * Tasks API client
 * Task management for CRM follow-ups, callbacks, meetings, etc.
 */

import { get, post, put, patch, del } from "./client";

// ============================================================================
// TYPES
// ============================================================================

// Industry-specific task types -- see industryPresets.ts for per-industry definitions
export type TaskType = string;

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  due_date: string;
  due_time?: string;
  done_at?: string;
  contact_id?: string;
  deal_id?: string;
  call_id?: string;
  assigned_to?: string;
  created_by?: string;
  source: string;
  created_at: string;
  updated_at: string;
  contact_name?: string;
}

export interface TaskCounts {
  pending: number;
  overdue: number;
  due_today: number;
  completed_this_week: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  due_date: string;
  due_time?: string;
  contact_id?: string;
  deal_id?: string;
  assigned_to?: string;
  source?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  type?: TaskType;
  priority?: TaskPriority;
  due_date?: string;
  due_time?: string;
  contact_id?: string;
  deal_id?: string;
  assigned_to?: string;
}

// ============================================================================
// LIST & SEARCH
// ============================================================================

/**
 * Search tasks with filters
 */
export async function searchTasks(
  params?: Record<string, string>,
): Promise<{ data: Task[]; total: number; has_more: boolean }> {
  return get<{ data: Task[]; total: number; has_more: boolean }>(
    "/api/tasks",
    params,
  );
}

/**
 * Get task counts (pending, overdue, due today, completed this week)
 */
export async function getTaskCounts(): Promise<TaskCounts> {
  return get<TaskCounts>("/api/tasks/counts");
}

/**
 * Get upcoming tasks
 */
export async function getUpcomingTasks(
  limit?: number,
): Promise<{ data: Task[] }> {
  const params: Record<string, string> = {};
  if (limit) params.limit = String(limit);
  return get<{ data: Task[] }>("/api/tasks/upcoming", params);
}

/**
 * Get overdue tasks
 */
export async function getOverdueTasks(): Promise<{ data: Task[] }> {
  return get<{ data: Task[] }>("/api/tasks/overdue");
}

// ============================================================================
// CRUD
// ============================================================================

/**
 * Get a single task by ID
 */
export async function getTask(id: string): Promise<Task> {
  return get<Task>(`/api/tasks/${id}`);
}

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  return post<Task>("/api/tasks", input);
}

/**
 * Update a task
 */
export async function updateTask(
  id: string,
  input: UpdateTaskInput,
): Promise<Task> {
  return put<Task>(`/api/tasks/${id}`, input);
}

/**
 * Mark a task as completed
 */
export async function completeTask(id: string): Promise<Task> {
  return patch<Task>(`/api/tasks/${id}/complete`, {});
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<void> {
  return del(`/api/tasks/${id}`);
}
