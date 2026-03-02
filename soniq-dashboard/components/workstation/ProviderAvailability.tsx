"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  User,
  Clock,
  CheckCircle,
  XCircle,
  Coffee,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ProviderStatus =
  | "available"
  | "with-patient"
  | "break"
  | "unavailable"
  | "off";

export interface Provider {
  id: string;
  name: string;
  title: string;
  specialty?: string;
  status: ProviderStatus;
  currentPatient?: string;
  nextAvailable?: string;
  appointmentsToday: number;
  appointmentsCompleted: number;
  avatar?: string;
}

interface ProviderAvailabilityProps {
  providers?: Provider[];
  title?: string;
  onProviderClick?: (provider: Provider) => void;
  onBookClick?: (provider: Provider) => void;
  className?: string;
}

// Mock provider data
const MOCK_PROVIDERS: Provider[] = [
  {
    id: "p1",
    name: "Dr. Williams",
    title: "Primary Care",
    specialty: "General Medicine",
    status: "with-patient",
    currentPatient: "Sarah Johnson",
    nextAvailable: "11:30 AM",
    appointmentsToday: 8,
    appointmentsCompleted: 3,
  },
  {
    id: "p2",
    name: "Dr. Chen",
    title: "Specialist",
    specialty: "Internal Medicine",
    status: "available",
    nextAvailable: "Now",
    appointmentsToday: 6,
    appointmentsCompleted: 2,
  },
  {
    id: "p3",
    name: "Dr. Martinez",
    title: "Primary Care",
    specialty: "Family Medicine",
    status: "break",
    nextAvailable: "12:00 PM",
    appointmentsToday: 7,
    appointmentsCompleted: 4,
  },
  {
    id: "p4",
    name: "Dr. Thompson",
    title: "Nurse Practitioner",
    status: "unavailable",
    appointmentsToday: 0,
    appointmentsCompleted: 0,
  },
];

const STATUS_CONFIG = {
  available: {
    icon: CheckCircle,
    color: "text-green-500",
    bg: "bg-green-500/10",
    ring: "ring-green-500/20",
    label: "Available",
  },
  "with-patient": {
    icon: User,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/20",
    label: "With Patient",
  },
  break: {
    icon: Coffee,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    ring: "ring-blue-500/20",
    label: "On Break",
  },
  unavailable: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    ring: "ring-red-500/20",
    label: "Unavailable",
  },
  off: {
    icon: XCircle,
    color: "text-muted-foreground",
    bg: "bg-muted",
    ring: "ring-border",
    label: "Off Today",
  },
};

export function ProviderAvailability({
  providers = MOCK_PROVIDERS,
  title = "Provider Availability",
  onProviderClick,
  onBookClick,
  className,
}: ProviderAvailabilityProps) {
  const { available, busy, unavailable } = useMemo(() => {
    const available = providers.filter((p) => p.status === "available");
    const busy = providers.filter(
      (p) => p.status === "with-patient" || p.status === "break",
    );
    const unavailable = providers.filter(
      (p) => p.status === "unavailable" || p.status === "off",
    );
    return { available, busy, unavailable };
  }, [providers]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const renderProvider = (provider: Provider, index: number) => {
    const status = STATUS_CONFIG[provider.status];
    const StatusIcon = status.icon;
    const progress =
      provider.appointmentsToday > 0
        ? (provider.appointmentsCompleted / provider.appointmentsToday) * 100
        : 0;

    return (
      <motion.div
        key={provider.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => onProviderClick?.(provider)}
        className={cn(
          "group flex items-center gap-3 rounded-lg border border-border p-3 transition-all duration-200",
          "hover:shadow-soft cursor-pointer",
          provider.status === "available" &&
            "border-green-500/30 bg-green-500/5",
        )}
      >
        {/* Avatar with status indicator */}
        <div className="relative flex-shrink-0">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full bg-muted ring-2",
              status.ring,
            )}
          >
            {provider.avatar ? (
              <img
                src={provider.avatar}
                alt={provider.name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-foreground">
                {getInitials(provider.name)}
              </span>
            )}
          </div>
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card flex items-center justify-center",
              status.bg,
            )}
          >
            <StatusIcon className={cn("h-2.5 w-2.5", status.color)} />
          </div>
        </div>

        {/* Provider Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {provider.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-muted-foreground truncate">
              {provider.title}
            </span>
            {provider.specialty && (
              <>
                <span className="text-xs text-muted-foreground">-</span>
                <span className="text-xs text-muted-foreground truncate">
                  {provider.specialty}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status & Progress */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            {provider.status === "available" ? (
              <span className="text-xs font-medium text-green-500">
                Available Now
              </span>
            ) : provider.status === "with-patient" &&
              provider.currentPatient ? (
              <span className="text-xs text-foreground truncate max-w-[100px] block">
                {provider.currentPatient}
              </span>
            ) : (
              <span className={cn("text-xs font-medium", status.color)}>
                {status.label}
              </span>
            )}
            {provider.nextAvailable && provider.status !== "available" && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                <Clock className="h-3 w-3" />
                {provider.nextAvailable}
              </p>
            )}
          </div>

          {/* Progress bar */}
          {provider.appointmentsToday > 0 && (
            <div className="hidden sm:flex flex-col items-end gap-0.5">
              <span className="text-[10px] text-muted-foreground">
                {provider.appointmentsCompleted}/{provider.appointmentsToday}
              </span>
              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-industry rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Book action */}
          {provider.status === "available" && onBookClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBookClick(provider);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex h-7 px-2 items-center justify-center rounded-md bg-industry-muted text-industry text-xs font-medium hover:bg-industry/20"
            >
              <Calendar className="h-3.5 w-3.5 mr-1" />
              Book
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
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <div className="flex items-center gap-3">
          {available.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-green-500">
              <CheckCircle className="h-3.5 w-3.5" />
              {available.length} available
            </span>
          )}
          {busy.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              {busy.length} busy
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <User className="h-10 w-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            No providers configured
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Available providers first */}
          {available.map((provider, idx) => renderProvider(provider, idx))}

          {/* Busy providers */}
          {busy.map((provider, idx) =>
            renderProvider(provider, idx + available.length),
          )}

          {/* Unavailable providers */}
          {unavailable.length > 0 && (
            <div className="pt-2 border-t border-border mt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Unavailable ({unavailable.length})
              </p>
              <div className="opacity-60 space-y-2">
                {unavailable.map((provider, idx) =>
                  renderProvider(
                    provider,
                    idx + available.length + busy.length,
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
