// Engagement Score Calculation Job
import { queryAll, queryOne } from "../services/database/client.js";
import { updateOne } from "../services/database/query-helpers.js";

interface TenantId {
  id: string;
}

interface ContactForEngagement {
  id: string;
  last_contact_at: string | null;
  total_bookings: number | null;
  total_completed_bookings: number | null;
  total_no_shows: number | null;
  lifetime_value_cents: number | null;
}

interface ContactWithTenant extends ContactForEngagement {
  tenant_id: string;
}

/**
 * Update engagement scores for all contacts across all tenants
 *
 * Engagement score (0-100) is based on:
 * - Recency: Last contact within 30 days (+30 points)
 * - Frequency: Number of bookings (+up to 30 points)
 * - Completion: Completion rate (+up to 20 points)
 * - Value: Lifetime value (+up to 20 points)
 */
export async function updateAllEngagementScores(): Promise<void> {
  // Get all active tenants
  const tenants = await queryAll<TenantId>(
    `SELECT id FROM tenants WHERE is_active = $1`,
    [true],
  );

  if (tenants.length === 0) {
    return;
  }

  for (const tenant of tenants) {
    try {
      await updateTenantEngagementScores(tenant.id);
    } catch (err) {
      console.error(`[ENGAGEMENT] Failed for tenant ${tenant.id}:`, err);
    }
  }
}

async function updateTenantEngagementScores(tenantId: string): Promise<void> {
  // Get all contacts for this tenant
  const contacts = await queryAll<ContactForEngagement>(
    `SELECT id, last_contact_at, total_bookings, total_completed_bookings,
            total_no_shows, lifetime_value_cents
     FROM contacts
     WHERE tenant_id = $1 AND status = $2`,
    [tenantId, "active"],
  );

  if (contacts.length === 0) return;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  for (const contact of contacts) {
    const score = calculateEngagementScore(contact, thirtyDaysAgo);

    // Update contact
    await updateOne(
      "contacts",
      { engagement_score: score },
      { id: contact.id },
    );
  }
}

/**
 * Calculate engagement score from contact data
 */
function calculateEngagementScore(
  contact: ContactForEngagement,
  thirtyDaysAgo: Date,
): number {
  let score = 0;

  // Recency score (30 points max)
  if (contact.last_contact_at) {
    const lastContact = new Date(contact.last_contact_at);
    if (lastContact > thirtyDaysAgo) {
      const daysAgo =
        (Date.now() - lastContact.getTime()) / (24 * 60 * 60 * 1000);
      score += Math.max(0, 30 - daysAgo); // More recent = higher score
    }
  }

  // Frequency score (30 points max)
  const bookings = contact.total_bookings || 0;
  score += Math.min(30, bookings * 5); // 5 points per booking, max 30

  // Completion rate score (20 points max)
  if (bookings > 0) {
    const completed = contact.total_completed_bookings || 0;
    const noShows = contact.total_no_shows || 0;
    const completionRate = completed / bookings;
    const noShowPenalty = noShows * 5;
    score += Math.max(0, completionRate * 20 - noShowPenalty);
  }

  // Value score (20 points max)
  const value = contact.lifetime_value_cents || 0;
  if (value > 0) {
    // $500+ = full 20 points, scales down linearly
    score += Math.min(20, value / 2500);
  }

  // Round and clamp
  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Recalculate engagement score for a single contact
 */
export async function recalculateEngagementScore(
  contactId: string,
): Promise<number> {
  const contact = await queryOne<ContactWithTenant>(
    `SELECT id, tenant_id, last_contact_at, total_bookings,
            total_completed_bookings, total_no_shows, lifetime_value_cents
     FROM contacts
     WHERE id = $1`,
    [contactId],
  );

  if (!contact) return 0;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const finalScore = calculateEngagementScore(contact, thirtyDaysAgo);

  await updateOne(
    "contacts",
    { engagement_score: finalScore },
    { id: contactId },
  );

  return finalScore;
}
