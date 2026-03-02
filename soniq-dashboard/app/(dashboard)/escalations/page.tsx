"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  Clock,
  AlertTriangle,
  Filter,
  RefreshCw,
  Users,
  TrendingUp,
  CheckCircle2,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEscalation } from "@/context/EscalationContext";
import { EscalationCard } from "@/components/escalation";
import type { EscalationPriority, EscalationStatus } from "@/types/escalation";

type FilterStatus = "all" | EscalationStatus;
type FilterPriority = "all" | EscalationPriority;

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export default function EscalationsPage() {
  const {
    queue,
    waitingCount,
    urgentCount,
    highPriorityCount,
    avgWaitTime,
    isLoading,
    takeCall,
    openPanel,
    refresh,
  } = useEscalation();

  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>("all");

  // Filter escalations
  const filteredQueue = queue.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (priorityFilter !== "all" && e.priority !== priorityFilter) return false;
    return true;
  });

  // Stats
  const resolvedToday = queue.filter((e) => e.status === "resolved").length;
  const callbacksScheduled = queue.filter(
    (e) => e.status === "callback-scheduled",
  ).length;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Escalation Queue
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage calls that need human assistance
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Users className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {waitingCount}
                </p>
                <p className="text-xs text-muted-foreground">Waiting</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {urgentCount + highPriorityCount}
                </p>
                <p className="text-xs text-muted-foreground">High Priority</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatTime(avgWaitTime)}
                </p>
                <p className="text-xs text-muted-foreground">Avg Wait</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {resolvedToday}
                </p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Filters:
            </span>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            {(
              [
                { value: "all", label: "All" },
                { value: "waiting", label: "Waiting" },
                { value: "in-progress", label: "In Progress" },
                { value: "callback-scheduled", label: "Callback" },
                { value: "resolved", label: "Resolved" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  statusFilter === option.value
                    ? "bg-industry text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            {[
              {
                value: "all" as const,
                label: "All Priorities",
                color: "text-muted-foreground",
              },
              {
                value: "urgent" as const,
                label: "Urgent",
                color: "text-red-500",
              },
              {
                value: "high" as const,
                label: "High",
                color: "text-amber-500",
              },
              {
                value: "normal" as const,
                label: "Normal",
                color: "text-blue-500",
              },
              {
                value: "low" as const,
                label: "Low",
                color: "text-muted-foreground",
              },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setPriorityFilter(option.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  priorityFilter === option.value
                    ? "bg-industry text-white"
                    : cn("hover:bg-accent", option.color),
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Queue List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredQueue.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Phone className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No escalations found
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {statusFilter === "all" && priorityFilter === "all"
                  ? "The queue is empty. All calls are being handled by the AI."
                  : "No escalations match the current filters."}
              </p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredQueue.map((escalation, index) => (
                <motion.div
                  key={escalation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <EscalationCard
                    escalation={escalation}
                    onTakeCall={
                      escalation.status === "waiting"
                        ? () => takeCall(escalation.id)
                        : undefined
                    }
                    onScheduleCallback={
                      escalation.status === "waiting"
                        ? () => openPanel(escalation)
                        : undefined
                    }
                    onClick={() => openPanel(escalation)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Summary footer */}
        {filteredQueue.length > 0 && (
          <div className="flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
            <span>
              Showing {filteredQueue.length} of {queue.length} escalations
            </span>
            {callbacksScheduled > 0 && (
              <span className="flex items-center gap-1">
                <CalendarClock className="h-4 w-4" />
                {callbacksScheduled} callbacks scheduled
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
