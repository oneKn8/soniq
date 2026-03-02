"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { PendingBookingCard } from "./PendingBookingCard";
import { EmptyState } from "@/components/crm/shared/EmptyState";
import type { PendingBooking } from "@/types";

interface PendingBookingsListProps {
  bookings: PendingBooking[];
  isLoading?: boolean;
  onConfirm?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  onViewTranscript?: (callId: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

function BookingSkeleton() {
  return (
    <div className="rounded-xl border bg-card overflow-hidden animate-pulse">
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-3 w-48 bg-muted rounded" />
          </div>
        </div>
      </div>
      <div className="px-4 pb-3 space-y-2">
        <div className="h-4 w-40 bg-muted rounded" />
        <div className="h-4 w-56 bg-muted rounded" />
      </div>
      <div className="flex gap-2 border-t border-border p-3 bg-muted/30">
        <div className="flex-1 h-8 bg-muted rounded" />
        <div className="flex-1 h-8 bg-muted rounded" />
      </div>
    </div>
  );
}

export function PendingBookingsList({
  bookings,
  isLoading = false,
  onConfirm,
  onReject,
  onViewTranscript,
  emptyTitle = "No bookings found",
  emptyDescription = "There are no pending bookings to display.",
  className,
}: PendingBookingsListProps) {
  if (isLoading) {
    return (
      <div
        className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <BookingSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={emptyTitle}
        description={emptyDescription}
        className={className}
      />
    );
  }

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      <AnimatePresence mode="popLayout">
        {bookings.map((booking, index) => (
          <motion.div
            key={booking.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.05 }}
            layout
          >
            <PendingBookingCard
              booking={booking}
              onConfirm={onConfirm}
              onReject={onReject}
              onViewTranscript={onViewTranscript}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Compact list view for sidebars or smaller areas
export function PendingBookingsCompact({
  bookings,
  isLoading = false,
  onConfirm,
  onReject,
  maxItems = 5,
  className,
}: Omit<PendingBookingsListProps, "onViewTranscript"> & { maxItems?: number }) {
  const displayBookings = bookings.slice(0, maxItems);
  const remainingCount = bookings.length - maxItems;

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border p-3 animate-pulse"
          >
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-2.5 w-32 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className={cn("text-center py-6", className)}>
        <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No pending bookings</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <AnimatePresence>
        {displayBookings.map((booking) => (
          <motion.div
            key={booking.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                <Calendar className="h-4 w-4 text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {booking.customer_name || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {booking.service || "Booking request"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {onConfirm && (
                <button
                  onClick={() => onConfirm(booking.id)}
                  className="p-1.5 rounded-md text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  title="Confirm"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </button>
              )}
              {onReject && (
                <button
                  onClick={() => onReject(booking.id)}
                  className="p-1.5 rounded-md text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  title="Reject"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {remainingCount > 0 && (
        <p className="text-xs text-center text-muted-foreground pt-1">
          +{remainingCount} more pending
        </p>
      )}
    </div>
  );
}
