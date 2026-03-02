"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  Clock,
  AlertTriangle,
  AlertCircle,
  User,
  PhoneIncoming,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AISummaryInline } from "./AISummary";
import type {
  EscalationItem,
  EscalationPriority,
  EscalationStatus,
} from "@/types/escalation";

interface EscalationCardProps {
  escalation: EscalationItem;
  onTakeCall?: () => void;
  onScheduleCallback?: () => void;
  onClick?: () => void;
  isCompact?: boolean;
  className?: string;
}

const PRIORITY_STYLES: Record<
  EscalationPriority,
  { bg: string; text: string; border: string; icon: typeof AlertTriangle }
> = {
  urgent: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-l-red-500",
    icon: AlertTriangle,
  },
  high: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-l-amber-500",
    icon: AlertCircle,
  },
  normal: {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-l-blue-500",
    icon: Phone,
  },
  low: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-l-muted-foreground",
    icon: Phone,
  },
};

const STATUS_STYLES: Record<
  EscalationStatus,
  { bg: string; text: string; label: string; icon: typeof Phone }
> = {
  waiting: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    label: "Waiting",
    icon: Clock,
  },
  "in-progress": {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    label: "In Progress",
    icon: PhoneIncoming,
  },
  resolved: {
    bg: "bg-green-500/10",
    text: "text-green-600 dark:text-green-400",
    label: "Resolved",
    icon: CheckCircle2,
  },
  "callback-scheduled": {
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    label: "Callback",
    icon: CalendarClock,
  },
};

function formatWaitTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function EscalationCard({
  escalation,
  onTakeCall,
  onScheduleCallback,
  onClick,
  isCompact = false,
  className,
}: EscalationCardProps) {
  const priorityStyle = PRIORITY_STYLES[escalation.priority];
  const statusStyle = STATUS_STYLES[escalation.status];
  const PriorityIcon = priorityStyle.icon;
  const StatusIcon = statusStyle.icon;

  const formattedWaitTime = useMemo(
    () => formatWaitTime(escalation.waitTime),
    [escalation.waitTime],
  );

  const isWaiting = escalation.status === "waiting";

  if (isCompact) {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border border-l-4 bg-card p-3 text-left transition-shadow hover:shadow-md",
          priorityStyle.border,
          className,
        )}
      >
        {/* Priority indicator */}
        <div
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
            priorityStyle.bg,
          )}
        >
          <PriorityIcon className={cn("h-4 w-4", priorityStyle.text)} />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">
              {escalation.contactName || "Unknown Caller"}
            </span>
            {isWaiting && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formattedWaitTime}
              </span>
            )}
          </div>
          <AISummaryInline
            summary={escalation.aiSummary}
            sentiment={escalation.sentiment}
          />
        </div>

        {/* Status badge */}
        <span
          className={cn(
            "flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
            statusStyle.bg,
            statusStyle.text,
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {statusStyle.label}
        </span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "rounded-xl border border-l-4 bg-card overflow-hidden shadow-sm",
        priorityStyle.border,
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex items-start gap-3">
          {/* Avatar/Icon */}
          <div
            className={cn(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
              priorityStyle.bg,
            )}
          >
            {escalation.contactName ? (
              <User className={cn("h-5 w-5", priorityStyle.text)} />
            ) : (
              <PriorityIcon className={cn("h-5 w-5", priorityStyle.text)} />
            )}
          </div>

          {/* Caller info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">
                {escalation.contactName || "Unknown Caller"}
              </h3>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                  priorityStyle.bg,
                  priorityStyle.text,
                )}
              >
                {escalation.priority}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {escalation.phone}
              </span>
              {isWaiting && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Waiting {formattedWaitTime}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status badge */}
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            statusStyle.bg,
            statusStyle.text,
          )}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {statusStyle.label}
        </span>
      </div>

      {/* Reason */}
      <div className="px-4 pb-3">
        <p className="text-sm text-muted-foreground">{escalation.reason}</p>
      </div>

      {/* AI Summary */}
      <div className="px-4 pb-3">
        <AISummaryInline
          summary={escalation.aiSummary}
          sentiment={escalation.sentiment}
          className="p-2 rounded-lg bg-muted/50"
        />
      </div>

      {/* Actions */}
      {isWaiting && (onTakeCall || onScheduleCallback) && (
        <div className="flex items-center gap-2 border-t border-border p-3 bg-muted/30">
          {onTakeCall && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTakeCall();
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-industry px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-industry/90"
            >
              <PhoneIncoming className="h-4 w-4" />
              Take Call
            </button>
          )}
          {onScheduleCallback && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onScheduleCallback();
              }}
              className="flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
            >
              <CalendarClock className="h-4 w-4" />
              Callback
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
