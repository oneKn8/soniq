"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/context/TenantContext";
import { useIndustry } from "@/context/IndustryContext";
import { get, put } from "@/lib/api/client";
import { PendingBookingsList } from "@/components/pending";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TextGenerateEffect } from "@/components/aceternity/text-generate-effect";
import type { PendingBooking, BookingStatus } from "@/types";

interface PendingBookingsResponse {
  bookings: PendingBooking[];
  total: number;
}

interface BookingActionResponse {
  success: boolean;
  booking?: PendingBooking;
  error?: string;
}

type FilterTab = "pending" | "all";

export default function PendingBookingsPage() {
  const { currentTenant } = useTenant();
  const { transactionLabel, transactionPluralLabel } = useIndustry();
  const [bookings, setBookings] = useState<PendingBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("pending");

  const fetchBookings = useCallback(
    async (showRefresh = false) => {
      if (!currentTenant) return;

      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const params: Record<string, string> =
          activeTab === "pending" ? { status: "pending" } : {};
        const response = await get<PendingBookingsResponse>(
          "/api/pending-bookings",
          params,
        );
        setBookings(response.bookings || []);
      } catch (err) {
        console.error("Failed to fetch pending bookings:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load bookings",
        );
        setBookings([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentTenant, activeTab],
  );

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleConfirm = async (id: string) => {
    try {
      const response = await put<BookingActionResponse>(
        `/api/pending-bookings/${id}/confirm`,
      );
      if (response.success) {
        // Update local state
        setBookings((prev) =>
          prev.map((b) =>
            b.id === id ? { ...b, status: "confirmed" as BookingStatus } : b,
          ),
        );
      } else {
        throw new Error(response.error || "Failed to confirm booking");
      }
    } catch (err) {
      console.error("Failed to confirm booking:", err);
      // Could show a toast notification here
    }
  };

  const handleReject = async (id: string) => {
    try {
      const response = await put<BookingActionResponse>(
        `/api/pending-bookings/${id}/reject`,
      );
      if (response.success) {
        // Update local state
        setBookings((prev) =>
          prev.map((b) =>
            b.id === id ? { ...b, status: "rejected" as BookingStatus } : b,
          ),
        );
      } else {
        throw new Error(response.error || "Failed to reject booking");
      }
    } catch (err) {
      console.error("Failed to reject booking:", err);
      // Could show a toast notification here
    }
  };

  const handleViewTranscript = (callId: string) => {
    // Navigate to call detail page
    window.open(`/calls/${callId}`, "_blank");
  };

  // Filter bookings based on active tab
  const displayBookings =
    activeTab === "pending"
      ? bookings.filter((b) => b.status === "pending")
      : bookings;

  // Stats
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const confirmedCount = bookings.filter(
    (b) => b.status === "confirmed",
  ).length;
  const rejectedCount = bookings.filter((b) => b.status === "rejected").length;
  const todayCount = bookings.filter((b) => {
    const created = new Date(b.created_at);
    const today = new Date();
    return created.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <TextGenerateEffect
              words={`Pending ${transactionPluralLabel}`}
              className="text-2xl md:text-3xl text-foreground"
              duration={0.3}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Review and confirm {transactionLabel.toLowerCase()} requests from
              callers
            </p>
          </div>
          <button
            onClick={() => fetchBookings(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin")}
            />
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
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {pendingCount}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
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
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {confirmedCount}
                </p>
                <p className="text-xs text-muted-foreground">Confirmed</p>
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
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {rejectedCount}
                </p>
                <p className="text-xs text-muted-foreground">Rejected</p>
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
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {todayCount}
                </p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Error state */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4"
          >
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </motion.div>
        )}

        {/* Tabs and content */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as FilterTab)}
        >
          <div className="flex items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="h-4 w-4" />
                Pending
                {pendingCount > 0 && (
                  <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-medium text-white">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2">
                <Inbox className="h-4 w-4" />
                All {transactionPluralLabel}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pending" className="mt-6">
            <PendingBookingsList
              bookings={displayBookings}
              isLoading={isLoading}
              onConfirm={handleConfirm}
              onReject={handleReject}
              onViewTranscript={handleViewTranscript}
              emptyTitle={`No pending ${transactionPluralLabel.toLowerCase()}`}
              emptyDescription={`All ${transactionLabel.toLowerCase()} requests have been processed. New requests will appear here.`}
            />
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <PendingBookingsList
              bookings={displayBookings}
              isLoading={isLoading}
              onConfirm={handleConfirm}
              onReject={handleReject}
              onViewTranscript={handleViewTranscript}
              emptyTitle={`No ${transactionPluralLabel.toLowerCase()} yet`}
              emptyDescription={`${transactionLabel} requests from callers will appear here when they're collected.`}
            />
          </TabsContent>
        </Tabs>

        {/* Summary footer */}
        {displayBookings.length > 0 && (
          <div className="flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
            <span>
              Showing {displayBookings.length}{" "}
              {displayBookings.length !== 1
                ? transactionPluralLabel.toLowerCase()
                : transactionLabel.toLowerCase()}
            </span>
            {activeTab === "pending" && pendingCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                {pendingCount} awaiting action
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
