"use client";

import * as React from "react";
import {
  Plus,
  CheckSquare,
  Circle,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/crm/shared/DataTable";
import { Pagination } from "@/components/crm/shared/Pagination";
import {
  EmptyState,
  EmptySearchResults,
} from "@/components/crm/shared/EmptyState";
import { TaskForm } from "./TaskForm";
import { searchTasks, getTaskCounts, completeTask } from "@/lib/api/tasks";
import type { Task, TaskPriority, TaskCounts } from "@/lib/api/tasks";
import { useIndustry } from "@/context/IndustryContext";
import { cn } from "@/lib/utils";

// ============================================================================
// CONSTANTS
// ============================================================================

type StatusFilter = "all" | "pending" | "overdue" | "done";

const STATUS_TABS: {
  value: StatusFilter;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "all", label: "All", icon: Circle },
  { value: "pending", label: "Pending", icon: Clock },
  { value: "overdue", label: "Overdue", icon: AlertCircle },
  { value: "done", label: "Done", icon: CheckCircle2 },
];

// TYPE_LABELS derived dynamically from industry context (see component)

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; className: string }
> = {
  urgent: {
    label: "Urgent",
    className: "bg-red-500/20 text-red-400",
  },
  high: {
    label: "High",
    className: "bg-orange-500/20 text-orange-400",
  },
  medium: {
    label: "Medium",
    className: "bg-amber-500/20 text-amber-400",
  },
  low: {
    label: "Low",
    className: "bg-blue-500/20 text-blue-400",
  },
};

// TYPE_FILTER_OPTIONS derived dynamically from industry context (see component)

const PRIORITY_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Priorities" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

// ============================================================================
// HELPERS
// ============================================================================

function formatDueDate(dateString: string): {
  text: string;
  isOverdue: boolean;
} {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return { text: "Today", isOverdue: false };
  if (diffDays === 1) return { text: "Tomorrow", isOverdue: false };
  if (diffDays === -1) return { text: "Yesterday", isOverdue: true };
  if (diffDays < -1)
    return { text: `${Math.abs(diffDays)} days overdue`, isOverdue: true };
  if (diffDays <= 7) return { text: `In ${diffDays} days`, isOverdue: false };

  return {
    text: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }),
    isOverdue: diffDays < 0,
  };
}

function formatSource(source: string): string {
  const map: Record<string, string> = {
    manual: "Manual",
    voice_call: "Voice Call",
    ai_agent: "AI Agent",
    import: "Import",
    api: "API",
  };
  return map[source] || source;
}

// ============================================================================
// TABLE COLUMNS
// ============================================================================

function createColumns(
  onComplete: (task: Task) => void,
  customerLabel: string,
  typeLabels: Record<string, string>,
): Column<Task>[] {
  return [
    {
      key: "done",
      header: "",
      width: "40px",
      render: (task) => {
        const isDone = !!task.done_at;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isDone) onComplete(task);
            }}
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded border transition-colors",
              isDone
                ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800",
            )}
            disabled={isDone}
            title={isDone ? "Completed" : "Mark as done"}
          >
            {isDone && <CheckCircle2 className="h-3 w-3" />}
          </button>
        );
      },
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (task) => {
        const isDone = !!task.done_at;
        return (
          <span
            className={cn(
              "text-sm",
              isDone
                ? "text-zinc-600 line-through"
                : "font-medium text-zinc-100",
            )}
          >
            {task.title}
          </span>
        );
      },
    },
    {
      key: "type",
      header: "Type",
      render: (task) => (
        <span className="inline-flex items-center rounded-full border border-zinc-700/50 bg-zinc-800/50 px-2 py-0.5 text-xs text-zinc-300">
          {typeLabels[task.type] || task.type}
        </span>
      ),
    },
    {
      key: "contact_name",
      header: customerLabel,
      render: (task) => (
        <span
          className={cn(
            "text-sm",
            task.done_at ? "text-zinc-600" : "text-zinc-400",
          )}
        >
          {task.contact_name || "-"}
        </span>
      ),
    },
    {
      key: "due_date",
      header: "Due Date",
      sortable: true,
      render: (task) => {
        if (task.done_at) {
          return <span className="text-xs text-zinc-600">Done</span>;
        }
        const { text, isOverdue } = formatDueDate(task.due_date);
        return (
          <span
            className={cn(
              "text-xs",
              isOverdue ? "font-medium text-red-400" : "text-zinc-400",
            )}
          >
            {text}
            {task.due_time && (
              <span className="ml-1 text-zinc-600">{task.due_time}</span>
            )}
          </span>
        );
      },
    },
    {
      key: "priority",
      header: "Priority",
      render: (task) => {
        const config = PRIORITY_CONFIG[task.priority];
        return (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
              task.done_at ? "bg-zinc-800/50 text-zinc-600" : config.className,
            )}
          >
            {config.label}
          </span>
        );
      },
    },
    {
      key: "source",
      header: "Source",
      render: (task) => (
        <span className="text-xs text-zinc-500">
          {formatSource(task.source)}
        </span>
      ),
    },
  ];
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function TasksPage() {
  const { customerLabel, taskTypes } = useIndustry();

  // Derive type labels and filter options from industry context
  const typeLabels = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of taskTypes) {
      map[t.value] = t.label;
    }
    return map;
  }, [taskTypes]);

  const typeFilterOptions = React.useMemo(() => {
    return [
      { value: "all", label: "All Types" },
      ...taskTypes.map((t) => ({ value: t.value, label: t.label })),
    ];
  }, [taskTypes]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [total, setTotal] = React.useState(0);
  const [counts, setCounts] = React.useState<TaskCounts | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [priorityFilter, setPriorityFilter] = React.useState("all");

  // Pagination
  const [pagination, setPagination] = React.useState({
    limit: 20,
    offset: 0,
    sort_by: "due_date",
    sort_order: "asc" as "asc" | "desc",
  });

  // Build search params from state
  const buildParams = React.useCallback((): Record<string, string> => {
    const params: Record<string, string> = {
      limit: String(pagination.limit),
      offset: String(pagination.offset),
      sort_by: pagination.sort_by,
      sort_order: pagination.sort_order,
    };

    if (statusFilter === "pending") params.status = "pending";
    if (statusFilter === "overdue") params.status = "overdue";
    if (statusFilter === "done") params.status = "done";
    if (typeFilter !== "all") params.type = typeFilter;
    if (priorityFilter !== "all") params.priority = priorityFilter;

    return params;
  }, [statusFilter, typeFilter, priorityFilter, pagination]);

  // Fetch tasks
  const loadTasks = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = buildParams();
      const result = await searchTasks(params);
      setTasks(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, [buildParams]);

  // Fetch counts
  const loadCounts = React.useCallback(async () => {
    try {
      const data = await getTaskCounts();
      setCounts(data);
    } catch {
      // Counts are non-critical, don't show error
    }
  }, []);

  React.useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  React.useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // Reset pagination on filter change
  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, offset: 0 }));
  }, [statusFilter, typeFilter, priorityFilter]);

  // Complete task handler
  const handleComplete = React.useCallback(
    async (task: Task) => {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, done_at: new Date().toISOString() } : t,
        ),
      );

      try {
        await completeTask(task.id);
        loadCounts();
      } catch {
        // Revert on failure
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, done_at: undefined } : t,
          ),
        );
      }
    },
    [loadCounts],
  );

  // Columns (memoized)
  const columns = React.useMemo(
    () => createColumns(handleComplete, customerLabel, typeLabels),
    [handleComplete, customerLabel, typeLabels],
  );

  const handleSort = (column: string) => {
    const newOrder =
      pagination.sort_by === column && pagination.sort_order === "asc"
        ? "desc"
        : "asc";
    setPagination({ ...pagination, sort_by: column, sort_order: newOrder });
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    loadTasks();
    loadCounts();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Tasks</h1>
          <div className="mt-1 flex items-center gap-4 text-sm text-zinc-500">
            {counts && (
              <>
                <span>
                  <span className="font-medium text-zinc-300">
                    {counts.pending}
                  </span>{" "}
                  pending
                </span>
                {counts.overdue > 0 && (
                  <span>
                    <span className="font-medium text-red-400">
                      {counts.overdue}
                    </span>{" "}
                    overdue
                  </span>
                )}
                <span>
                  <span className="font-medium text-zinc-300">
                    {counts.due_today}
                  </span>{" "}
                  due today
                </span>
                <span>
                  <span className="font-medium text-emerald-400">
                    {counts.completed_this_week}
                  </span>{" "}
                  done this week
                </span>
              </>
            )}
          </div>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 border-b border-zinc-800 px-6 py-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 rounded-lg bg-zinc-900 p-1">
          {STATUS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                <Icon className="h-3 w-3" />
                {tab.label}
                {tab.value === "overdue" && counts && counts.overdue > 0 && (
                  <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500/20 px-1 text-[10px] font-medium text-red-400">
                    {counts.overdue}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-8 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {typeFilterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-8 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {PRIORITY_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {error ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-red-400">{error}</p>
              <Button variant="outline" className="mt-4" onClick={loadTasks}>
                Try Again
              </Button>
            </div>
          </div>
        ) : tasks.length === 0 && !isLoading ? (
          statusFilter !== "all" ||
          typeFilter !== "all" ||
          priorityFilter !== "all" ? (
            <EmptySearchResults />
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <EmptyState
                icon={CheckSquare}
                title="No tasks yet"
                description="Create tasks to track follow-ups, callbacks, and other actions."
                action={{
                  label: "Add Task",
                  onClick: () => setIsFormOpen(true),
                }}
                variant="card"
              />
            </div>
          )
        ) : (
          <DataTable
            columns={columns}
            data={tasks}
            keyExtractor={(t) => t.id}
            isLoading={isLoading}
            sortBy={pagination.sort_by}
            sortOrder={pagination.sort_order}
            onSort={handleSort}
          />
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="border-t border-zinc-800 px-6 py-4">
          <Pagination
            total={total}
            limit={pagination.limit}
            offset={pagination.offset}
            onPageChange={(offset) => setPagination({ ...pagination, offset })}
            onLimitChange={(limit) =>
              setPagination({ ...pagination, limit, offset: 0 })
            }
          />
        </div>
      )}

      {/* Task Form Modal */}
      <TaskForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
