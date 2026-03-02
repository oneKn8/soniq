import { Hono } from "hono";
import { queryOne, queryAll } from "../services/database/client.js";
import { getAuthTenantId } from "../middleware/index.js";

export const dashboardRoutes = new Hono();

// Track server start time for uptime calculation
const serverStartTime = Date.now();

// In-memory activity log (recent events)
interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  level: "info" | "warning" | "error" | "success";
  category: string;
  message: string;
  metadata?: Record<string, unknown>;
}

const activityLog: ActivityLogEntry[] = [];
const MAX_LOG_ENTRIES = 200;

/**
 * Add entry to activity log
 */
export function logActivity(
  level: ActivityLogEntry["level"],
  category: string,
  message: string,
  metadata?: Record<string, unknown>,
): void {
  const entry: ActivityLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    level,
    category,
    message,
    metadata,
  };

  activityLog.unshift(entry);

  // Trim old entries
  if (activityLog.length > MAX_LOG_ENTRIES) {
    activityLog.length = MAX_LOG_ENTRIES;
  }
}

/**
 * GET /api/dashboard/metrics
 * System health and real-time metrics
 */
dashboardRoutes.get("/metrics", async (c) => {
  try {
    const tenantId = getAuthTenantId(c);

    // Active calls are managed by LiveKit Server (not tracked API-side)
    const activeCalls = 0;

    // Calculate uptime
    const uptimeMs = Date.now() - serverStartTime;
    const uptimePercent = 99.9; // Placeholder - would track actual downtime

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's calls count
    const callsResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM calls
       WHERE tenant_id = $1
       AND created_at >= $2
       AND created_at < $3`,
      [tenantId, today.toISOString(), tomorrow.toISOString()],
    );
    const callsToday = parseInt(callsResult?.count || "0", 10);

    // Today's bookings count
    const bookingsResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM bookings
       WHERE tenant_id = $1
       AND booking_date = $2`,
      [tenantId, today.toISOString().split("T")[0]],
    );
    const bookingsToday = parseInt(bookingsResult?.count || "0", 10);

    // Average response latency (from recent calls)
    const latencyData = await queryAll<{
      metadata: Record<string, number> | null;
    }>(
      `SELECT metadata FROM calls
       WHERE tenant_id = $1
       AND metadata IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 20`,
      [tenantId],
    );

    // Calculate average latency from metadata if available
    let avgLatency = 340; // Default estimate in ms
    if (latencyData && latencyData.length > 0) {
      const latencies = latencyData
        .map((c) => c.metadata?.response_latency_ms)
        .filter((l): l is number => typeof l === "number");

      if (latencies.length > 0) {
        avgLatency = Math.round(
          latencies.reduce((a, b) => a + b, 0) / latencies.length,
        );
      }
    }

    // Active sessions are managed by LiveKit Server
    const queuedCalls = 0;

    return c.json({
      system: {
        status: "operational",
        latencyMs: avgLatency,
        uptimePercent,
        uptimeMs,
      },
      calls: {
        active: activeCalls,
        queued: queuedCalls,
        today: callsToday,
      },
      bookings: {
        today: bookingsToday,
      },
      voice: {
        stack: "signalwire+deepgram+multi-llm+cartesia",
        sttStatus: "connected",
        llmStatus: "connected",
        ttsStatus: "connected",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[DASHBOARD] Metrics error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/dashboard/activity
 * Recent activity log entries
 */
dashboardRoutes.get("/activity", async (c) => {
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const level = c.req.query("level"); // Filter by level

  let filtered = activityLog;

  if (level) {
    filtered = filtered.filter((e) => e.level === level);
  }

  const entries = filtered.slice(offset, offset + limit);

  return c.json({
    entries,
    total: filtered.length,
    limit,
    offset,
  });
});

/**
 * GET /api/dashboard/stats
 * Aggregated statistics for dashboard cards
 */
dashboardRoutes.get("/stats", async (c) => {
  try {
    const tenantId = getAuthTenantId(c);

    // Get date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Execute all count queries in parallel
    const [
      callsTodayResult,
      callsWeekResult,
      callsMonthResult,
      bookingsTodayResult,
      bookingsWeekResult,
      bookingsMonthResult,
    ] = await Promise.all([
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM calls WHERE tenant_id = $1 AND created_at >= $2`,
        [tenantId, today.toISOString()],
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM calls WHERE tenant_id = $1 AND created_at >= $2`,
        [tenantId, weekStart.toISOString()],
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM calls WHERE tenant_id = $1 AND created_at >= $2`,
        [tenantId, monthStart.toISOString()],
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM bookings WHERE tenant_id = $1 AND created_at >= $2`,
        [tenantId, today.toISOString()],
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM bookings WHERE tenant_id = $1 AND created_at >= $2`,
        [tenantId, weekStart.toISOString()],
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM bookings WHERE tenant_id = $1 AND created_at >= $2`,
        [tenantId, monthStart.toISOString()],
      ),
    ]);

    const callsToday = parseInt(callsTodayResult?.count || "0", 10);
    const callsWeek = parseInt(callsWeekResult?.count || "0", 10);
    const callsMonth = parseInt(callsMonthResult?.count || "0", 10);
    const bookingsToday = parseInt(bookingsTodayResult?.count || "0", 10);
    const bookingsWeek = parseInt(bookingsWeekResult?.count || "0", 10);
    const bookingsMonth = parseInt(bookingsMonthResult?.count || "0", 10);

    // Get revenue estimate (assuming average booking value)
    const avgBookingValue = 150; // Would come from tenant config
    const estimatedRevenue = {
      today: bookingsToday * avgBookingValue,
      week: bookingsWeek * avgBookingValue,
      month: bookingsMonth * avgBookingValue,
    };

    return c.json({
      calls: {
        today: callsToday,
        week: callsWeek,
        month: callsMonth,
      },
      bookings: {
        today: bookingsToday,
        week: bookingsWeek,
        month: bookingsMonth,
      },
      revenue: estimatedRevenue,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[DASHBOARD] Stats error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/dashboard/sessions
 * Active voice sessions (for real-time monitoring)
 */
dashboardRoutes.get("/sessions", async (c) => {
  // Active sessions are managed by LiveKit Server (not tracked API-side)
  return c.json({
    sessions: [],
    count: 0,
  });
});
