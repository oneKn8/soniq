"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, User, CheckCircle, ChevronRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useIndustry } from "@/context/IndustryContext";

export interface WaitingPatient {
  id: string;
  name: string;
  appointmentTime: string;
  checkedInAt: Date;
  provider: string;
  type: string;
  priority: "normal" | "urgent" | "vip";
  status: "waiting" | "ready" | "in-room";
  room?: string;
}

interface WaitingRoomProps {
  patients?: WaitingPatient[];
  title?: string;
  onPatientClick?: (patient: WaitingPatient) => void;
  onReadyClick?: (patient: WaitingPatient) => void;
  className?: string;
}

// Mock waiting room data
const MOCK_PATIENTS: WaitingPatient[] = [
  {
    id: "w1",
    name: "Sarah Johnson",
    appointmentTime: "10:30 AM",
    checkedInAt: new Date(Date.now() - 1000 * 60 * 12),
    provider: "Dr. Williams",
    type: "Follow-up",
    priority: "vip",
    status: "waiting",
  },
  {
    id: "w2",
    name: "Michael Brown",
    appointmentTime: "11:00 AM",
    checkedInAt: new Date(Date.now() - 1000 * 60 * 5),
    provider: "Dr. Chen",
    type: "New Patient",
    priority: "normal",
    status: "ready",
    room: "Room 3",
  },
  {
    id: "w3",
    name: "Emily Davis",
    appointmentTime: "11:15 AM",
    checkedInAt: new Date(Date.now() - 1000 * 60 * 2),
    provider: "Dr. Williams",
    type: "Check-up",
    priority: "urgent",
    status: "waiting",
  },
];

const PRIORITY_CONFIG = {
  normal: {
    color: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
    label: "",
  },
  urgent: {
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    label: "URGENT",
  },
  vip: {
    color: "text-industry",
    bg: "bg-industry-muted",
    border: "border-industry/30",
    label: "VIP",
  },
};

const STATUS_CONFIG = {
  waiting: {
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    label: "Waiting",
  },
  ready: {
    icon: CheckCircle,
    color: "text-green-500",
    bg: "bg-green-500/10",
    label: "Ready",
  },
  "in-room": {
    icon: User,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "In Room",
  },
};

export function WaitingRoom({
  patients = MOCK_PATIENTS,
  title = "Waiting Room",
  onPatientClick,
  onReadyClick,
  className,
}: WaitingRoomProps) {
  const { customerPluralLabel } = useIndustry();
  const { waiting, ready, inRoom } = useMemo(() => {
    const waiting = patients.filter((p) => p.status === "waiting");
    const ready = patients.filter((p) => p.status === "ready");
    const inRoom = patients.filter((p) => p.status === "in-room");
    return { waiting, ready, inRoom };
  }, [patients]);

  const formatWaitTime = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: false });
  };

  const renderPatient = (patient: WaitingPatient, index: number) => {
    const priority = PRIORITY_CONFIG[patient.priority];
    const status = STATUS_CONFIG[patient.status];
    const StatusIcon = status.icon;

    return (
      <motion.div
        key={patient.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => onPatientClick?.(patient)}
        className={cn(
          "group flex items-center gap-3 rounded-lg border p-3 transition-all duration-200",
          "hover:shadow-soft cursor-pointer",
          priority.border,
          patient.status === "ready" && "bg-green-500/5 border-green-500/30",
        )}
      >
        {/* Status Icon */}
        <div className={cn("flex-shrink-0 rounded-full p-2", status.bg)}>
          <StatusIcon className={cn("h-4 w-4", status.color)} />
        </div>

        {/* Patient Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {patient.name}
            </span>
            {patient.priority !== "normal" && (
              <span
                className={cn(
                  "flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                  priority.bg,
                  priority.color,
                )}
              >
                {priority.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {patient.appointmentTime}
            </span>
            <span className="text-xs text-muted-foreground">-</span>
            <span className="text-xs text-muted-foreground truncate">
              {patient.provider}
            </span>
          </div>
        </div>

        {/* Wait Time & Actions */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-xs font-medium text-foreground">
              {formatWaitTime(patient.checkedInAt)}
            </span>
            {patient.room && (
              <p className="text-[10px] text-muted-foreground">
                {patient.room}
              </p>
            )}
          </div>
          {patient.status === "waiting" && onReadyClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReadyClick(patient);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex h-7 px-2 items-center justify-center rounded-md bg-green-500/10 text-green-500 text-xs font-medium hover:bg-green-500/20"
            >
              Ready
            </button>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </motion.div>
    );
  };

  return (
    <div className={cn("card-soft p-4", className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {waiting.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-amber-500">
              <Clock className="h-3.5 w-3.5" />
              {waiting.length} waiting
            </span>
          )}
          {ready.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-green-500">
              <CheckCircle className="h-3.5 w-3.5" />
              {ready.length} ready
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Users className="h-10 w-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            No {customerPluralLabel.toLowerCase()} in waiting room
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {/* Ready patients first */}
            {ready.map((patient, idx) => renderPatient(patient, idx))}

            {/* Then waiting patients */}
            {waiting.map((patient, idx) =>
              renderPatient(patient, idx + ready.length),
            )}

            {/* In-room patients last (optional display) */}
            {inRoom.length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  In Room ({inRoom.length})
                </p>
                {inRoom.map((patient, idx) =>
                  renderPatient(patient, idx + ready.length + waiting.length),
                )}
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
