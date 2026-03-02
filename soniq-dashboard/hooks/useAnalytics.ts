"use client";

import { useState, useEffect, useCallback } from "react";
import { get, getTenantId } from "@/lib/api/client";

// ============================================================================
// TYPES
// ============================================================================

export interface AnalyticsSummary {
  totalCalls: number;
  totalBookings: number;
  conversionRate: number;
  avgDurationSeconds: number;
}

export interface TimeSeriesPoint {
  date: string;
  calls: number;
  bookings: number;
  avgDuration: number;
}

export interface OutcomeData {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface PeakHour {
  hour: number;
  count: number;
}

export interface AnalyticsData {
  period: {
    days: number;
    startDate: string;
  };
  summary: AnalyticsSummary;
  timeSeries: TimeSeriesPoint[];
  outcomes: OutcomeData[];
  peakHours: PeakHour[];
}

// ============================================================================
// HOOK
// ============================================================================

export function useAnalytics(days: number = 30) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = getTenantId();

  const fetchAnalytics = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await get<AnalyticsData>("/api/calls/analytics", {
        days: days.toString(),
      });
      setData(result);
    } catch (err) {
      console.error("[Analytics] Fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [tenantId, days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}

// ============================================================================
// DASHBOARD STATS HOOK
// ============================================================================

export interface DashboardStats {
  calls: {
    today: number;
    week: number;
    month: number;
  };
  bookings: {
    today: number;
    week: number;
    month: number;
  };
  revenue: {
    today: number;
    week: number;
    month: number;
  };
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = getTenantId();

  const fetchStats = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await get<DashboardStats>("/api/dashboard/stats", {
        tenant_id: tenantId,
      });
      setStats(result);
    } catch (err) {
      console.error("[DashboardStats] Fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
