// Contact Service - Core CRM operations
// Handles CRUD, search, lookup, metrics, and bulk operations

import { queryOne, queryAll } from "../database/client.js";
import {
  insertOne,
  updateOne,
  updateMany,
  rpc,
  paginatedQuery,
} from "../database/query-helpers.js";
import { contactCache } from "./contact-cache";
import { normalizePhoneNumber } from "./phone-utils";
import {
  Contact,
  ContactNote,
  ContactActivity,
  CreateContactInput,
  UpdateContactInput,
  CreateNoteInput,
  ContactFilters,
  PaginationParams,
  PaginatedResult,
  ActivityType,
  ImportResult,
  ContactImportRecord,
} from "../../types/crm";

// ============================================================================
// CORE CRUD
// ============================================================================

/**
 * Create a new contact
 */
export async function createContact(
  tenantId: string,
  input: CreateContactInput,
): Promise<Contact> {
  const phoneNormalized = normalizePhoneNumber(input.phone);

  try {
    const data = await insertOne<Contact>("contacts", {
      tenant_id: tenantId,
      phone: input.phone,
      phone_normalized: phoneNormalized,
      email: input.email?.toLowerCase().trim(),
      name: input.name,
      first_name: input.first_name,
      last_name: input.last_name,
      company: input.company,
      source: input.source || "manual",
      source_details: input.source_details || {},
      tags: input.tags || [],
      notes: input.notes,
      custom_fields: input.custom_fields || {},
      status: "active",
      lead_status: "new",
    });

    // Cache the new contact
    contactCache.set(tenantId, phoneNormalized, data);

    // Log activity
    await addActivity(tenantId, data.id, "imported", {
      description: `Contact created via ${input.source || "manual"}`,
    });

    return data;
  } catch (error) {
    // Check for unique constraint violation
    if (
      error instanceof Error &&
      (error as { code?: string }).code === "23505"
    ) {
      throw new Error(`Contact with phone ${input.phone} already exists`);
    }
    throw error;
  }
}

/**
 * Get a contact by ID
 */
export async function getContact(
  tenantId: string,
  contactId: string,
): Promise<Contact | null> {
  const data = await queryOne<Contact>(
    "SELECT * FROM contacts WHERE tenant_id = $1 AND id = $2",
    [tenantId, contactId],
  );

  return data;
}

/**
 * Update a contact
 */
export async function updateContact(
  tenantId: string,
  contactId: string,
  input: UpdateContactInput,
): Promise<Contact> {
  // Get current contact for activity logging
  const current = await getContact(tenantId, contactId);
  if (!current) {
    throw new Error("Contact not found");
  }

  const updateData: Record<string, unknown> = {};

  // Only include fields that are provided
  if (input.email !== undefined)
    updateData.email = input.email?.toLowerCase().trim();
  if (input.name !== undefined) updateData.name = input.name;
  if (input.first_name !== undefined) updateData.first_name = input.first_name;
  if (input.last_name !== undefined) updateData.last_name = input.last_name;
  if (input.company !== undefined) updateData.company = input.company;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.lead_status !== undefined)
    updateData.lead_status = input.lead_status;
  if (input.preferred_contact_method !== undefined)
    updateData.preferred_contact_method = input.preferred_contact_method;
  if (input.preferred_contact_time !== undefined)
    updateData.preferred_contact_time = input.preferred_contact_time;
  if (input.preferred_language !== undefined)
    updateData.preferred_language = input.preferred_language;
  if (input.timezone !== undefined) updateData.timezone = input.timezone;
  if (input.do_not_call !== undefined)
    updateData.do_not_call = input.do_not_call;
  if (input.do_not_sms !== undefined) updateData.do_not_sms = input.do_not_sms;
  if (input.do_not_email !== undefined)
    updateData.do_not_email = input.do_not_email;
  if (input.marketing_opt_in !== undefined) {
    updateData.marketing_opt_in = input.marketing_opt_in;
    if (input.marketing_opt_in) {
      updateData.marketing_opt_in_at = new Date().toISOString();
    }
  }
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.custom_fields !== undefined)
    updateData.custom_fields = input.custom_fields;

  const data = await updateOne<Contact>("contacts", updateData, {
    tenant_id: tenantId,
    id: contactId,
  });

  if (!data) {
    throw new Error("Failed to update contact");
  }

  // Invalidate cache
  contactCache.invalidate(tenantId, current.phone_normalized);

  // Log status change if applicable
  if (input.status && input.status !== current.status) {
    await addActivity(tenantId, contactId, "status_changed", {
      description: `Status changed from ${current.status} to ${input.status}`,
      metadata: { old_status: current.status, new_status: input.status },
    });
  }

  return data;
}

/**
 * Soft delete a contact (set status to inactive)
 */
export async function deleteContact(
  tenantId: string,
  contactId: string,
): Promise<void> {
  const current = await getContact(tenantId, contactId);
  if (!current) {
    throw new Error("Contact not found");
  }

  await updateMany(
    "contacts",
    { status: "inactive" },
    { tenant_id: tenantId, id: contactId },
  );

  // Invalidate cache
  contactCache.invalidate(tenantId, current.phone_normalized);

  // Log activity
  await addActivity(tenantId, contactId, "status_changed", {
    description: "Contact archived",
    metadata: { old_status: current.status, new_status: "inactive" },
  });
}

// ============================================================================
// LOOKUP
// ============================================================================

/**
 * Find or create a contact by phone number
 * Critical for voice agent performance - uses cache
 */
export async function findOrCreateByPhone(
  tenantId: string,
  phone: string,
  data?: Partial<CreateContactInput>,
): Promise<Contact> {
  const phoneNormalized = normalizePhoneNumber(phone);

  // Check cache first
  const cached = contactCache.get(tenantId, phoneNormalized);
  if (cached) {
    return cached;
  }

  // Lookup in database
  const existing = await lookupByPhone(tenantId, phone);
  if (existing) {
    contactCache.set(tenantId, phoneNormalized, existing);
    return existing;
  }

  // Create new contact
  const contact = await createContact(tenantId, {
    phone,
    source: data?.source || "call",
    name: data?.name,
    email: data?.email,
    first_name: data?.first_name,
    last_name: data?.last_name,
    company: data?.company,
    source_details: data?.source_details,
    tags: data?.tags,
    notes: data?.notes,
    custom_fields: data?.custom_fields,
  });

  return contact;
}

/**
 * Lookup contact by phone number
 * Uses cache for voice agent performance (<50ms target)
 */
export async function lookupByPhone(
  tenantId: string,
  phone: string,
): Promise<Contact | null> {
  const phoneNormalized = normalizePhoneNumber(phone);

  // Check cache first
  const cached = contactCache.get(tenantId, phoneNormalized);
  if (cached) {
    return cached;
  }

  const data = await queryOne<Contact>(
    "SELECT * FROM contacts WHERE tenant_id = $1 AND phone_normalized = $2",
    [tenantId, phoneNormalized],
  );

  // Cache the result
  if (data) {
    contactCache.set(tenantId, phoneNormalized, data);
  }

  return data;
}

/**
 * Lookup contact by email
 */
export async function lookupByEmail(
  tenantId: string,
  email: string,
): Promise<Contact | null> {
  const data = await queryOne<Contact>(
    "SELECT * FROM contacts WHERE tenant_id = $1 AND email = $2",
    [tenantId, email.toLowerCase().trim()],
  );

  return data;
}

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Search contacts with filters and pagination
 */
export async function searchContacts(
  tenantId: string,
  filters: ContactFilters = {},
  pagination: PaginationParams = {},
): Promise<PaginatedResult<Contact>> {
  const limit = pagination.limit || 20;
  const offset = pagination.offset || 0;
  const sortBy = pagination.sort_by || "last_contact_at";
  const sortOrder = pagination.sort_order || "desc";

  // Build dynamic WHERE clause
  const conditions: string[] = ["tenant_id = $1"];
  const params: unknown[] = [tenantId];
  let paramIndex = 2;

  // Search filter (name, email, phone)
  if (filters.search) {
    const searchPattern = `%${filters.search}%`;
    conditions.push(
      `(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`,
    );
    params.push(searchPattern);
    paramIndex++;
  }

  // Status filter
  if (filters.status) {
    const statuses = Array.isArray(filters.status)
      ? filters.status
      : [filters.status];
    conditions.push(`status = ANY($${paramIndex})`);
    params.push(statuses);
    paramIndex++;
  }

  // Lead status filter
  if (filters.lead_status) {
    const leadStatuses = Array.isArray(filters.lead_status)
      ? filters.lead_status
      : [filters.lead_status];
    conditions.push(`lead_status = ANY($${paramIndex})`);
    params.push(leadStatuses);
    paramIndex++;
  }

  // Tags filter (array overlap)
  if (filters.tags && filters.tags.length > 0) {
    conditions.push(`tags && $${paramIndex}`);
    params.push(filters.tags);
    paramIndex++;
  }

  // Source filter
  if (filters.source) {
    const sources = Array.isArray(filters.source)
      ? filters.source
      : [filters.source];
    conditions.push(`source = ANY($${paramIndex})`);
    params.push(sources);
    paramIndex++;
  }

  // Has bookings filter
  if (filters.has_bookings !== undefined) {
    if (filters.has_bookings) {
      conditions.push("total_bookings > 0");
    } else {
      conditions.push("total_bookings = 0");
    }
  }

  // Has calls filter
  if (filters.has_calls !== undefined) {
    if (filters.has_calls) {
      conditions.push("total_calls > 0");
    } else {
      conditions.push("total_calls = 0");
    }
  }

  // Date filters
  if (filters.created_after) {
    conditions.push(`created_at >= $${paramIndex}`);
    params.push(filters.created_after);
    paramIndex++;
  }

  if (filters.created_before) {
    conditions.push(`created_at <= $${paramIndex}`);
    params.push(filters.created_before);
    paramIndex++;
  }

  if (filters.last_contact_after) {
    conditions.push(`last_contact_at >= $${paramIndex}`);
    params.push(filters.last_contact_after);
    paramIndex++;
  }

  if (filters.last_contact_before) {
    conditions.push(`last_contact_at <= $${paramIndex}`);
    params.push(filters.last_contact_before);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  // Use paginatedQuery with raw WHERE clause
  return paginatedQuery<Contact>("contacts", {
    select: "*",
    whereRaw: { clause: whereClause, params },
    orderBy: sortBy,
    orderDir: sortOrder,
    limit,
    offset,
  });
}

// ============================================================================
// HISTORY & ACTIVITY
// ============================================================================

/**
 * Get contact activity history
 */
export async function getContactHistory(
  tenantId: string,
  contactId: string,
  pagination: PaginationParams = {},
): Promise<PaginatedResult<ContactActivity>> {
  const limit = pagination.limit || 50;
  const offset = pagination.offset || 0;

  return paginatedQuery<ContactActivity>("contact_activity", {
    select: "*",
    where: { tenant_id: tenantId, contact_id: contactId },
    orderBy: "created_at",
    orderDir: "desc",
    limit,
    offset,
  });
}

/**
 * Add activity to contact timeline
 */
export async function addActivity(
  tenantId: string,
  contactId: string,
  activityType: ActivityType,
  details: {
    description?: string;
    metadata?: Record<string, unknown>;
    relatedId?: string;
    relatedType?: string;
    performedBy?: string;
  } = {},
): Promise<ContactActivity> {
  const data = await insertOne<ContactActivity>("contact_activity", {
    tenant_id: tenantId,
    contact_id: contactId,
    activity_type: activityType,
    description: details.description,
    metadata: details.metadata || {},
    related_id: details.relatedId,
    related_type: details.relatedType,
    performed_by: details.performedBy,
  });

  return data;
}

// ============================================================================
// METRICS
// ============================================================================

/**
 * Update contact metrics after an event
 */
export async function updateMetrics(
  tenantId: string,
  contactId: string,
  event:
    | "call"
    | "booking"
    | "booking_completed"
    | "booking_cancelled"
    | "no_show"
    | "sms"
    | "email",
  amount?: number,
): Promise<void> {
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = {
    last_contact_at: now,
  };

  switch (event) {
    case "call":
      // Handled by database trigger, but update last_call_at
      updates.last_call_at = now;
      break;
    case "booking":
      updates.last_booking_at = now;
      break;
    case "booking_completed":
      // Use RPC for incrementing
      await rpc("increment_contact_metric", {
        p_contact_id: contactId,
        p_field: "total_completed_bookings",
        p_amount: 1,
      });
      if (amount) {
        await rpc("increment_contact_metric", {
          p_contact_id: contactId,
          p_field: "lifetime_value_cents",
          p_amount: amount,
        });
      }
      return;
    case "booking_cancelled":
      await rpc("increment_contact_metric", {
        p_contact_id: contactId,
        p_field: "total_cancelled_bookings",
        p_amount: 1,
      });
      return;
    case "no_show":
      await rpc("increment_contact_metric", {
        p_contact_id: contactId,
        p_field: "total_no_shows",
        p_amount: 1,
      });
      return;
    case "sms":
      await rpc("increment_contact_metric", {
        p_contact_id: contactId,
        p_field: "total_sms_sent",
        p_amount: 1,
      });
      return;
    case "email":
      await rpc("increment_contact_metric", {
        p_contact_id: contactId,
        p_field: "total_emails_sent",
        p_amount: 1,
      });
      return;
  }

  try {
    await updateMany("contacts", updates, {
      tenant_id: tenantId,
      id: contactId,
    });
  } catch (error) {
    console.error(
      `Failed to update contact metrics: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Engagement level type
 */
export type EngagementLevel = "cold" | "warm" | "hot" | "vip";

/**
 * Engagement factor breakdown
 */
export interface EngagementFactor {
  name: string;
  value: number;
  weight: number;
  contribution: number;
}

/**
 * Full engagement score result
 */
export interface EngagementResult {
  score: number;
  level: EngagementLevel;
  factors: EngagementFactor[];
}

// Scoring weights (total = 100)
const ENGAGEMENT_WEIGHTS = {
  recency: 25,
  callFrequency: 15,
  bookingFrequency: 20,
  conversionRate: 15,
  loyalty: 15,
  lifetimeValue: 10,
};

/**
 * Recalculate engagement score with detailed breakdown
 */
export async function recalculateEngagementScore(
  tenantId: string,
  contactId: string,
): Promise<number> {
  const result = await calculateEngagementDetails(tenantId, contactId);
  return result.score;
}

/**
 * Calculate detailed engagement score with factor breakdown
 */
export async function calculateEngagementDetails(
  tenantId: string,
  contactId: string,
): Promise<EngagementResult> {
  const contact = await getContact(tenantId, contactId);

  if (!contact) {
    throw new Error("Contact not found");
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Get recent calls
  const recentCalls = await queryAll<{
    created_at: string;
    outcome_type: string;
  }>(
    `SELECT created_at, outcome_type FROM calls
     WHERE contact_id = $1 AND tenant_id = $2 AND created_at >= $3`,
    [contactId, tenantId, thirtyDaysAgo.toISOString()],
  );

  // Get recent bookings
  const recentBookings = await queryAll<{ created_at: string; status: string }>(
    `SELECT created_at, status FROM bookings
     WHERE contact_id = $1 AND tenant_id = $2 AND created_at >= $3`,
    [contactId, tenantId, ninetyDaysAgo.toISOString()],
  );

  const factors: EngagementFactor[] = [];

  // 1. Recency Score (0-100)
  let recencyScore = 0;
  if (contact.last_contact_at) {
    const daysSince = Math.floor(
      (now.getTime() - new Date(contact.last_contact_at).getTime()) /
        (24 * 60 * 60 * 1000),
    );
    if (daysSince <= 7) recencyScore = 100;
    else if (daysSince <= 14) recencyScore = 80;
    else if (daysSince <= 30) recencyScore = 60;
    else if (daysSince <= 60) recencyScore = 40;
    else if (daysSince <= 90) recencyScore = 20;
  }
  factors.push({
    name: "Recency",
    value: recencyScore,
    weight: ENGAGEMENT_WEIGHTS.recency,
    contribution: (recencyScore * ENGAGEMENT_WEIGHTS.recency) / 100,
  });

  // 2. Call Frequency Score
  const recentCallCount = recentCalls?.length || 0;
  const callScore = Math.min(100, recentCallCount * 25);
  factors.push({
    name: "Call Frequency",
    value: recentCallCount,
    weight: ENGAGEMENT_WEIGHTS.callFrequency,
    contribution: (callScore * ENGAGEMENT_WEIGHTS.callFrequency) / 100,
  });

  // 3. Booking Frequency Score
  const recentBookingCount = recentBookings?.length || 0;
  const bookingScore = Math.min(100, recentBookingCount * 33);
  factors.push({
    name: "Booking Frequency",
    value: recentBookingCount,
    weight: ENGAGEMENT_WEIGHTS.bookingFrequency,
    contribution: (bookingScore * ENGAGEMENT_WEIGHTS.bookingFrequency) / 100,
  });

  // 4. Conversion Rate
  const bookingOutcomes =
    recentCalls?.filter((c) => c.outcome_type === "booking").length || 0;
  const conversionRate =
    recentCallCount > 0 ? (bookingOutcomes / recentCallCount) * 100 : 0;
  const conversionScore = Math.min(100, conversionRate * 2);
  factors.push({
    name: "Conversion Rate",
    value: Math.round(conversionRate),
    weight: ENGAGEMENT_WEIGHTS.conversionRate,
    contribution: (conversionScore * ENGAGEMENT_WEIGHTS.conversionRate) / 100,
  });

  // 5. Loyalty (show rate)
  const showRate =
    contact.total_bookings > 0
      ? (contact.total_completed_bookings / contact.total_bookings) * 100
      : 0;
  const loyaltyScore = Math.min(100, showRate);
  factors.push({
    name: "Loyalty",
    value: Math.round(showRate),
    weight: ENGAGEMENT_WEIGHTS.loyalty,
    contribution: (loyaltyScore * ENGAGEMENT_WEIGHTS.loyalty) / 100,
  });

  // 6. Lifetime Value
  let valueScore = 0;
  if (contact.lifetime_value_cents >= 100000) valueScore = 100;
  else if (contact.lifetime_value_cents >= 50000) valueScore = 80;
  else if (contact.lifetime_value_cents >= 20000) valueScore = 60;
  else if (contact.lifetime_value_cents >= 5000) valueScore = 40;
  else if (contact.lifetime_value_cents >= 1000) valueScore = 20;
  factors.push({
    name: "Lifetime Value",
    value: contact.lifetime_value_cents || 0,
    weight: ENGAGEMENT_WEIGHTS.lifetimeValue,
    contribution: (valueScore * ENGAGEMENT_WEIGHTS.lifetimeValue) / 100,
  });

  // Calculate total
  const totalScore = Math.round(
    factors.reduce((sum, f) => sum + f.contribution, 0),
  );

  // Determine level
  let level: EngagementLevel;
  if (totalScore >= 80 || contact.status === "vip") level = "vip";
  else if (totalScore >= 60) level = "hot";
  else if (totalScore >= 30) level = "warm";
  else level = "cold";

  // Update database
  await updateMany(
    "contacts",
    { engagement_score: totalScore, engagement_level: level },
    { id: contactId },
  );

  return { score: totalScore, level, factors };
}

// ============================================================================
// NOTES
// ============================================================================

/**
 * Get notes for a contact
 */
export async function getContactNotes(
  tenantId: string,
  contactId: string,
  pagination: PaginationParams = {},
): Promise<PaginatedResult<ContactNote>> {
  const limit = pagination.limit || 20;
  const offset = pagination.offset || 0;

  // Count total
  const countResult = await queryOne<{ total: string }>(
    `SELECT COUNT(*) as total FROM contact_notes
     WHERE tenant_id = $1 AND contact_id = $2`,
    [tenantId, contactId],
  );
  const total = parseInt(countResult?.total || "0", 10);

  // Fetch data with custom ordering (pinned first, then by date)
  const data = await queryAll<ContactNote>(
    `SELECT * FROM contact_notes
     WHERE tenant_id = $1 AND contact_id = $2
     ORDER BY is_pinned DESC, created_at DESC
     LIMIT $3 OFFSET $4`,
    [tenantId, contactId, limit, offset],
  );

  return {
    data: data || [],
    total,
    limit,
    offset,
    has_more: total > offset + limit,
  };
}

/**
 * Add note to contact
 */
export async function addNote(
  tenantId: string,
  input: CreateNoteInput,
  createdBy?: string,
  createdByName?: string,
): Promise<ContactNote> {
  const data = await insertOne<ContactNote>("contact_notes", {
    tenant_id: tenantId,
    contact_id: input.contact_id,
    note_type: input.note_type || "general",
    content: input.content,
    call_id: input.call_id,
    booking_id: input.booking_id,
    is_pinned: input.is_pinned || false,
    is_private: input.is_private || false,
    created_by: createdBy,
    created_by_name: createdByName,
  });

  // Log activity
  await addActivity(tenantId, input.contact_id, "note_added", {
    description: `Note added: ${input.note_type || "general"}`,
    relatedId: data.id,
    relatedType: "note",
    performedBy: createdBy,
  });

  return data;
}

// ============================================================================
// TAGS
// ============================================================================

/**
 * Add tag to contact
 */
export async function addTag(
  tenantId: string,
  contactId: string,
  tag: string,
): Promise<void> {
  // Get current tags
  const contact = await getContact(tenantId, contactId);
  if (!contact) {
    throw new Error("Contact not found");
  }

  // Check if tag already exists
  if (contact.tags.includes(tag)) {
    return;
  }

  const newTags = [...contact.tags, tag];

  await updateMany("contacts", { tags: newTags }, { id: contactId });

  // Invalidate cache
  contactCache.invalidate(tenantId, contact.phone_normalized);

  // Log activity
  await addActivity(tenantId, contactId, "tag_added", {
    description: `Tag added: ${tag}`,
    metadata: { tag },
  });
}

/**
 * Remove tag from contact
 */
export async function removeTag(
  tenantId: string,
  contactId: string,
  tag: string,
): Promise<void> {
  const contact = await getContact(tenantId, contactId);
  if (!contact) {
    throw new Error("Contact not found");
  }

  const newTags = contact.tags.filter((t) => t !== tag);

  await updateMany("contacts", { tags: newTags }, { id: contactId });

  // Invalidate cache
  contactCache.invalidate(tenantId, contact.phone_normalized);

  // Log activity
  await addActivity(tenantId, contactId, "tag_removed", {
    description: `Tag removed: ${tag}`,
    metadata: { tag },
  });
}

/**
 * Bulk add tag to multiple contacts
 */
export async function bulkAddTag(
  tenantId: string,
  contactIds: string[],
  tag: string,
): Promise<number> {
  // Use RPC for efficient bulk update
  const result = await rpc<number>("bulk_add_tag", {
    p_tenant_id: tenantId,
    p_contact_ids: contactIds,
    p_tag: tag,
  });

  return result || 0;
}

// ============================================================================
// IMPORT
// ============================================================================

/**
 * Import contacts from records
 */
export async function importContacts(
  tenantId: string,
  records: ContactImportRecord[],
  options: {
    skipDuplicates?: boolean;
    updateExisting?: boolean;
    source?: string;
  } = {},
): Promise<ImportResult> {
  const result: ImportResult = {
    total: records.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    try {
      // Validate phone
      if (!record.phone) {
        result.errors.push({
          row: i + 1,
          field: "phone",
          message: "Phone number is required",
          data: record as unknown as Record<string, unknown>,
        });
        continue;
      }

      // Validate and normalize phone
      normalizePhoneNumber(record.phone);

      // Check for existing
      const existing = await lookupByPhone(tenantId, record.phone);

      if (existing) {
        if (options.skipDuplicates) {
          result.skipped++;
          continue;
        }

        if (options.updateExisting) {
          // Update existing contact
          await updateContact(tenantId, existing.id, {
            email: record.email,
            name: record.name,
            first_name: record.first_name,
            last_name: record.last_name,
            company: record.company,
            notes: record.notes,
            tags: Array.isArray(record.tags)
              ? record.tags
              : record.tags?.split(",").map((t) => t.trim()),
            custom_fields: record.custom_fields,
          });
          result.updated++;
          continue;
        }

        result.skipped++;
        continue;
      }

      // Create new contact
      await createContact(tenantId, {
        phone: record.phone,
        email: record.email,
        name: record.name,
        first_name: record.first_name,
        last_name: record.last_name,
        company: record.company,
        source: (options.source as "import") || "import",
        tags: Array.isArray(record.tags)
          ? record.tags
          : record.tags?.split(",").map((t) => t.trim()),
        notes: record.notes,
        custom_fields: record.custom_fields,
      });
      result.created++;
    } catch (err) {
      result.errors.push({
        row: i + 1,
        message: err instanceof Error ? err.message : "Unknown error",
        data: record as unknown as Record<string, unknown>,
      });
    }
  }

  return result;
}

// ============================================================================
// MERGE
// ============================================================================

/**
 * Merge duplicate contacts
 */
export async function mergeContacts(
  tenantId: string,
  primaryId: string,
  secondaryIds: string[],
): Promise<Contact> {
  // Get all contacts
  const primary = await getContact(tenantId, primaryId);
  if (!primary) {
    throw new Error("Primary contact not found");
  }

  // Update references in other tables
  for (const secondaryId of secondaryIds) {
    const secondary = await getContact(tenantId, secondaryId);
    if (!secondary) continue;

    // Move calls to primary
    await updateMany(
      "calls",
      { contact_id: primaryId },
      { contact_id: secondaryId },
    );

    // Move bookings to primary
    await updateMany(
      "bookings",
      { contact_id: primaryId },
      { contact_id: secondaryId },
    );

    // Move notes to primary
    await updateMany(
      "contact_notes",
      { contact_id: primaryId },
      { contact_id: secondaryId },
    );

    // Move activity to primary
    await updateMany(
      "contact_activity",
      { contact_id: primaryId },
      { contact_id: secondaryId },
    );

    // Merge metrics
    const updates: Record<string, unknown> = {
      total_calls: primary.total_calls + secondary.total_calls,
      total_bookings: primary.total_bookings + secondary.total_bookings,
      total_completed_bookings:
        primary.total_completed_bookings + secondary.total_completed_bookings,
      total_cancelled_bookings:
        primary.total_cancelled_bookings + secondary.total_cancelled_bookings,
      total_no_shows: primary.total_no_shows + secondary.total_no_shows,
      total_sms_sent: primary.total_sms_sent + secondary.total_sms_sent,
      total_emails_sent:
        primary.total_emails_sent + secondary.total_emails_sent,
      lifetime_value_cents:
        primary.lifetime_value_cents + secondary.lifetime_value_cents,
    };

    // Merge tags
    const mergedTags = [...new Set([...primary.tags, ...secondary.tags])];
    updates.tags = mergedTags;

    // Use earliest first_contact_at
    if (
      secondary.first_contact_at &&
      (!primary.first_contact_at ||
        secondary.first_contact_at < primary.first_contact_at)
    ) {
      updates.first_contact_at = secondary.first_contact_at;
    }

    // Use latest last_contact_at
    if (
      secondary.last_contact_at &&
      (!primary.last_contact_at ||
        secondary.last_contact_at > primary.last_contact_at)
    ) {
      updates.last_contact_at = secondary.last_contact_at;
    }

    await updateMany("contacts", updates, { id: primaryId });

    // Soft delete secondary
    await updateMany("contacts", { status: "inactive" }, { id: secondaryId });

    // Log merge activity
    await addActivity(tenantId, primaryId, "merged", {
      description: `Merged with contact ${secondary.phone}`,
      metadata: { merged_contact_id: secondaryId },
    });

    // Invalidate cache
    contactCache.invalidate(tenantId, secondary.phone_normalized);
  }

  // Invalidate primary cache
  contactCache.invalidate(tenantId, primary.phone_normalized);

  // Return updated primary
  return (await getContact(tenantId, primaryId))!;
}
