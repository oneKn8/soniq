// Engagement Score Calculator
// Calculates engagement level for contacts based on their activity

import { queryAll } from "../database/client.js";
import { updateOne } from "../database/query-helpers.js";

export interface EngagementMetrics {
  totalCalls: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  lastCallDate: Date | null;
  lastBookingDate: Date | null;
  avgCallDuration: number;
  responseRate: number;
  daysSinceLastContact: number;
}

export interface EngagementScore {
  score: number; // 0-100
  level: "cold" | "warm" | "hot" | "vip";
  metrics: EngagementMetrics;
  factors: EngagementFactor[];
}

export interface EngagementFactor {
  name: string;
  value: number;
  weight: number;
  contribution: number;
}

// Scoring weights (total = 100)
const WEIGHTS = {
  callFrequency: 20,
  bookingFrequency: 25,
  recency: 25,
  conversionRate: 20,
  loyalty: 10,
};

interface CallRow {
  created_at: string;
  duration_seconds: number | null;
  outcome_type: string | null;
}

interface BookingRow {
  created_at: string;
  status: string;
  booking_date: string;
}

interface ContactIdRow {
  id: string;
}

interface ContactRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  engagement_score: number | null;
}

/**
 * Calculate engagement score for a contact
 */
export async function calculateEngagementScore(
  contactId: string,
  tenantId: string,
): Promise<EngagementScore> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Get contact's calls
  const calls = await queryAll<CallRow>(
    `SELECT created_at, duration_seconds, outcome_type
     FROM calls
     WHERE contact_id = $1 AND tenant_id = $2
     ORDER BY created_at DESC`,
    [contactId, tenantId],
  );

  // Get contact's bookings
  const bookings = await queryAll<BookingRow>(
    `SELECT created_at, status, booking_date
     FROM bookings
     WHERE contact_id = $1 AND tenant_id = $2
     ORDER BY created_at DESC`,
    [contactId, tenantId],
  );

  // Calculate metrics
  const totalCalls = calls?.length || 0;
  const totalBookings = bookings?.length || 0;
  const completedBookings =
    bookings?.filter((b) => b.status === "completed").length || 0;
  const cancelledBookings =
    bookings?.filter((b) => b.status === "cancelled").length || 0;

  const lastCall = calls?.[0];
  const lastBooking = bookings?.[0];

  const lastCallDate = lastCall ? new Date(lastCall.created_at) : null;
  const lastBookingDate = lastBooking ? new Date(lastBooking.created_at) : null;

  const lastContactDate =
    lastCallDate && lastBookingDate
      ? lastCallDate > lastBookingDate
        ? lastCallDate
        : lastBookingDate
      : lastCallDate || lastBookingDate;

  const daysSinceLastContact = lastContactDate
    ? Math.floor(
        (now.getTime() - lastContactDate.getTime()) / (24 * 60 * 60 * 1000),
      )
    : 999;

  // Average call duration
  const completedCalls = calls?.filter((c) => c.duration_seconds) || [];
  const avgCallDuration =
    completedCalls.length > 0
      ? completedCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) /
        completedCalls.length
      : 0;

  // Recent calls (last 30 days)
  const recentCalls =
    calls?.filter((c) => new Date(c.created_at) >= thirtyDaysAgo).length || 0;

  // Response rate (calls that led to bookings)
  const bookingOutcomes =
    calls?.filter((c) => c.outcome_type === "booking").length || 0;
  const responseRate =
    totalCalls > 0 ? (bookingOutcomes / totalCalls) * 100 : 0;

  const metrics: EngagementMetrics = {
    totalCalls,
    totalBookings,
    completedBookings,
    cancelledBookings,
    lastCallDate,
    lastBookingDate,
    avgCallDuration,
    responseRate,
    daysSinceLastContact,
  };

  // Calculate factor scores
  const factors: EngagementFactor[] = [];

  // 1. Call Frequency Score (0-100)
  const callScore = Math.min(100, recentCalls * 25); // 4+ calls in 30 days = 100
  factors.push({
    name: "Call Frequency",
    value: recentCalls,
    weight: WEIGHTS.callFrequency,
    contribution: (callScore * WEIGHTS.callFrequency) / 100,
  });

  // 2. Booking Frequency Score (0-100)
  const recentBookings =
    bookings?.filter((b) => new Date(b.created_at) >= ninetyDaysAgo).length ||
    0;
  const bookingScore = Math.min(100, recentBookings * 33); // 3+ bookings in 90 days = 100
  factors.push({
    name: "Booking Frequency",
    value: recentBookings,
    weight: WEIGHTS.bookingFrequency,
    contribution: (bookingScore * WEIGHTS.bookingFrequency) / 100,
  });

  // 3. Recency Score (0-100)
  let recencyScore = 0;
  if (daysSinceLastContact <= 7) recencyScore = 100;
  else if (daysSinceLastContact <= 14) recencyScore = 80;
  else if (daysSinceLastContact <= 30) recencyScore = 60;
  else if (daysSinceLastContact <= 60) recencyScore = 40;
  else if (daysSinceLastContact <= 90) recencyScore = 20;
  else recencyScore = 0;

  factors.push({
    name: "Recency",
    value: daysSinceLastContact,
    weight: WEIGHTS.recency,
    contribution: (recencyScore * WEIGHTS.recency) / 100,
  });

  // 4. Conversion Rate Score (0-100)
  const conversionScore = Math.min(100, responseRate * 2); // 50%+ conversion = 100
  factors.push({
    name: "Conversion Rate",
    value: Math.round(responseRate),
    weight: WEIGHTS.conversionRate,
    contribution: (conversionScore * WEIGHTS.conversionRate) / 100,
  });

  // 5. Loyalty Score (0-100)
  const showRate =
    totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
  const loyaltyScore = Math.min(100, showRate);
  factors.push({
    name: "Loyalty",
    value: Math.round(showRate),
    weight: WEIGHTS.loyalty,
    contribution: (loyaltyScore * WEIGHTS.loyalty) / 100,
  });

  // Calculate total score
  const totalScore = Math.round(
    factors.reduce((sum, f) => sum + f.contribution, 0),
  );

  // Determine engagement level
  let level: EngagementScore["level"];
  if (totalScore >= 80) level = "vip";
  else if (totalScore >= 60) level = "hot";
  else if (totalScore >= 30) level = "warm";
  else level = "cold";

  return {
    score: totalScore,
    level,
    metrics,
    factors,
  };
}

/**
 * Batch update engagement scores for all contacts of a tenant
 */
export async function updateAllEngagementScores(tenantId: string): Promise<{
  updated: number;
  failed: number;
}> {
  // Get all contacts for tenant
  const contacts = await queryAll<ContactIdRow>(
    "SELECT id FROM contacts WHERE tenant_id = $1",
    [tenantId],
  );

  if (!contacts || contacts.length === 0) {
    console.error("[ENGAGEMENT] No contacts found for tenant:", tenantId);
    return { updated: 0, failed: 0 };
  }

  let updated = 0;
  let failed = 0;

  // Process in batches
  for (const contact of contacts) {
    try {
      const engagement = await calculateEngagementScore(contact.id, tenantId);

      await updateOne(
        "contacts",
        {
          engagement_score: engagement.score,
          engagement_level: engagement.level,
          engagement_updated_at: new Date().toISOString(),
        },
        { id: contact.id },
      );

      updated++;
    } catch (err) {
      console.error(
        `[ENGAGEMENT] Failed to update contact ${contact.id}:`,
        err,
      );
      failed++;
    }
  }

  return { updated, failed };
}

/**
 * Get contacts by engagement level
 */
export async function getContactsByEngagementLevel(
  tenantId: string,
  level: EngagementScore["level"],
  limit: number = 50,
): Promise<Array<{ id: string; name: string; score: number }>> {
  const data = await queryAll<ContactRow>(
    `SELECT id, first_name, last_name, engagement_score
     FROM contacts
     WHERE tenant_id = $1 AND engagement_level = $2
     ORDER BY engagement_score DESC
     LIMIT $3`,
    [tenantId, level, limit],
  );

  if (!data) {
    return [];
  }

  return data.map((c) => ({
    id: c.id,
    name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unknown",
    score: c.engagement_score || 0,
  }));
}
