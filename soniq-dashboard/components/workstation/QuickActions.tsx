"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  UserPlus,
  CalendarPlus,
  Phone,
  ClipboardCheck,
  LogIn,
  LogOut,
  ListPlus,
  Bell,
  Car,
  Home,
  Wrench,
  CalendarClock,
  BedDouble,
  Users,
  ListTodo,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import type { QuickAction } from "@/lib/templates/types";

// Icon mapping
const ICON_MAP: Record<string, LucideIcon> = {
  UserPlus,
  CalendarPlus,
  Phone,
  ClipboardCheck,
  LogIn,
  LogOut,
  ListPlus,
  Bell,
  Car,
  Home,
  Wrench,
  CalendarClock,
  BedDouble,
  Users,
  ListTodo,
};

interface QuickActionsProps {
  actions?: QuickAction[];
  title?: string;
  onAction?: (action: QuickAction) => void;
  className?: string;
}

// Default actions
const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: "new-contact",
    label: "New Contact",
    icon: "UserPlus",
    action: "/contacts?new=true",
  },
  {
    id: "new-booking",
    label: "New Booking",
    icon: "CalendarPlus",
    action: "/calendar?new=true",
    variant: "primary",
  },
  { id: "view-calls", label: "Call History", icon: "Phone", action: "/calls" },
];

export function QuickActions({
  actions = DEFAULT_ACTIONS,
  title = "Quick Actions",
  onAction,
  className,
}: QuickActionsProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Friendly labels for non-path actions
  const ACTION_LABELS: Record<string, string> = {
    "check-in": "Check-in initiated",
    "check-out": "Check-out initiated",
    call: "Preparing call",
    seat: "Seating party",
    waitlist: "Added to waitlist",
    notify: "Notification sent",
    reschedule: "Opening reschedule",
  };

  const handleAction = (action: QuickAction) => {
    if (onAction) {
      onAction(action);
    } else if (action.action.startsWith("/")) {
      router.push(action.action);
    } else {
      // Non-path actions: show toast feedback
      const message =
        ACTION_LABELS[action.action] || `${action.label} triggered`;
      toast.success(action.label, message);
    }
  };

  return (
    <div className={cn("card-soft p-4", className)}>
      <h2 className="mb-4 text-lg font-semibold text-foreground">{title}</h2>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-3">
        {actions.map((action, index) => {
          const Icon = ICON_MAP[action.icon] || UserPlus;
          const isPrimary = action.variant === "primary";
          const isDestructive = action.variant === "destructive";

          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleAction(action)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all duration-200",
                isPrimary
                  ? "border-industry bg-industry-muted hover:bg-industry hover:text-white"
                  : isDestructive
                    ? "border-destructive/30 bg-destructive/5 hover:bg-destructive hover:text-white"
                    : "border-border bg-card hover:border-border-muted hover:bg-accent hover:shadow-soft",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  isPrimary
                    ? "text-industry group-hover:text-white"
                    : isDestructive
                      ? "text-destructive"
                      : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  isPrimary
                    ? "text-industry"
                    : isDestructive
                      ? "text-destructive"
                      : "text-foreground",
                )}
              >
                {action.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
