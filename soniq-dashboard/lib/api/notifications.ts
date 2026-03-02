/**
 * Notifications API client
 * Notification queue, templates, and preferences
 */

import { get, post, put } from "./client";
import type {
  Notification,
  NotificationTemplate,
  NotificationPreferences,
  NotificationFilters,
  NotificationType,
  NotificationChannel,
  PaginationParams,
  PaginatedResult,
  SendNotificationInput,
  CreateTemplateInput,
  UpdateTemplateInput,
} from "@/types/crm";

// ============================================================================
// API Types
// ============================================================================

interface TemplatesResponse {
  templates: NotificationTemplate[];
}

interface PreferencesResponse {
  preferences: NotificationPreferences[];
}

interface PreviewResponse {
  subject?: string;
  body: string;
  body_html?: string;
}

interface ProcessQueueResponse {
  processed: number;
  retried: number;
}

// ============================================================================
// NOTIFICATIONS - LIST & GET
// ============================================================================

/**
 * List notifications with filters and pagination
 */
export async function listNotifications(
  filters?: NotificationFilters,
  pagination?: PaginationParams,
): Promise<PaginatedResult<Notification>> {
  const params: Record<string, string> = {};

  // Add filters
  if (filters?.status) {
    params.status = Array.isArray(filters.status)
      ? filters.status.join(",")
      : filters.status;
  }
  if (filters?.channel) {
    params.channel = Array.isArray(filters.channel)
      ? filters.channel.join(",")
      : filters.channel;
  }
  if (filters?.notification_type) {
    params.notification_type = Array.isArray(filters.notification_type)
      ? filters.notification_type.join(",")
      : filters.notification_type;
  }
  if (filters?.contact_id) params.contact_id = filters.contact_id;
  if (filters?.booking_id) params.booking_id = filters.booking_id;
  if (filters?.sent_after) params.sent_after = filters.sent_after;
  if (filters?.sent_before) params.sent_before = filters.sent_before;

  // Add pagination
  if (pagination?.limit) params.limit = String(pagination.limit);
  if (pagination?.offset) params.offset = String(pagination.offset);

  return get<PaginatedResult<Notification>>("/api/notifications", params);
}

/**
 * Get a single notification by ID
 */
export async function getNotification(id: string): Promise<Notification> {
  return get<Notification>(`/api/notifications/${id}`);
}

// ============================================================================
// NOTIFICATIONS - SEND
// ============================================================================

/**
 * Send a notification (queue it for delivery)
 */
export async function sendNotification(
  input: SendNotificationInput,
): Promise<Notification> {
  return post<Notification>("/api/notifications/send", input);
}

/**
 * Preview a notification with template rendering
 */
export async function previewNotification(options: {
  template_id?: string;
  notification_type?: NotificationType;
  channel?: NotificationChannel;
  variables?: Record<string, unknown>;
}): Promise<PreviewResponse> {
  return post<PreviewResponse>("/api/notifications/preview", options);
}

// ============================================================================
// TEMPLATES
// ============================================================================

/**
 * List all notification templates
 */
export async function listTemplates(): Promise<TemplatesResponse> {
  return get<TemplatesResponse>("/api/notifications/templates");
}

/**
 * Create a new template
 */
export async function createTemplate(
  input: CreateTemplateInput,
): Promise<NotificationTemplate> {
  return post<NotificationTemplate>("/api/notifications/templates", input);
}

/**
 * Update a template
 */
export async function updateTemplate(
  id: string,
  input: UpdateTemplateInput,
): Promise<NotificationTemplate> {
  return put<NotificationTemplate>(`/api/notifications/templates/${id}`, input);
}

// ============================================================================
// PREFERENCES
// ============================================================================

/**
 * Get notification preferences
 */
export async function getPreferences(): Promise<PreferencesResponse> {
  return get<PreferencesResponse>("/api/notifications/preferences");
}

/**
 * Update notification preferences
 */
export async function updatePreferences(
  preferences: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  return put<NotificationPreferences>(
    "/api/notifications/preferences",
    preferences,
  );
}

// ============================================================================
// QUEUE MANAGEMENT (Internal/Admin)
// ============================================================================

/**
 * Process the notification queue (trigger immediate processing)
 */
export async function processQueue(): Promise<ProcessQueueResponse> {
  return post<ProcessQueueResponse>("/api/notifications/process-queue");
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get notification type display label
 */
export function getNotificationTypeLabel(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    booking_confirmation: "Booking Confirmation",
    booking_reminder_24h: "24h Reminder",
    booking_reminder_1h: "1h Reminder",
    booking_modified: "Booking Modified",
    booking_cancelled: "Booking Cancelled",
    booking_rescheduled: "Booking Rescheduled",
    missed_call_followup: "Missed Call Follow-up",
    thank_you: "Thank You",
    review_request: "Review Request",
    marketing: "Marketing",
    custom: "Custom",
  };
  return labels[type] || type;
}

/**
 * Get notification status display info
 */
export function getNotificationStatusInfo(status: Notification["status"]): {
  label: string;
  color: string;
} {
  const statusMap: Record<
    Notification["status"],
    { label: string; color: string }
  > = {
    pending: { label: "Pending", color: "zinc" },
    queued: { label: "Queued", color: "blue" },
    sending: { label: "Sending", color: "indigo" },
    sent: { label: "Sent", color: "emerald" },
    delivered: { label: "Delivered", color: "green" },
    opened: { label: "Opened", color: "teal" },
    clicked: { label: "Clicked", color: "cyan" },
    bounced: { label: "Bounced", color: "amber" },
    failed: { label: "Failed", color: "red" },
    cancelled: { label: "Cancelled", color: "zinc" },
  };
  return statusMap[status] || { label: status, color: "zinc" };
}

/**
 * Get channel icon name
 */
export function getChannelIcon(channel: NotificationChannel): string {
  const icons: Record<NotificationChannel, string> = {
    email: "Mail",
    sms: "MessageSquare",
    push: "Bell",
    in_app: "Inbox",
  };
  return icons[channel] || "Send";
}
