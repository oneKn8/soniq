// Contacts API Routes
// Full CRM contact management

import { Hono } from "hono";
import { z } from "zod";
import { tenantQueryOne, tenantQueryAll } from "../services/database/client.js";
import {
  createContact,
  getContact,
  updateContact,
  deleteContact,
  findOrCreateByPhone,
  lookupByPhone,
  lookupByEmail,
  searchContacts,
  getContactHistory,
  recalculateEngagementScore,
  calculateEngagementDetails,
  getContactNotes,
  addNote,
  addTag,
  removeTag,
  bulkAddTag,
  importContacts,
  mergeContacts,
} from "../services/contacts/contact-service.js";
import { isValidPhone } from "../services/contacts/phone-utils.js";
import { ContactFilters, PaginationParams } from "../types/crm.js";
import { getAuthTenantId, getAuthUserId } from "../middleware/index.js";

export const contactsRoutes = new Hono();

// Helper to transform null to undefined
const nullToUndefined = <T>(val: T | null | undefined): T | undefined =>
  val === null ? undefined : val;

// Validation schemas
const createContactSchema = z.object({
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().nullish().transform(nullToUndefined),
  name: z.string().nullish().transform(nullToUndefined),
  first_name: z.string().nullish().transform(nullToUndefined),
  last_name: z.string().nullish().transform(nullToUndefined),
  company: z.string().nullish().transform(nullToUndefined),
  source: z
    .enum(["call", "booking", "import", "manual", "sms", "web"])
    .optional(),
  source_details: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().nullish().transform(nullToUndefined),
  custom_fields: z.record(z.unknown()).optional(),
});

const updateContactSchema = z.object({
  email: z.string().email().nullish().transform(nullToUndefined),
  name: z.string().nullish().transform(nullToUndefined),
  first_name: z.string().nullish().transform(nullToUndefined),
  last_name: z.string().nullish().transform(nullToUndefined),
  company: z.string().nullish().transform(nullToUndefined),
  status: z
    .enum(["active", "inactive", "blocked", "vip", "churned"])
    .optional(),
  lead_status: z
    .enum(["new", "contacted", "qualified", "converted", "lost"])
    .nullish()
    .transform(nullToUndefined),
  preferred_contact_method: z
    .enum(["phone", "sms", "email"])
    .nullish()
    .transform(nullToUndefined),
  preferred_contact_time: z.string().nullish().transform(nullToUndefined),
  preferred_language: z.string().optional(),
  timezone: z.string().nullish().transform(nullToUndefined),
  do_not_call: z.boolean().optional(),
  do_not_sms: z.boolean().optional(),
  do_not_email: z.boolean().optional(),
  marketing_opt_in: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().nullish().transform(nullToUndefined),
  custom_fields: z.record(z.unknown()).optional(),
});

const createNoteSchema = z.object({
  note_type: z
    .enum([
      "general",
      "call_summary",
      "booking_note",
      "preference",
      "complaint",
      "compliment",
      "follow_up",
      "internal",
      "system",
    ])
    .optional(),
  content: z.string().min(1, "Content is required"),
  call_id: z.string().uuid().nullish().transform(nullToUndefined),
  booking_id: z.string().uuid().nullish().transform(nullToUndefined),
  is_pinned: z.boolean().optional(),
  is_private: z.boolean().optional(),
});

// Helper to get tenant ID from auth context
function getTenantId(c: Parameters<typeof getAuthTenantId>[0]): string {
  return getAuthTenantId(c);
}

// Row types for PostgreSQL queries
interface BookingRow {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  booking_date: string;
  booking_time: string;
  booking_type: string | null;
  status: string;
  confirmation_code: string | null;
  created_at: string;
  updated_at: string;
}

interface CallRow {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  started_at: string | null;
  duration_seconds: number | null;
  outcome_type: string | null;
  summary: string | null;
  created_at: string;
}

// ============================================================================
// LIST & SEARCH
// ============================================================================

/**
 * GET /api/contacts
 * List contacts with search, filters, pagination
 */
contactsRoutes.get("/", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const query = c.req.query();

    const filters: ContactFilters = {};
    const pagination: PaginationParams = {};

    // Parse filters
    if (query.search) filters.search = query.search;
    if (query.status) {
      filters.status = query.status.includes(",")
        ? (query.status.split(",") as any)
        : (query.status as any);
    }
    if (query.lead_status) {
      filters.lead_status = query.lead_status.includes(",")
        ? (query.lead_status.split(",") as any)
        : (query.lead_status as any);
    }
    if (query.tags) {
      filters.tags = query.tags.split(",");
    }
    if (query.source) {
      filters.source = query.source.includes(",")
        ? (query.source.split(",") as any)
        : (query.source as any);
    }
    if (query.has_bookings !== undefined) {
      filters.has_bookings = query.has_bookings === "true";
    }
    if (query.has_calls !== undefined) {
      filters.has_calls = query.has_calls === "true";
    }
    if (query.created_after) filters.created_after = query.created_after;
    if (query.created_before) filters.created_before = query.created_before;
    if (query.last_contact_after)
      filters.last_contact_after = query.last_contact_after;
    if (query.last_contact_before)
      filters.last_contact_before = query.last_contact_before;

    // Parse pagination
    if (query.limit) pagination.limit = parseInt(query.limit);
    if (query.offset) pagination.offset = parseInt(query.offset);
    if (query.sort_by) pagination.sort_by = query.sort_by;
    if (query.sort_order)
      pagination.sort_order = query.sort_order as "asc" | "desc";

    const result = await searchContacts(tenantId, filters, pagination);

    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("X-Tenant-ID")) {
      return c.json({ error: message }, 400);
    }
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// LOOKUP (Fast path for voice agent)
// ============================================================================

/**
 * GET /api/contacts/lookup
 * Fast lookup by phone (for voice agent)
 * Uses cache for <50ms response
 */
contactsRoutes.get("/lookup", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const phone = c.req.query("phone");

    if (!phone) {
      return c.json({ error: "phone query parameter is required" }, 400);
    }

    const contact = await lookupByPhone(tenantId, phone);

    if (!contact) {
      return c.json({ found: false, contact: null });
    }

    return c.json({ found: true, contact });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/contacts/lookup/email
 * Lookup by email
 */
contactsRoutes.get("/lookup/email", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const email = c.req.query("email");

    if (!email) {
      return c.json({ error: "email query parameter is required" }, 400);
    }

    const contact = await lookupByEmail(tenantId, email);

    if (!contact) {
      return c.json({ found: false, contact: null });
    }

    return c.json({ found: true, contact });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// CRUD
// ============================================================================

/**
 * GET /api/contacts/:id
 * Get contact by ID
 */
contactsRoutes.get("/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");

    const contact = await getContact(tenantId, id);

    if (!contact) {
      return c.json({ error: "Contact not found" }, 404);
    }

    return c.json(contact);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /api/contacts
 * Create new contact
 */
contactsRoutes.post("/", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json();

    // Validate input
    const parsed = createContactSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parsed.error.issues,
        },
        400,
      );
    }

    // Validate phone number
    if (!isValidPhone(parsed.data.phone)) {
      return c.json({ error: "Invalid phone number format" }, 400);
    }

    const contact = await createContact(tenantId, parsed.data);

    return c.json(contact, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("already exists")) {
      return c.json({ error: message }, 409);
    }
    return c.json({ error: message }, 500);
  }
});

/**
 * PUT /api/contacts/:id
 * Update contact
 */
contactsRoutes.put("/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const body = await c.req.json();

    // Validate input
    const parsed = updateContactSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parsed.error.issues,
        },
        400,
      );
    }

    const contact = await updateContact(tenantId, id, parsed.data);

    return c.json(contact);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 500);
  }
});

/**
 * DELETE /api/contacts/:id
 * Soft delete contact
 */
contactsRoutes.delete("/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");

    await deleteContact(tenantId, id);

    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// FIND OR CREATE
// ============================================================================

/**
 * POST /api/contacts/find-or-create
 * Find existing contact by phone or create new one
 * Used by voice agent to ensure contact exists
 */
contactsRoutes.post("/find-or-create", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json();

    if (!body.phone) {
      return c.json({ error: "phone is required" }, 400);
    }

    const contact = await findOrCreateByPhone(tenantId, body.phone, body);

    return c.json(contact);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// STATUS
// ============================================================================

/**
 * PATCH /api/contacts/:id/status
 * Update contact status
 */
contactsRoutes.patch("/:id/status", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const body = await c.req.json();

    const statusSchema = z.object({
      status: z.enum(["active", "inactive", "blocked", "vip", "churned"]),
    });

    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid status" }, 400);
    }

    const contact = await updateContact(tenantId, id, {
      status: parsed.data.status,
    });

    return c.json(contact);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// TAGS
// ============================================================================

/**
 * PATCH /api/contacts/:id/tags
 * Add or remove tags
 */
contactsRoutes.patch("/:id/tags", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const body = await c.req.json();

    const tagsSchema = z.object({
      add: z.array(z.string()).optional(),
      remove: z.array(z.string()).optional(),
    });

    const parsed = tagsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid tags format" }, 400);
    }

    // Add tags
    if (parsed.data.add) {
      for (const tag of parsed.data.add) {
        await addTag(tenantId, id, tag);
      }
    }

    // Remove tags
    if (parsed.data.remove) {
      for (const tag of parsed.data.remove) {
        await removeTag(tenantId, id, tag);
      }
    }

    // Return updated contact
    const contact = await getContact(tenantId, id);

    return c.json(contact);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /api/contacts/bulk/tags
 * Bulk add tag to multiple contacts
 */
contactsRoutes.post("/bulk/tags", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json();

    const bulkTagsSchema = z.object({
      contact_ids: z.array(z.string().uuid()),
      tag: z.string().min(1),
    });

    const parsed = bulkTagsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request" }, 400);
    }

    const count = await bulkAddTag(
      tenantId,
      parsed.data.contact_ids,
      parsed.data.tag,
    );

    return c.json({ updated: count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// NOTES
// ============================================================================

/**
 * GET /api/contacts/:id/notes
 * Get notes for contact
 */
contactsRoutes.get("/:id/notes", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const query = c.req.query();

    const pagination: PaginationParams = {};
    if (query.limit) pagination.limit = parseInt(query.limit);
    if (query.offset) pagination.offset = parseInt(query.offset);

    const result = await getContactNotes(tenantId, id, pagination);

    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /api/contacts/:id/notes
 * Add note to contact
 */
contactsRoutes.post("/:id/notes", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const body = await c.req.json();

    const parsed = createNoteSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parsed.error.issues,
        },
        400,
      );
    }

    // Get user info from auth context
    const userId = getAuthUserId(c);
    const userName = c.get("auth")?.user?.user_metadata?.full_name;

    const note = await addNote(
      tenantId,
      { contact_id: id, ...parsed.data },
      userId,
      userName,
    );

    return c.json(note, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// HISTORY
// ============================================================================

/**
 * GET /api/contacts/:id/history
 * Get activity timeline for contact
 */
contactsRoutes.get("/:id/history", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const query = c.req.query();

    const pagination: PaginationParams = {};
    if (query.limit) pagination.limit = parseInt(query.limit);
    if (query.offset) pagination.offset = parseInt(query.offset);

    const result = await getContactHistory(tenantId, id, pagination);

    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// RELATED DATA
// ============================================================================

/**
 * GET /api/contacts/:id/bookings
 * Get all bookings for contact
 */
contactsRoutes.get("/:id/bookings", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const query = c.req.query();

    const limit = parseInt(query.limit || "20");
    const offset = parseInt(query.offset || "0");

    // Get total count (RLS + app-level WHERE as defense-in-depth)
    const countResult = await tenantQueryOne<{ count: string }>(
      tenantId,
      `SELECT COUNT(*) as count FROM bookings
       WHERE tenant_id = $1 AND contact_id = $2`,
      [tenantId, id],
    );
    const total = parseInt(countResult?.count || "0", 10);

    // Get bookings with pagination
    const data = await tenantQueryAll<BookingRow>(
      tenantId,
      `SELECT * FROM bookings
       WHERE tenant_id = $1 AND contact_id = $2
       ORDER BY booking_date DESC
       LIMIT $3 OFFSET $4`,
      [tenantId, id, limit, offset],
    );

    return c.json({
      data: data || [],
      total,
      limit,
      offset,
      has_more: total > offset + limit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/contacts/:id/calls
 * Get all calls for contact
 */
contactsRoutes.get("/:id/calls", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const query = c.req.query();

    const limit = parseInt(query.limit || "20");
    const offset = parseInt(query.offset || "0");

    // Get total count (RLS + app-level WHERE as defense-in-depth)
    const countResult = await tenantQueryOne<{ count: string }>(
      tenantId,
      `SELECT COUNT(*) as count FROM calls
       WHERE tenant_id = $1 AND contact_id = $2`,
      [tenantId, id],
    );
    const total = parseInt(countResult?.count || "0", 10);

    // Get calls with pagination
    const data = await tenantQueryAll<CallRow>(
      tenantId,
      `SELECT * FROM calls
       WHERE tenant_id = $1 AND contact_id = $2
       ORDER BY started_at DESC
       LIMIT $3 OFFSET $4`,
      [tenantId, id, limit, offset],
    );

    return c.json({
      data: data || [],
      total,
      limit,
      offset,
      has_more: total > offset + limit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// IMPORT / EXPORT
// ============================================================================

/**
 * POST /api/contacts/import
 * Bulk import contacts
 */
contactsRoutes.post("/import", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const contentType = c.req.header("Content-Type") || "";

    let records: unknown[];
    let options: { skipDuplicates?: boolean; updateExisting?: boolean } = {};

    if (contentType.includes("application/json")) {
      const body = await c.req.json();
      records = body.records;
      options.skipDuplicates = body.skip_duplicates;
      options.updateExisting = body.update_existing;
    } else {
      return c.json({ error: "Content-Type must be application/json" }, 400);
    }

    if (!Array.isArray(records)) {
      return c.json({ error: "records must be an array" }, 400);
    }

    if (records.length > 10000) {
      return c.json({ error: "Maximum 10000 records per import" }, 400);
    }

    // Validate records
    const recordSchema = z.object({
      phone: z.string(),
      email: z.string().optional(),
      name: z.string().optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      company: z.string().optional(),
      tags: z.union([z.string(), z.array(z.string())]).optional(),
      notes: z.string().optional(),
      custom_fields: z.record(z.unknown()).optional(),
    });

    const validatedRecords = [];
    const validationErrors = [];

    for (let i = 0; i < records.length; i++) {
      const result = recordSchema.safeParse(records[i]);
      if (result.success) {
        validatedRecords.push(result.data);
      } else {
        validationErrors.push({
          row: i + 1,
          message: result.error.issues[0].message,
          field: result.error.issues[0].path.join("."),
        });
      }
    }

    // Import valid records
    const importResult = await importContacts(
      tenantId,
      validatedRecords,
      options,
    );

    // Add validation errors to result
    importResult.errors = [...validationErrors, ...importResult.errors];

    return c.json(importResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /api/contacts/export
 * Export contacts
 */
contactsRoutes.post("/export", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json();

    const format = body.format || "json";
    const filters: ContactFilters = body.filters || {};

    // Get all matching contacts
    const result = await searchContacts(tenantId, filters, { limit: 100000 });

    if (format === "json") {
      return c.json({
        exported_at: new Date().toISOString(),
        total: result.total,
        contacts: result.data,
      });
    }

    // CSV format
    if (format === "csv") {
      const headers = [
        "id",
        "phone",
        "email",
        "name",
        "first_name",
        "last_name",
        "company",
        "status",
        "lead_status",
        "tags",
        "total_calls",
        "total_bookings",
        "lifetime_value_cents",
        "created_at",
      ];

      const rows = result.data.map((contact) => [
        contact.id,
        contact.phone,
        contact.email || "",
        contact.name || "",
        contact.first_name || "",
        contact.last_name || "",
        contact.company || "",
        contact.status,
        contact.lead_status || "",
        contact.tags.join(";"),
        contact.total_calls.toString(),
        contact.total_bookings.toString(),
        contact.lifetime_value_cents.toString(),
        contact.created_at,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="contacts-${Date.now()}.csv"`,
        },
      });
    }

    return c.json({ error: "Invalid format. Use 'json' or 'csv'" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// MERGE
// ============================================================================

/**
 * POST /api/contacts/merge
 * Merge duplicate contacts
 */
contactsRoutes.post("/merge", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json();

    const mergeSchema = z.object({
      primary_id: z.string().uuid(),
      secondary_ids: z.array(z.string().uuid()).min(1),
    });

    const parsed = mergeSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parsed.error.issues,
        },
        400,
      );
    }

    const contact = await mergeContacts(
      tenantId,
      parsed.data.primary_id,
      parsed.data.secondary_ids,
    );

    return c.json(contact);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// ENGAGEMENT
// ============================================================================

/**
 * POST /api/contacts/:id/recalculate-score
 * Recalculate engagement score
 */
contactsRoutes.post("/:id/recalculate-score", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");

    const score = await recalculateEngagementScore(tenantId, id);

    return c.json({ engagement_score: score });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/contacts/:id/engagement
 * Get detailed engagement score with factor breakdown
 */
contactsRoutes.get("/:id/engagement", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");

    const result = await calculateEngagementDetails(tenantId, id);

    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});
