"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Calendar,
  CalendarCheck,
  CalendarX,
  User,
  UserPlus,
  MessageSquare,
  Bell,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type ActivityType =
  | "call_incoming"
  | "call_outgoing"
  | "call_missed"
  | "booking_created"
  | "booking_confirmed"
  | "booking_cancelled"
  | "contact_created"
  | "contact_updated"
  | "message_received"
  | "notification"
  | "check_in"
  | "check_out";

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: Date;
  entityId?: string;
  entityName?: string;
  metadata?: Record<string, unknown>;
}

interface ActivityFeedProps {
  activities?: Activity[];
  title?: string;
  maxItems?: number;
  onActivityClick?: (activity: Activity) => void;
  className?: string;
}

const ACTIVITY_CONFIG: Record<
  ActivityType,
  {
    icon: typeof Phone;
    color: string;
    bg: string;
  }
> = {
  call_incoming: {
    icon: PhoneIncoming,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  call_outgoing: {
    icon: PhoneOutgoing,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  call_missed: {
    icon: PhoneMissed,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  booking_created: {
    icon: Calendar,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  booking_confirmed: {
    icon: CalendarCheck,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  booking_cancelled: {
    icon: CalendarX,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  contact_created: {
    icon: UserPlus,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  contact_updated: {
    icon: User,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  message_received: {
    icon: MessageSquare,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  notification: {
    icon: Bell,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  check_in: {
    icon: CheckCircle,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  check_out: {
    icon: AlertCircle,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
};

// Mock activities
const MOCK_ACTIVITIES: Activity[] = [
  {
    id: "1",
    type: "call_incoming",
    title: "Incoming call from John Smith",
    description: "Duration: 3m 45s",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    entityName: "John Smith",
  },
  {
    id: "2",
    type: "booking_confirmed",
    title: "Appointment confirmed",
    description: "Sarah Johnson - Tomorrow at 10:00 AM",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    entityName: "Sarah Johnson",
  },
  {
    id: "3",
    type: "contact_created",
    title: "New contact added",
    description: "Michael Brown - Referral",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    entityName: "Michael Brown",
  },
  {
    id: "4",
    type: "call_missed",
    title: "Missed call",
    description: "Unknown number: +1 555-0199",
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
  },
  {
    id: "5",
    type: "booking_created",
    title: "New appointment scheduled",
    description: "Emily Davis - Friday at 2:00 PM",
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    entityName: "Emily Davis",
  },
  {
    id: "6",
    type: "check_in",
    title: "Patient checked in",
    description: "Robert Wilson - Waiting room",
    timestamp: new Date(Date.now() - 1000 * 60 * 90),
    entityName: "Robert Wilson",
  },
];

export function ActivityFeed({
  activities = MOCK_ACTIVITIES,
  title = "Recent Activity",
  maxItems = 10,
  onActivityClick,
  className,
}: ActivityFeedProps) {
  const displayedActivities = useMemo(
    () => activities.slice(0, maxItems),
    [activities, maxItems],
  );

  const formatTime = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <div className={cn("card-soft p-4", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">
          {activities.length} events
        </span>
      </div>

      {displayedActivities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="h-10 w-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

          {/* Activities */}
          <div className="space-y-4">
            {displayedActivities.map((activity, index) => {
              const config = ACTIVITY_CONFIG[activity.type];
              const Icon = config.icon;

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onActivityClick?.(activity)}
                  className={cn(
                    "group relative flex gap-3 pl-1",
                    onActivityClick && "cursor-pointer",
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "relative z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full",
                      config.bg,
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5", config.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {activity.title}
                        </p>
                        {activity.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {activity.description}
                          </p>
                        )}
                      </div>
                      <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                        {formatTime(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
