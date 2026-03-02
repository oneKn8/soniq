/**
 * Contacts API client
 * Full CRM contact management
 */

import { get, post, put, patch, del } from "./client";
import type {
  Contact,
  ContactNote,
  ContactActivity,
  ContactFilters,
  PaginationParams,
  PaginatedResult,
  CreateContactInput,
  UpdateContactInput,
  CreateNoteInput,
  ImportResult,
  ExportOptions,
  Booking,
} from "@/types/crm";

// ============================================================================
// API Response Types
// ============================================================================

interface ContactLookupResponse {
  found: boolean;
  contact: Contact | null;
}

interface TagsUpdateRequest {
  add?: string[];
  remove?: string[];
}

interface BulkTagRequest {
  contact_ids: string[];
  tag: string;
}

interface MergeRequest {
  primary_id: string;
  secondary_ids: string[];
}

interface ImportRequest {
  records: unknown[];
  skip_duplicates?: boolean;
  update_existing?: boolean;
}

interface ExportResponse {
  exported_at: string;
  total: number;
  contacts: Contact[];
}

// ============================================================================
// LIST & SEARCH
// ============================================================================

/**
 * Search contacts with filters and pagination
 */
export async function searchContacts(
  filters?: ContactFilters,
  pagination?: PaginationParams,
): Promise<PaginatedResult<Contact>> {
  const params: Record<string, string> = {};

  // Add filters
  if (filters?.search) params.search = filters.search;
  if (filters?.status) {
    params.status = Array.isArray(filters.status)
      ? filters.status.join(",")
      : filters.status;
  }
  if (filters?.lead_status) {
    params.lead_status = Array.isArray(filters.lead_status)
      ? filters.lead_status.join(",")
      : filters.lead_status;
  }
  if (filters?.tags) params.tags = filters.tags.join(",");
  if (filters?.source) {
    params.source = Array.isArray(filters.source)
      ? filters.source.join(",")
      : filters.source;
  }
  if (filters?.has_bookings !== undefined) {
    params.has_bookings = String(filters.has_bookings);
  }
  if (filters?.has_calls !== undefined) {
    params.has_calls = String(filters.has_calls);
  }
  if (filters?.created_after) params.created_after = filters.created_after;
  if (filters?.created_before) params.created_before = filters.created_before;
  if (filters?.last_contact_after) {
    params.last_contact_after = filters.last_contact_after;
  }
  if (filters?.last_contact_before) {
    params.last_contact_before = filters.last_contact_before;
  }

  // Add pagination
  if (pagination?.limit) params.limit = String(pagination.limit);
  if (pagination?.offset) params.offset = String(pagination.offset);
  if (pagination?.sort_by) params.sort_by = pagination.sort_by;
  if (pagination?.sort_order) params.sort_order = pagination.sort_order;

  return get<PaginatedResult<Contact>>("/api/contacts", params);
}

// ============================================================================
// LOOKUP (Fast path)
// ============================================================================

/**
 * Fast lookup by phone number
 */
export async function lookupByPhone(
  phone: string,
): Promise<ContactLookupResponse> {
  return get<ContactLookupResponse>("/api/contacts/lookup", { phone });
}

/**
 * Lookup by email
 */
export async function lookupByEmail(
  email: string,
): Promise<ContactLookupResponse> {
  return get<ContactLookupResponse>("/api/contacts/lookup/email", { email });
}

// ============================================================================
// CRUD
// ============================================================================

/**
 * Get contact by ID
 */
export async function getContact(id: string): Promise<Contact> {
  return get<Contact>(`/api/contacts/${id}`);
}

/**
 * Create a new contact
 */
export async function createContact(
  input: CreateContactInput,
): Promise<Contact> {
  return post<Contact>("/api/contacts", input);
}

/**
 * Update a contact
 */
export async function updateContact(
  id: string,
  input: UpdateContactInput,
): Promise<Contact> {
  return put<Contact>(`/api/contacts/${id}`, input);
}

/**
 * Delete (soft delete) a contact
 */
export async function deleteContact(id: string): Promise<{ success: boolean }> {
  return del<{ success: boolean }>(`/api/contacts/${id}`);
}

/**
 * Find existing contact by phone or create new one
 */
export async function findOrCreateByPhone(
  phone: string,
  data?: Partial<CreateContactInput>,
): Promise<Contact> {
  return post<Contact>("/api/contacts/find-or-create", { phone, ...data });
}

// ============================================================================
// STATUS
// ============================================================================

/**
 * Update contact status
 */
export async function updateContactStatus(
  id: string,
  status: Contact["status"],
): Promise<Contact> {
  return patch<Contact>(`/api/contacts/${id}/status`, { status });
}

// ============================================================================
// TAGS
// ============================================================================

/**
 * Add or remove tags from a contact
 */
export async function updateContactTags(
  id: string,
  changes: TagsUpdateRequest,
): Promise<Contact> {
  return patch<Contact>(`/api/contacts/${id}/tags`, changes);
}

/**
 * Bulk add tag to multiple contacts
 */
export async function bulkAddTag(
  contactIds: string[],
  tag: string,
): Promise<{ updated: number }> {
  return post<{ updated: number }>("/api/contacts/bulk/tags", {
    contact_ids: contactIds,
    tag,
  } as BulkTagRequest);
}

// ============================================================================
// NOTES
// ============================================================================

/**
 * Get notes for a contact
 */
export async function getContactNotes(
  contactId: string,
  pagination?: PaginationParams,
): Promise<PaginatedResult<ContactNote>> {
  const params: Record<string, string> = {};
  if (pagination?.limit) params.limit = String(pagination.limit);
  if (pagination?.offset) params.offset = String(pagination.offset);

  return get<PaginatedResult<ContactNote>>(
    `/api/contacts/${contactId}/notes`,
    params,
  );
}

/**
 * Add a note to a contact
 */
export async function addContactNote(
  contactId: string,
  input: Omit<CreateNoteInput, "contact_id">,
): Promise<ContactNote> {
  return post<ContactNote>(`/api/contacts/${contactId}/notes`, input);
}

// ============================================================================
// HISTORY
// ============================================================================

/**
 * Get activity timeline for a contact
 */
export async function getContactHistory(
  contactId: string,
  pagination?: PaginationParams,
): Promise<PaginatedResult<ContactActivity>> {
  const params: Record<string, string> = {};
  if (pagination?.limit) params.limit = String(pagination.limit);
  if (pagination?.offset) params.offset = String(pagination.offset);

  return get<PaginatedResult<ContactActivity>>(
    `/api/contacts/${contactId}/history`,
    params,
  );
}

// ============================================================================
// RELATED DATA
// ============================================================================

/**
 * Get all bookings for a contact
 */
export async function getContactBookings(
  contactId: string,
  pagination?: PaginationParams,
): Promise<PaginatedResult<Booking>> {
  const params: Record<string, string> = {};
  if (pagination?.limit) params.limit = String(pagination.limit);
  if (pagination?.offset) params.offset = String(pagination.offset);

  return get<PaginatedResult<Booking>>(
    `/api/contacts/${contactId}/bookings`,
    params,
  );
}

/**
 * Get all calls for a contact
 */
export async function getContactCalls(
  contactId: string,
  pagination?: PaginationParams,
): Promise<PaginatedResult<unknown>> {
  const params: Record<string, string> = {};
  if (pagination?.limit) params.limit = String(pagination.limit);
  if (pagination?.offset) params.offset = String(pagination.offset);

  return get<PaginatedResult<unknown>>(
    `/api/contacts/${contactId}/calls`,
    params,
  );
}

// ============================================================================
// IMPORT / EXPORT
// ============================================================================

/**
 * Import contacts in bulk
 */
export async function importContacts(
  records: unknown[],
  options?: { skipDuplicates?: boolean; updateExisting?: boolean },
): Promise<ImportResult> {
  return post<ImportResult>("/api/contacts/import", {
    records,
    skip_duplicates: options?.skipDuplicates,
    update_existing: options?.updateExisting,
  } as ImportRequest);
}

/**
 * Export contacts
 */
export async function exportContacts(
  options?: ExportOptions,
): Promise<ExportResponse> {
  return post<ExportResponse>("/api/contacts/export", options || {});
}

// ============================================================================
// MERGE
// ============================================================================

/**
 * Merge duplicate contacts
 */
export async function mergeContacts(
  primaryId: string,
  secondaryIds: string[],
): Promise<Contact> {
  return post<Contact>("/api/contacts/merge", {
    primary_id: primaryId,
    secondary_ids: secondaryIds,
  } as MergeRequest);
}

// ============================================================================
// ENGAGEMENT
// ============================================================================

/**
 * Recalculate engagement score for a contact
 */
export async function recalculateEngagementScore(
  contactId: string,
): Promise<{ engagement_score: number }> {
  return post<{ engagement_score: number }>(
    `/api/contacts/${contactId}/recalculate-score`,
  );
}
