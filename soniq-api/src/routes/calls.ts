import { Hono } from "hono";
import { tenantQueryOne, tenantQueryAll } from "../services/database/client.js";
import { getAuthTenantId } from "../middleware/index.js";

export const callsRoutes = new Hono();

// Row types
interface CallRow {
  id: string;
  tenant_id: string;
  vapi_call_id: string | null;
  direction: string;
  status: string;
  caller_phone: string | null;
  caller_name: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  outcome_type: string | null;
  summary: string | null;
  sentiment_score: number | null;
  intents_detected: string[] | null;
  recording_url: string | null;
  transcript: unknown;
  metadata: Record<string, unknown> | null;
  contact_id: string | null;
  booking_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ContactRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
}

interface BookingRow {
  id: string;
  booking_date: string;
  booking_time: string;
  booking_type: string | null;
  status: string;
  confirmation_code: string | null;
}

/**
 * GET /api/calls
 * List calls with filters
 */
callsRoutes.get("/", async (c) => {
  try {
    const tenantId = getAuthTenantId(c);
    const status = c.req.query("status");
    const outcome = c.req.query("outcome");
    const startDate = c.req.query("start_date");
    const endDate = c.req.query("end_date");
    const search = c.req.query("search");
    const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
    const offset = parseInt(c.req.query("offset") || "0", 10);

    // Build WHERE conditions
    const conditions: string[] = ["tenant_id = $1"];
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (outcome) {
      conditions.push(`outcome_type = $${paramIndex++}`);
      params.push(outcome);
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    if (search) {
      conditions.push(
        `(caller_phone ILIKE $${paramIndex} OR caller_name ILIKE $${paramIndex})`,
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Get total count (RLS + app-level WHERE as defense-in-depth)
    const countResult = await tenantQueryOne<{ count: string }>(
      tenantId,
      `SELECT COUNT(*) as count FROM calls ${whereClause}`,
      params,
    );
    const total = parseInt(countResult?.count || "0", 10);

    // Get data with pagination
    const data = await tenantQueryAll<CallRow>(
      tenantId,
      `SELECT
        id,
        vapi_call_id,
        direction,
        status,
        caller_phone,
        caller_name,
        started_at,
        ended_at,
        duration_seconds,
        outcome_type,
        summary,
        sentiment_score,
        intents_detected,
        recording_url,
        created_at
       FROM calls ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    );

    return c.json({
      calls: data || [],
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[CALLS] List error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/calls/stats
 * Get call statistics
 */
callsRoutes.get("/stats", async (c) => {
  try {
    const tenantId = getAuthTenantId(c);

    // Date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Execute all queries in parallel
    const [
      callsTodayResult,
      callsWeekResult,
      callsMonthResult,
      durationData,
      outcomeData,
    ] = await Promise.all([
      // Today's calls
      tenantQueryOne<{ count: string }>(
        tenantId,
        `SELECT COUNT(*) as count FROM calls
         WHERE tenant_id = $1 AND created_at >= $2 AND created_at < $3`,
        [tenantId, today.toISOString(), tomorrow.toISOString()],
      ),
      // This week's calls
      tenantQueryOne<{ count: string }>(
        tenantId,
        `SELECT COUNT(*) as count FROM calls
         WHERE tenant_id = $1 AND created_at >= $2`,
        [tenantId, weekStart.toISOString()],
      ),
      // This month's calls
      tenantQueryOne<{ count: string }>(
        tenantId,
        `SELECT COUNT(*) as count FROM calls
         WHERE tenant_id = $1 AND created_at >= $2`,
        [tenantId, monthStart.toISOString()],
      ),
      // Average duration (last 100 completed calls)
      tenantQueryAll<{ duration_seconds: number }>(
        tenantId,
        `SELECT duration_seconds FROM calls
         WHERE tenant_id = $1 AND status = 'completed' AND duration_seconds IS NOT NULL
         ORDER BY created_at DESC LIMIT 100`,
        [tenantId],
      ),
      // Outcome breakdown (last 30 days)
      tenantQueryAll<{ outcome_type: string | null }>(
        tenantId,
        `SELECT outcome_type FROM calls
         WHERE tenant_id = $1 AND created_at >= $2 AND outcome_type IS NOT NULL`,
        [tenantId, thirtyDaysAgo.toISOString()],
      ),
    ]);

    const callsToday = parseInt(callsTodayResult?.count || "0", 10);
    const callsWeek = parseInt(callsWeekResult?.count || "0", 10);
    const callsMonth = parseInt(callsMonthResult?.count || "0", 10);

    const avgDuration =
      durationData && durationData.length > 0
        ? durationData.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) /
          durationData.length
        : 0;

    const outcomes: Record<string, number> = {};
    outcomeData?.forEach((call) => {
      const outcome = call.outcome_type || "unknown";
      outcomes[outcome] = (outcomes[outcome] || 0) + 1;
    });

    return c.json({
      callsToday,
      callsWeek,
      callsMonth,
      avgDurationSeconds: Math.round(avgDuration),
      outcomes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/calls/analytics
 * Get call analytics for charts (time series and breakdown)
 */
callsRoutes.get("/analytics", async (c) => {
  try {
    const tenantId = getAuthTenantId(c);
    const days = parseInt(c.req.query("days") || "30", 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get all calls in date range
    const calls = await tenantQueryAll<{
      created_at: string;
      outcome_type: string | null;
      duration_seconds: number | null;
      status: string;
    }>(
      tenantId,
      `SELECT created_at, outcome_type, duration_seconds, status FROM calls
       WHERE tenant_id = $1 AND created_at >= $2
       ORDER BY created_at ASC`,
      [tenantId, startDate.toISOString()],
    );

    if (!calls) {
      return c.json({ error: "Failed to fetch calls" }, 500);
    }

    // Group by date
    const dailyData: Record<
      string,
      {
        date: string;
        calls: number;
        bookings: number;
        avgDuration: number;
        durations: number[];
      }
    > = {};

    calls.forEach((call) => {
      const date = new Date(call.created_at).toISOString().split("T")[0];
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          calls: 0,
          bookings: 0,
          avgDuration: 0,
          durations: [],
        };
      }
      dailyData[date].calls++;
      if (call.outcome_type === "booking") {
        dailyData[date].bookings++;
      }
      if (call.duration_seconds) {
        dailyData[date].durations.push(call.duration_seconds);
      }
    });

    // Calculate averages and create array
    const timeSeries = Object.values(dailyData).map((day) => ({
      date: day.date,
      calls: day.calls,
      bookings: day.bookings,
      avgDuration:
        day.durations.length > 0
          ? Math.round(
              day.durations.reduce((a, b) => a + b, 0) / day.durations.length,
            )
          : 0,
    }));

    // Outcome breakdown
    const outcomes: Record<string, number> = {};
    calls.forEach((call) => {
      const outcome = call.outcome_type || "unknown";
      outcomes[outcome] = (outcomes[outcome] || 0) + 1;
    });

    const outcomeSeries = Object.entries(outcomes).map(([name, value]) => ({
      name,
      value,
    }));

    // Calculate totals
    const totalCalls = calls.length;
    const totalBookings = calls.filter(
      (c) => c.outcome_type === "booking",
    ).length;
    const conversionRate =
      totalCalls > 0 ? (totalBookings / totalCalls) * 100 : 0;
    const completedCalls = calls.filter((c) => c.duration_seconds);
    const avgDuration =
      completedCalls.length > 0
        ? completedCalls.reduce(
            (sum, c) => sum + (c.duration_seconds || 0),
            0,
          ) / completedCalls.length
        : 0;

    // Peak hours analysis
    const hourCounts: Record<number, number> = {};
    calls.forEach((call) => {
      const hour = new Date(call.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return c.json({
      period: { days, startDate: startDate.toISOString() },
      summary: {
        totalCalls,
        totalBookings,
        conversionRate: Math.round(conversionRate * 10) / 10,
        avgDurationSeconds: Math.round(avgDuration),
      },
      timeSeries,
      outcomes: outcomeSeries,
      peakHours,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/calls/recent
 * Get most recent calls (for dashboard)
 */
callsRoutes.get("/recent", async (c) => {
  try {
    const tenantId = getAuthTenantId(c);
    const limit = Math.min(parseInt(c.req.query("limit") || "10", 10), 50);

    const data = await tenantQueryAll<CallRow>(
      tenantId,
      `SELECT
        id,
        caller_phone,
        caller_name,
        duration_seconds,
        outcome_type,
        summary,
        created_at
       FROM calls
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [tenantId, limit],
    );

    return c.json({ calls: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/calls/:id
 * Get call details with transcript
 */
callsRoutes.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const tenantId = getAuthTenantId(c);

    const data = await tenantQueryOne<CallRow>(
      tenantId,
      `SELECT * FROM calls WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );

    if (!data) {
      return c.json({ error: "Call not found" }, 404);
    }

    // Get linked contact if exists
    let contact: ContactRow | null = null;
    if (data.contact_id) {
      contact = await tenantQueryOne<ContactRow>(
        tenantId,
        `SELECT id, first_name, last_name, phone, email FROM contacts WHERE id = $1`,
        [data.contact_id],
      );
    }

    // Get linked booking if exists
    let booking: BookingRow | null = null;
    if (data.booking_id) {
      booking = await tenantQueryOne<BookingRow>(
        tenantId,
        `SELECT id, booking_date, booking_time, booking_type, status, confirmation_code
         FROM bookings WHERE id = $1`,
        [data.booking_id],
      );
    }

    return c.json({
      ...data,
      contact,
      booking,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/calls/:id/transcript
 * Get call transcript
 */
callsRoutes.get("/:id/transcript", async (c) => {
  try {
    const id = c.req.param("id");
    const tenantId = getAuthTenantId(c);

    const data = await tenantQueryOne<{
      id: string;
      transcript: unknown;
      summary: string | null;
    }>(
      tenantId,
      `SELECT id, transcript, summary FROM calls WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );

    if (!data) {
      return c.json({ error: "Call not found" }, 404);
    }

    // Parse transcript if it's a string
    let transcript = data.transcript;
    if (typeof transcript === "string") {
      try {
        transcript = JSON.parse(transcript);
      } catch {
        // Keep as string if not valid JSON
      }
    }

    return c.json({
      id: data.id,
      transcript,
      summary: data.summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});
