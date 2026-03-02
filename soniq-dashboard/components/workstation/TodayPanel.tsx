"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronRight,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIndustry } from "@/context/IndustryContext";

export interface ScheduleItem {
  id: string;
  time: string;
  entityName: string;
  entityPhone?: string;
  type?: string;
  status:
    | "pending"
    | "confirmed"
    | "in-progress"
    | "completed"
    | "no-show"
    | "cancelled";
  notes?: string;
  isVip?: boolean;
}

interface TodayPanelProps {
  title?: string;
  items?: ScheduleItem[];
  onItemClick?: (item: ScheduleItem) => void;
  onCallClick?: (item: ScheduleItem) => void;
  className?: string;
  emptyMessage?: string;
}

// Mock data for demonstration
const MOCK_ITEMS: ScheduleItem[] = [
  {
    id: "1",
    time: "09:00 AM",
    entityName: "John Smith",
    entityPhone: "+1 555-0123",
    type: "Consultation",
    status: "completed",
  },
  {
    id: "2",
    time: "10:30 AM",
    entityName: "Sarah Johnson",
    entityPhone: "+1 555-0124",
    type: "Follow-up",
    status: "in-progress",
    isVip: true,
  },
  {
    id: "3",
    time: "11:00 AM",
    entityName: "Michael Brown",
    entityPhone: "+1 555-0125",
    type: "New Patient",
    status: "confirmed",
  },
  {
    id: "4",
    time: "02:00 PM",
    entityName: "Emily Davis",
    entityPhone: "+1 555-0126",
    type: "Check-up",
    status: "pending",
  },
  {
    id: "5",
    time: "03:30 PM",
    entityName: "Robert Wilson",
    entityPhone: "+1 555-0127",
    type: "Consultation",
    status: "pending",
  },
];

const STATUS_CONFIG = {
  pending: {
    icon: Circle,
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "Pending",
  },
  confirmed: {
    icon: CheckCircle2,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "Confirmed",
  },
  "in-progress": {
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    label: "In Progress",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-500/10",
    label: "Completed",
  },
  "no-show": {
    icon: AlertCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    label: "No Show",
  },
  cancelled: {
    icon: AlertCircle,
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "Cancelled",
  },
};

export function TodayPanel({
  title,
  items = MOCK_ITEMS,
  onItemClick,
  onCallClick,
  className,
  emptyMessage,
}: TodayPanelProps) {
  const { transactionLabel } = useIndustry();

  const panelTitle = title || `Today's ${transactionLabel}s`;
  const empty =
    emptyMessage || `No ${transactionLabel.toLowerCase()}s scheduled for today`;

  // Group items by status
  const { upcoming, inProgress, completed } = useMemo(() => {
    const upcoming = items.filter(
      (i) => i.status === "pending" || i.status === "confirmed",
    );
    const inProgress = items.filter((i) => i.status === "in-progress");
    const completed = items.filter(
      (i) =>
        i.status === "completed" ||
        i.status === "no-show" ||
        i.status === "cancelled",
    );
    return { upcoming, inProgress, completed };
  }, [items]);

  const renderItem = (item: ScheduleItem, index: number) => {
    const status = STATUS_CONFIG[item.status];
    const StatusIcon = status.icon;

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => onItemClick?.(item)}
        className={cn(
          "group flex items-center gap-3 rounded-lg border border-border p-3 transition-all duration-200",
          "hover:border-border-muted hover:shadow-soft cursor-pointer",
          item.status === "in-progress" && "border-amber-500/30 bg-amber-500/5",
        )}
      >
        {/* Time */}
        <div className="flex w-20 flex-shrink-0 flex-col">
          <span className="text-sm font-medium text-foreground">
            {item.time}
          </span>
          {item.type && (
            <span className="text-xs text-muted-foreground truncate">
              {item.type}
            </span>
          )}
        </div>

        {/* Status Icon */}
        <div className={cn("flex-shrink-0 rounded-full p-1", status.bg)}>
          <StatusIcon className={cn("h-4 w-4", status.color)} />
        </div>

        {/* Entity Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {item.entityName}
            </span>
            {item.isVip && (
              <span className="flex-shrink-0 rounded bg-industry-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-industry">
                VIP
              </span>
            )}
          </div>
          {item.notes && (
            <p className="text-xs text-muted-foreground truncate">
              {item.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {item.entityPhone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCallClick?.(item);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Phone className="h-4 w-4" />
            </button>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </motion.div>
    );
  };

  return (
    <div className={cn("card-soft p-4", className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{panelTitle}</h2>
        <span className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="h-10 w-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">{empty}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* In Progress */}
          {inProgress.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-500">
                In Progress ({inProgress.length})
              </h3>
              <div className="space-y-2">
                {inProgress.map((item, idx) => renderItem(item, idx))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Upcoming ({upcoming.length})
              </h3>
              <div className="space-y-2">
                {upcoming.map((item, idx) =>
                  renderItem(item, idx + inProgress.length),
                )}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Completed ({completed.length})
              </h3>
              <div className="space-y-2 opacity-60">
                {completed.map((item, idx) =>
                  renderItem(item, idx + inProgress.length + upcoming.length),
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
