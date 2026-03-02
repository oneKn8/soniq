// CRM Types for Soniq
// Contacts, Notifications, Resources, Availability

// ============================================================================
// CONTACT TYPES
// ============================================================================

export type ContactSource =
  | "call"
  | "booking"
  | "import"
  | "manual"
  | "sms"
  | "web";
export type ContactStatus =
  | "active"
  | "inactive"
  | "blocked"
  | "vip"
  | "churned";
export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "converted"
  | "lost";
export type ContactMethod = "phone" | "sms" | "email";

export interface Contact {
  id: string;
  tenant_id: string;

  // Identity
  phone: string;
  phone_normalized: string;
  email?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  company?: string;

  // Source tracking
  source: ContactSource;
  source_details: Record<string, unknown>;

  // Timestamps
  first_contact_at: string;
  last_contact_at?: string;
  last_booking_at?: string;
  last_call_at?: string;
  created_at: string;
  updated_at: string;

  // Engagement metrics
  total_calls: number;
  total_bookings: number;
  total_completed_bookings: number;
  total_cancelled_bookings: number;
  total_no_shows: number;
  total_sms_sent: number;
  total_emails_sent: number;
  lifetime_value_cents: number;
  average_booking_value_cents: number;

  // Scoring
  engagement_score: number;
  sentiment_average?: number;

  // Status & Classification
  status: ContactStatus;
  lead_status?: LeadStatus;

  // Preferences
  preferred_contact_method?: ContactMethod;
  preferred_contact_time?: string;
  preferred_language: string;
  timezone?: string;

  // Communication preferences (compliance)
  do_not_call: boolean;
  do_not_sms: boolean;
  do_not_email: boolean;
  marketing_opt_in: boolean;
  marketing_opt_in_at?: string;

  // Custom data
  custom_fields: Record<string, unknown>;
  tags: string[];
  notes?: string;

  // Avatar/profile
  avatar_url?: string;
}

export type NoteType =
  | "general"
  | "call_summary"
  | "booking_note"
  | "preference"
  | "complaint"
  | "compliment"
  | "follow_up"
  | "internal"
  | "system";

export interface ContactNote {
  id: string;
  tenant_id: string;
  contact_id: string;

  // Content
  note_type: NoteType;
  content: string;

  // Rich content support
  attachments: Attachment[];

  // Attribution
  created_by?: string;
  created_by_name?: string;

  // Relations
  call_id?: string;
  booking_id?: string;

  // Flags
  is_pinned: boolean;
  is_private: boolean;

  created_at: string;
}

export interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

export type ActivityType =
  | "call_received"
  | "call_made"
  | "booking_created"
  | "booking_modified"
  | "booking_cancelled"
  | "booking_completed"
  | "booking_no_show"
  | "sms_sent"
  | "sms_received"
  | "email_sent"
  | "email_opened"
  | "email_clicked"
  | "note_added"
  | "tag_added"
  | "tag_removed"
  | "status_changed"
  | "merged"
  | "imported"
  | "exported";

export interface ContactActivity {
  id: string;
  tenant_id: string;
  contact_id: string;

  // Activity details
  activity_type: ActivityType;
  description?: string;
  metadata: Record<string, unknown>;

  // Relations
  related_id?: string;
  related_type?: string;

  // Attribution
  performed_by?: string;

  created_at: string;
}

// ============================================================================
// RESOURCE TYPES
// ============================================================================

export type ResourceType = "staff" | "room" | "equipment" | "service" | "other";

export interface Resource {
  id: string;
  tenant_id: string;

  // Identity
  name: string;
  type: ResourceType;
  description?: string;

  // Capacity
  capacity: number;

  // Availability
  is_active: boolean;
  default_duration_minutes: number;

  // Scheduling
  accepts_bookings: boolean;
  buffer_before_minutes: number;
  buffer_after_minutes: number;

  // Display
  color?: string;
  avatar_url?: string;
  sort_order: number;

  // Metadata
  metadata: Record<string, unknown>;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// AVAILABILITY TYPES
// ============================================================================

export interface AvailabilityTemplate {
  id: string;
  tenant_id: string;

  name: string;
  description?: string;

  // Which resource this applies to (null = all)
  resource_id?: string;

  // Weekly schedule
  schedule: DayAvailability[];

  // Exceptions
  blocked_dates: string[];

  // Validity
  valid_from?: string;
  valid_until?: string;
  is_active: boolean;

  created_at: string;
  updated_at: string;
}

export interface DayAvailability {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  enabled: boolean;
  slots: TimeSlot[];
}

export interface TimeSlot {
  start: string; // "09:00"
  end: string; // "17:00"
  capacity: number;
}

export type SlotStatus = "available" | "full" | "blocked" | "holiday" | "break";

export interface AvailabilitySlot {
  id: string;
  tenant_id: string;

  // When
  slot_date: string;
  start_time: string;
  end_time: string;

  // What
  slot_type: string;
  resource_id?: string;

  // Capacity
  total_capacity: number;
  booked_count: number;

  // Status
  status: SlotStatus;

  // Pricing override
  price_override_cents?: number;

  // Auto-generated vs manual
  is_generated: boolean;
  template_id?: string;

  // Notes
  notes?: string;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationChannel = "email" | "sms" | "push" | "in_app";

export type NotificationType =
  | "booking_confirmation"
  | "booking_reminder_24h"
  | "booking_reminder_1h"
  | "booking_modified"
  | "booking_cancelled"
  | "booking_rescheduled"
  | "missed_call_followup"
  | "thank_you"
  | "review_request"
  | "marketing"
  | "custom";

export type NotificationStatus =
  | "pending"
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "failed"
  | "cancelled";

export interface Notification {
  id: string;
  tenant_id: string;
  contact_id?: string;

  // Channel
  channel: NotificationChannel;

  // Type
  notification_type: NotificationType;

  // Status
  status: NotificationStatus;

  // Recipient
  recipient: string;
  recipient_name?: string;

  // Content
  subject?: string;
  body: string;
  body_html?: string;

  // Template reference
  template_id?: string;
  template_variables: Record<string, unknown>;

  // Scheduling
  scheduled_at?: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;

  // Related records
  booking_id?: string;
  call_id?: string;

  // Provider tracking
  provider?: string;
  provider_message_id?: string;

  // Error handling
  error_message?: string;
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;

  // Metadata
  metadata: Record<string, unknown>;

  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: string;
  tenant_id: string;

  // Identity
  name: string;
  notification_type: NotificationType;
  channel: "email" | "sms";

  // Content
  subject_template?: string;
  body_template: string;
  body_html_template?: string;

  // Settings
  is_active: boolean;
  is_default: boolean;

  // Variables available
  available_variables: string[];

  // Preview
  preview_data: Record<string, unknown>;

  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  tenant_id: string;

  // Which notification type
  notification_type: NotificationType;

  // Channel settings
  email_enabled: boolean;
  sms_enabled: boolean;

  // Timing (for reminders)
  reminder_hours_before: number[];

  // Template overrides
  email_template_id?: string;
  sms_template_id?: string;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// AUDIT TYPES
// ============================================================================

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "export"
  | "import"
  | "login"
  | "logout"
  | "view"
  | "search";

export interface AuditLog {
  id: string;
  tenant_id?: string;

  user_id?: string;
  action: AuditAction;
  resource_type: string;
  resource_id?: string;

  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;

  ip_address?: string;
  user_agent?: string;

  created_at: string;
}

// ============================================================================
// INPUT/CREATE TYPES
// ============================================================================

export interface CreateContactInput {
  phone: string;
  email?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  source?: ContactSource;
  source_details?: Record<string, unknown>;
  tags?: string[];
  notes?: string;
  custom_fields?: Record<string, unknown>;
}

export interface UpdateContactInput {
  email?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  status?: ContactStatus;
  lead_status?: LeadStatus;
  preferred_contact_method?: ContactMethod;
  preferred_contact_time?: string;
  preferred_language?: string;
  timezone?: string;
  do_not_call?: boolean;
  do_not_sms?: boolean;
  do_not_email?: boolean;
  marketing_opt_in?: boolean;
  tags?: string[];
  notes?: string;
  custom_fields?: Record<string, unknown>;
}

export interface CreateNoteInput {
  contact_id: string;
  note_type?: NoteType;
  content: string;
  call_id?: string;
  booking_id?: string;
  is_pinned?: boolean;
  is_private?: boolean;
}

export interface CreateResourceInput {
  name: string;
  type: ResourceType;
  description?: string;
  capacity?: number;
  default_duration_minutes?: number;
  accepts_bookings?: boolean;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateSlotInput {
  slot_date: string;
  start_time: string;
  end_time: string;
  slot_type?: string;
  resource_id?: string;
  total_capacity?: number;
  price_override_cents?: number;
  notes?: string;
}

export interface SendNotificationInput {
  contact_id?: string;
  channel: NotificationChannel;
  notification_type: NotificationType;
  recipient: string;
  recipient_name?: string;
  subject?: string;
  body: string;
  body_html?: string;
  template_id?: string;
  template_variables?: Record<string, unknown>;
  scheduled_at?: string;
  booking_id?: string;
  call_id?: string;
}

// ============================================================================
// QUERY/FILTER TYPES
// ============================================================================

export interface ContactFilters {
  search?: string;
  status?: ContactStatus | ContactStatus[];
  lead_status?: LeadStatus | LeadStatus[];
  tags?: string[];
  source?: ContactSource | ContactSource[];
  has_bookings?: boolean;
  has_calls?: boolean;
  created_after?: string;
  created_before?: string;
  last_contact_after?: string;
  last_contact_before?: string;
}

export interface BookingFilters {
  status?: string | string[];
  contact_id?: string;
  resource_id?: string;
  start_date?: string;
  end_date?: string;
  booking_type?: string;
}

export interface NotificationFilters {
  status?: NotificationStatus | NotificationStatus[];
  channel?: NotificationChannel | NotificationChannel[];
  notification_type?: NotificationType | NotificationType[];
  contact_id?: string;
  booking_id?: string;
  sent_after?: string;
  sent_before?: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

// ============================================================================
// CALENDAR TYPES
// ============================================================================

export type CalendarView = "month" | "week" | "day";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  status: string;
  contact_name?: string;
  contact_phone?: string;
  resource_name?: string;
  booking_type?: string;
  confirmation_code?: string;
}

export interface CalendarData {
  events: CalendarEvent[];
  start_date: string;
  end_date: string;
  view: CalendarView;
}

export interface DaySummary {
  date: string;
  total_bookings: number;
  confirmed_bookings: number;
  pending_bookings: number;
  cancelled_bookings: number;
  available_slots: number;
  total_slots: number;
  revenue_cents: number;
}

// ============================================================================
// IMPORT/EXPORT TYPES
// ============================================================================

export interface ContactImportRecord {
  phone: string;
  email?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  tags?: string | string[];
  notes?: string;
  custom_fields?: Record<string, unknown>;
}

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface ExportOptions {
  format: "csv" | "json";
  fields?: string[];
  filters?: ContactFilters;
  include_notes?: boolean;
  include_activity?: boolean;
}

// ============================================================================
// EXTENDED BOOKING TYPE (with CRM fields)
// ============================================================================

export interface BookingWithCRM {
  id: string;
  created_at: string;
  updated_at: string;

  // References
  tenant_id: string;
  call_id?: string;
  contact_id?: string;
  resource_id?: string;
  slot_id?: string;

  // Customer
  customer_name: string;
  customer_phone: string;
  customer_email?: string;

  // Booking details
  booking_type: string;
  booking_date: string;
  booking_time: string;
  duration_minutes?: number;
  notes?: string;

  // Status
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  confirmation_code: string;

  // Pricing
  amount_cents?: number;

  // Reminders
  reminder_sent: boolean;
  reminder_sent_at?: string;

  // CRM fields
  source: "call" | "web" | "manual" | "api";
  rescheduled_from?: string;
  rescheduled_count: number;

  // Joined data
  contact?: Contact;
  resource?: Resource;
}

// ============================================================================
// EXTENDED CALL TYPE (with CRM fields)
// ============================================================================

export interface CallWithCRM {
  id: string;
  created_at: string;
  updated_at: string;

  // References
  tenant_id: string;
  vapi_call_id: string; // SignalWire call SID (legacy column name)
  contact_id?: string;

  // Call details
  caller_phone?: string;
  caller_name?: string;
  direction: "inbound" | "outbound";
  status: "ringing" | "connected" | "completed" | "failed" | "missed";

  // Timing
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;

  // Outcome
  ended_reason?: string;
  outcome_type?: "booking" | "inquiry" | "support" | "escalation" | "hangup";
  outcome_success?: boolean;

  // AI analysis
  transcript?: string;
  summary?: string;
  sentiment_score?: number;
  intents_detected?: string[];

  // Recording
  recording_url?: string;

  // Cost tracking
  cost_cents?: number;

  // Joined data
  contact?: Contact;
}

// ============================================================================
// DEAL TYPES
// ============================================================================

// Industry-specific stages -- validated per-industry in routes/services
export type DealStage = string;
export type DealSource = "call" | "web" | "manual" | "import";

export interface Deal {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  company?: string;
  stage: DealStage;
  sort_index: number;
  amount_cents: number;
  expected_close?: string;
  contact_id?: string;
  call_id?: string;
  source: DealSource;
  created_by?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
  // Joined
  contact_name?: string;
}

export interface CreateDealInput {
  name: string;
  description?: string;
  company?: string;
  stage?: DealStage;
  amount_cents?: number;
  expected_close?: string;
  contact_id?: string;
  call_id?: string;
  source?: DealSource;
  created_by?: string;
}

export interface UpdateDealInput {
  name?: string;
  description?: string;
  company?: string;
  stage?: DealStage;
  amount_cents?: number;
  expected_close?: string;
  contact_id?: string;
}

export interface DealFilters {
  search?: string;
  stage?: DealStage | DealStage[];
  contact_id?: string;
  source?: DealSource | DealSource[];
  start_date?: string;
  end_date?: string;
}

export interface PipelineStage {
  stage: DealStage;
  count: number;
  total_amount_cents: number;
  deals: Deal[];
}

// ============================================================================
// TASK TYPES
// ============================================================================

// Industry-specific task types -- validated per-industry in routes/services
export type TaskType = string;
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskSource = "manual" | "auto" | "voice_agent";

export interface Task {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  due_date: string;
  due_time?: string;
  done_at?: string;
  contact_id?: string;
  deal_id?: string;
  call_id?: string;
  assigned_to?: string;
  created_by?: string;
  source: TaskSource;
  created_at: string;
  updated_at: string;
  // Joined
  contact_name?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  type?: TaskType;
  priority?: TaskPriority;
  due_date: string;
  due_time?: string;
  contact_id?: string;
  deal_id?: string;
  call_id?: string;
  assigned_to?: string;
  created_by?: string;
  source?: TaskSource;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  type?: TaskType;
  priority?: TaskPriority;
  due_date?: string;
  due_time?: string;
  contact_id?: string;
  deal_id?: string;
  assigned_to?: string;
}

export interface TaskFilters {
  status?: "pending" | "done" | "overdue";
  type?: TaskType | TaskType[];
  priority?: TaskPriority | TaskPriority[];
  contact_id?: string;
  deal_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface TaskCounts {
  pending: number;
  overdue: number;
  due_today: number;
  completed_this_week: number;
}
