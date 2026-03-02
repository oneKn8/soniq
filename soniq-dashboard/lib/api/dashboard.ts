/**
 * Dashboard API calls
 */

import { get } from "./client";
import type { DashboardMetrics, LogEntry } from "@/types";

// Types matching backend responses (prefixed with Api to avoid collision)

export interface ApiMetricsResponse {
  system: {
    status: "operational" | "degraded" | "down";
    latencyMs: number;
    uptimePercent: number;
    uptimeMs: number;
  };
  calls: {
    active: number;
    queued: number;
    today: number;
  };
  bookings: {
    today: number;
  };
  voice: {
    provider: "vapi" | "custom";
    sttStatus: "connected" | "disconnected" | "error";
    llmStatus: "connected" | "disconnected" | "error";
    ttsStatus: "connected" | "disconnected" | "error";
  };
  timestamp: string;
}

export interface ApiActivityLogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error" | "success";
  category: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface ApiActivityLogResponse {
  entries: ApiActivityLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiDashboardStats {
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
  timestamp: string;
}

export interface ApiVoiceSession {
  callSid: string;
  tenantId: string;
  callerPhone: string | null;
  isPlaying: boolean;
  isSpeaking: boolean;
  startTime: string;
  lastActivityTime: string;
  turnCount: number;
  durationSeconds: number;
}

export interface ApiVoiceSessionsResponse {
  sessions: ApiVoiceSession[];
  count: number;
}

/**
 * Transform API metrics to frontend DashboardMetrics format
 */
export function transformMetrics(
  apiMetrics: ApiMetricsResponse,
  apiStats: ApiDashboardStats,
): DashboardMetrics {
  return {
    system: {
      status:
        apiMetrics.system.status === "operational"
          ? "online"
          : apiMetrics.system.status === "degraded"
            ? "degraded"
            : "offline",
      latency: apiMetrics.system.latencyMs,
      uptime: apiMetrics.system.uptimePercent,
      activeCalls: apiMetrics.calls.active,
      queuedCalls: apiMetrics.calls.queued,
    },
    business: {
      revenueToday: apiStats.revenue.today,
      revenueWeek: apiStats.revenue.week,
      revenueMonth: apiStats.revenue.month,
      transactionsToday: apiStats.bookings.today,
      transactionsWeek: apiStats.bookings.week,
      conversionRate: 0.85, // Would need backend calculation
      avgTransactionValue:
        apiStats.revenue.today / (apiStats.bookings.today || 1),
      missedOpportunities: 0, // Would need backend tracking
    },
    calls: {
      totalToday: apiStats.calls.today,
      totalWeek: apiStats.calls.week,
      avgDuration: 180, // Would need backend calculation
      avgWaitTime: 5, // Would need backend calculation
      abandonRate: 2.5, // Would need backend calculation
    },
  };
}

/**
 * Transform API activity log to frontend LogEntry format
 */
export function transformLogEntry(entry: ApiActivityLogEntry): LogEntry {
  // Map API category to frontend LogCategory
  const categoryMap: Record<string, LogEntry["category"]> = {
    system: "SYSTEM",
    call: "CALL",
    intent: "INTENT",
    booking: "BOOKING",
    payment: "PAYMENT",
    transfer: "TRANSFER",
    error: "ERROR",
    security: "SECURITY",
  };

  return {
    id: entry.id,
    timestamp: entry.timestamp,
    level: entry.level.toUpperCase() as LogEntry["level"],
    category: categoryMap[entry.category.toLowerCase()] || "SYSTEM",
    message: entry.message,
    callId: entry.metadata?.callId as string | undefined,
  };
}

/**
 * Fetch real-time system metrics (raw API response)
 */
export async function fetchMetricsRaw(): Promise<ApiMetricsResponse> {
  return get<ApiMetricsResponse>("/api/dashboard/metrics");
}

/**
 * Fetch aggregated statistics (raw API response)
 */
export async function fetchStatsRaw(): Promise<ApiDashboardStats> {
  return get<ApiDashboardStats>("/api/dashboard/stats");
}

/**
 * Fetch and transform metrics to frontend format
 */
export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const [metrics, stats] = await Promise.all([
    fetchMetricsRaw(),
    fetchStatsRaw(),
  ]);

  return transformMetrics(metrics, stats);
}

/**
 * Fetch activity log entries (raw API response)
 */
export async function fetchActivityLogRaw(options?: {
  limit?: number;
  offset?: number;
  level?: "info" | "warning" | "error" | "success";
}): Promise<ApiActivityLogResponse> {
  const params: Record<string, string> = {};

  if (options?.limit) params.limit = options.limit.toString();
  if (options?.offset) params.offset = options.offset.toString();
  if (options?.level) params.level = options.level;

  return get<ApiActivityLogResponse>("/api/dashboard/activity", params);
}

/**
 * Fetch and transform activity log to frontend format
 */
export async function fetchActivityLog(options?: {
  limit?: number;
  offset?: number;
  level?: "info" | "warning" | "error" | "success";
}): Promise<{ entries: LogEntry[]; total: number }> {
  const response = await fetchActivityLogRaw(options);

  return {
    entries: response.entries.map(transformLogEntry),
    total: response.total,
  };
}

/**
 * Fetch active voice sessions
 */
export async function fetchVoiceSessions(): Promise<ApiVoiceSessionsResponse> {
  return get<ApiVoiceSessionsResponse>("/api/dashboard/sessions");
}

/**
 * Check if API is available
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    await get<{ status: string }>("/health");
    return true;
  } catch {
    return false;
  }
}
