"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Bell,
  Clock,
  LogIn,
  LogOut,
  Gift,
  Heart,
  AlertCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export type AlertType =
  | "arrival"
  | "departure"
  | "special_request"
  | "birthday"
  | "anniversary"
  | "complaint"
  | "general";

export type AlertPriority = "high" | "medium" | "low";

export interface VIPAlert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  guestName: string;
  roomNumber?: string;
  message: string;
  time: Date;
  isRead?: boolean;
  metadata?: Record<string, unknown>;
}

interface VIPAlertsProps {
  alerts?: VIPAlert[];
  title?: string;
  onAlertClick?: (alert: VIPAlert) => void;
  onDismiss?: (alert: VIPAlert) => void;
  onViewAll?: () => void;
  className?: string;
  maxAlerts?: number;
}

// Mock VIP alerts
const MOCK_ALERTS: VIPAlert[] = [
  {
    id: "a1",
    type: "arrival",
    priority: "high",
    guestName: "Mr. Robert Chen",
    roomNumber: "302",
    message: "VIP Executive arriving at 2:00 PM - Penthouse Suite",
    time: new Date(Date.now() + 1000 * 60 * 60 * 2),
    isRead: false,
  },
  {
    id: "a2",
    type: "birthday",
    priority: "medium",
    guestName: "Sarah Johnson",
    roomNumber: "105",
    message: "Birthday celebration - Complimentary cake ordered",
    time: new Date(Date.now() - 1000 * 60 * 30),
    isRead: false,
  },
  {
    id: "a3",
    type: "special_request",
    priority: "high",
    guestName: "Dr. Emily Davis",
    roomNumber: "203",
    message: "Requested late checkout at 3:00 PM - Suite Guest",
    time: new Date(Date.now() - 1000 * 60 * 45),
    isRead: false,
  },
  {
    id: "a4",
    type: "departure",
    priority: "medium",
    guestName: "James Wilson",
    roomNumber: "206",
    message: "VIP checkout at 11:00 AM - Ensure farewell amenities",
    time: new Date(Date.now() - 1000 * 60 * 15),
    isRead: true,
  },
  {
    id: "a5",
    type: "anniversary",
    priority: "low",
    guestName: "The Martinez Family",
    roomNumber: "301",
    message: "10th anniversary - Champagne and flowers delivered",
    time: new Date(Date.now() - 1000 * 60 * 60),
    isRead: true,
  },
];

const ALERT_TYPE_CONFIG = {
  arrival: {
    icon: LogIn,
    color: "text-green-500",
    bg: "bg-green-500/10",
    label: "Arrival",
  },
  departure: {
    icon: LogOut,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    label: "Departure",
  },
  special_request: {
    icon: Sparkles,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    label: "Request",
  },
  birthday: {
    icon: Gift,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    label: "Birthday",
  },
  anniversary: {
    icon: Heart,
    color: "text-red-500",
    bg: "bg-red-500/10",
    label: "Anniversary",
  },
  complaint: {
    icon: AlertCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    label: "Alert",
  },
  general: {
    icon: Bell,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "Notice",
  },
};

const PRIORITY_CONFIG = {
  high: {
    border: "border-l-red-500",
    badge: "bg-red-500/10 text-red-500",
  },
  medium: {
    border: "border-l-amber-500",
    badge: "bg-amber-500/10 text-amber-500",
  },
  low: {
    border: "border-l-blue-500",
    badge: "bg-blue-500/10 text-blue-500",
  },
};

export function VIPAlerts({
  alerts = MOCK_ALERTS,
  title = "VIP Alerts",
  onAlertClick,
  onDismiss,
  onViewAll,
  className,
  maxAlerts = 5,
}: VIPAlertsProps) {
  const { unread, read } = useMemo(() => {
    const sorted = [...alerts].sort(
      (a, b) => b.time.getTime() - a.time.getTime(),
    );
    const unread = sorted.filter((a) => !a.isRead);
    const read = sorted.filter((a) => a.isRead);
    return { unread, read };
  }, [alerts]);

  const displayAlerts = useMemo(() => {
    return [...unread, ...read].slice(0, maxAlerts);
  }, [unread, read, maxAlerts]);

  const formatTime = (date: Date) => {
    const now = new Date();
    if (date > now) {
      return `in ${formatDistanceToNow(date)}`;
    }
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const renderAlert = (alert: VIPAlert, index: number) => {
    const typeConfig = ALERT_TYPE_CONFIG[alert.type];
    const priorityConfig = PRIORITY_CONFIG[alert.priority];
    const Icon = typeConfig.icon;

    return (
      <motion.div
        key={alert.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => onAlertClick?.(alert)}
        className={cn(
          "group relative flex gap-3 p-3 rounded-lg border border-l-4 transition-all duration-200 cursor-pointer",
          "hover:shadow-soft hover:bg-accent/50",
          priorityConfig.border,
          alert.isRead ? "opacity-60 bg-muted/30" : "bg-card",
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full",
            typeConfig.bg,
          )}
        >
          <Icon className={cn("h-4 w-4", typeConfig.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-foreground truncate">
              {alert.guestName}
            </span>
            {alert.roomNumber && (
              <span className="text-xs text-muted-foreground">
                Room {alert.roomNumber}
              </span>
            )}
            {!alert.isRead && (
              <span className="flex-shrink-0 h-2 w-2 rounded-full bg-industry animate-pulse" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {alert.message}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded",
                typeConfig.bg,
                typeConfig.color,
              )}
            >
              {typeConfig.label}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(alert.time)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onDismiss && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(alert);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Dismiss"
            >
              <span className="sr-only">Dismiss</span>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
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
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </div>
        {unread.length > 0 && (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-industry-muted text-industry text-xs font-medium">
            <Bell className="h-3 w-3" />
            {unread.length} new
          </span>
        )}
      </div>

      {/* Content */}
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Star className="h-10 w-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No VIP alerts</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {displayAlerts.map((alert, idx) => renderAlert(alert, idx))}
          </AnimatePresence>

          {alerts.length > maxAlerts && (
            <button
              onClick={onViewAll}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-2"
            >
              View all {alerts.length} alerts
            </button>
          )}
        </div>
      )}
    </div>
  );
}
