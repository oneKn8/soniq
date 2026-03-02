"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  Calendar,
  Clock,
  User,
  MessageSquare,
  ExternalLink,
  Check,
  X,
  Loader2,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShineBorder } from "@/components/magicui/shine-border";
import type { PendingBooking, BookingStatus } from "@/types";

interface PendingBookingCardProps {
  booking: PendingBooking;
  onConfirm?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  onViewTranscript?: (callId: string) => void;
  className?: string;
}

const STATUS_STYLES: Record<
  BookingStatus,
  { bg: string; text: string; label: string; border?: string }
> = {
  pending: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    label: "Pending",
    border: "border-amber-500/50",
  },
  confirmed: {
    bg: "bg-green-500/10",
    text: "text-green-600 dark:text-green-400",
    label: "Confirmed",
    border: "border-green-500/50",
  },
  rejected: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    label: "Rejected",
    border: "border-red-500/50",
  },
  cancelled: {
    bg: "bg-zinc-500/10",
    text: "text-zinc-600 dark:text-zinc-400",
    label: "Cancelled",
    border: "border-zinc-500/50",
  },
};

function formatDate(dateString?: string): string {
  if (!dateString) return "Not specified";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

function formatTime(timeString?: string): string {
  if (!timeString) return "";
  // Handle various time formats
  if (timeString.includes(":")) {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }
  return timeString;
}

function formatPhone(phone: string): string {
  // Simple US phone formatting
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

export function PendingBookingCard({
  booking,
  onConfirm,
  onReject,
  onViewTranscript,
  className,
}: PendingBookingCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const statusStyle = STATUS_STYLES[booking.status];
  const isPending = booking.status === "pending";
  const hasDateTime = booking.requested_date || booking.requested_time;

  const handleConfirm = async () => {
    if (!onConfirm || isConfirming) return;
    setIsConfirming(true);
    try {
      await onConfirm(booking.id);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReject = async () => {
    if (!onReject || isRejecting) return;
    setIsRejecting(true);
    try {
      await onReject(booking.id);
    } finally {
      setIsRejecting(false);
    }
  };

  const CardWrapper = isPending ? ShineBorder : "div";
  const wrapperProps = isPending
    ? {
        borderRadius: 12,
        borderWidth: 1,
        duration: 10,
        color: ["#fbbf24", "#f59e0b", "#fbbf24"],
        className: "w-full min-w-0",
      }
    : { className: cn("rounded-xl border bg-card", className) };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn("w-full", className)}
    >
      <CardWrapper {...(wrapperProps as Record<string, unknown>)}>
        <div
          className={cn(
            "rounded-xl border bg-card overflow-hidden",
            isPending && "border-l-4",
            isPending && statusStyle.border,
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 pb-3">
            <div className="flex items-start gap-3 min-w-0">
              {/* Avatar */}
              <div
                className={cn(
                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                  statusStyle.bg,
                )}
              >
                <User className={cn("h-5 w-5", statusStyle.text)} />
              </div>

              {/* Customer info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground truncate">
                    {booking.customer_name || "Unknown Customer"}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", statusStyle.bg, statusStyle.text)}
                  >
                    {statusStyle.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <a
                    href={`tel:${booking.customer_phone}`}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {formatPhone(booking.customer_phone)}
                  </a>
                  <span className="flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3" />
                    {getTimeAgo(booking.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Booking details */}
          <div className="px-4 pb-3 space-y-2">
            {/* Date/Time */}
            {hasDateTime && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground font-medium">
                  {formatDate(booking.requested_date)}
                  {booking.requested_time && (
                    <span className="text-muted-foreground ml-1">
                      at {formatTime(booking.requested_time)}
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Service */}
            {booking.service && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{booking.service}</span>
              </div>
            )}

            {/* Notes */}
            {booking.notes && (
              <div className="flex items-start gap-2 text-sm">
                <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground line-clamp-2">
                  {booking.notes}
                </p>
              </div>
            )}
          </div>

          {/* Transcript link */}
          {booking.call_id && onViewTranscript && (
            <div className="px-4 pb-3">
              <button
                onClick={() => onViewTranscript(booking.call_id!)}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                View call transcript
              </button>
            </div>
          )}

          {/* Actions */}
          {isPending && (onConfirm || onReject) && (
            <div className="flex items-center gap-2 border-t border-border p-3 bg-muted/30">
              {onConfirm && (
                <Button
                  onClick={handleConfirm}
                  disabled={isConfirming || isRejecting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  {isConfirming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Confirm
                    </>
                  )}
                </Button>
              )}
              {onReject && (
                <Button
                  onClick={handleReject}
                  disabled={isConfirming || isRejecting}
                  variant="outline"
                  className="flex-1 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50"
                  size="sm"
                >
                  {isRejecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Confirmed by info */}
          {booking.status === "confirmed" && booking.confirmed_by && (
            <div className="px-4 py-2 border-t border-border bg-green-50/50 dark:bg-green-950/20 text-xs text-muted-foreground">
              Confirmed by {booking.confirmed_by}
              {booking.confirmed_at && (
                <span>
                  {" "}
                  on {new Date(booking.confirmed_at).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
      </CardWrapper>
    </motion.div>
  );
}
