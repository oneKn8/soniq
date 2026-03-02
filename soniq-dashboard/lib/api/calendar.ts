/**
 * Calendar API client
 * Bookings, calendar events, and availability
 */

import { get, post, put, patch, del } from "./client";
import type {
  Booking,
  CalendarEvent,
  CalendarView,
  DaySummary,
  AvailabilitySlot,
  PaginationParams,
  PaginatedResult,
} from "@/types/crm";

// ============================================================================
// API Types
// ============================================================================

interface CreateBookingInput {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  booking_type: string;
  booking_date: string;
  booking_time: string;
  duration_minutes?: number;
  notes?: string;
  amount_cents?: number;
  contact_id?: string;
  resource_id?: string;
  slot_id?: string;
  call_id?: string;
  source?: "call" | "web" | "manual" | "api";
}

interface UpdateBookingInput {
  customer_name?: string;
  customer_email?: string;
  booking_type?: string;
  booking_date?: string;
  booking_time?: string;
  duration_minutes?: number;
  notes?: string;
  amount_cents?: number;
  resource_id?: string;
  status?: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
}

interface BookingFilters {
  status?: string | string[];
  contact_id?: string;
  resource_id?: string;
  start_date?: string;
  end_date?: string;
  date?: string;
  booking_type?: string;
}

interface BookingsListResponse {
  bookings: Booking[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

interface CalendarEventsResponse {
  events: CalendarEvent[];
}

interface UpcomingBookingsResponse {
  bookings: Booking[];
}

interface RescheduleInput {
  new_date: string;
  new_time: string;
  new_slot_id?: string;
}

// ============================================================================
// BOOKINGS - LIST & SEARCH
// ============================================================================

/**
 * List bookings with filters and pagination
 */
export async function listBookings(
  filters?: BookingFilters,
  pagination?: PaginationParams,
): Promise<BookingsListResponse> {
  const params: Record<string, string> = {};

  // Add filters
  if (filters?.status) {
    params.status = Array.isArray(filters.status)
      ? filters.status.join(",")
      : filters.status;
  }
  if (filters?.contact_id) params.contact_id = filters.contact_id;
  if (filters?.resource_id) params.resource_id = filters.resource_id;
  if (filters?.start_date) params.start_date = filters.start_date;
  if (filters?.end_date) params.end_date = filters.end_date;
  if (filters?.date) params.date = filters.date;
  if (filters?.booking_type) params.booking_type = filters.booking_type;

  // Add pagination
  if (pagination?.limit) params.limit = String(pagination.limit);
  if (pagination?.offset) params.offset = String(pagination.offset);
  if (pagination?.sort_by) params.sort_by = pagination.sort_by;
  if (pagination?.sort_order) params.sort_order = pagination.sort_order;

  return get<BookingsListResponse>("/api/bookings", params);
}

/**
 * Get upcoming bookings (next N hours)
 */
export async function getUpcomingBookings(
  hours: number = 24,
): Promise<UpcomingBookingsResponse> {
  return get<UpcomingBookingsResponse>("/api/bookings/upcoming", {
    hours: String(hours),
  });
}

/**
 * Get calendar events for date range
 */
export async function getCalendarEvents(
  startDate: string,
  endDate: string,
): Promise<CalendarEventsResponse> {
  return get<CalendarEventsResponse>("/api/bookings/calendar", {
    start_date: startDate,
    end_date: endDate,
  });
}

/**
 * Get day summary
 */
export async function getDaySummary(date: string): Promise<DaySummary> {
  return get<DaySummary>("/api/bookings/day-summary", { date });
}

// ============================================================================
// BOOKINGS - CRUD
// ============================================================================

/**
 * Get a single booking by ID
 */
export async function getBooking(id: string): Promise<Booking> {
  return get<Booking>(`/api/bookings/${id}`);
}

/**
 * Create a new booking
 */
export async function createBooking(
  input: CreateBookingInput,
): Promise<Booking> {
  return post<Booking>("/api/bookings", input);
}

/**
 * Update a booking
 */
export async function updateBooking(
  id: string,
  input: UpdateBookingInput,
): Promise<Booking> {
  return put<Booking>(`/api/bookings/${id}`, input);
}

/**
 * Cancel a booking
 */
export async function cancelBooking(
  id: string,
  reason?: string,
): Promise<{ success: boolean }> {
  return del<{ success: boolean }>(`/api/bookings/${id}`);
}

// ============================================================================
// BOOKINGS - STATUS TRANSITIONS
// ============================================================================

/**
 * Confirm a pending booking
 */
export async function confirmBooking(id: string): Promise<Booking> {
  return post<Booking>(`/api/bookings/${id}/confirm`);
}

/**
 * Mark a booking as completed
 */
export async function completeBooking(id: string): Promise<Booking> {
  return post<Booking>(`/api/bookings/${id}/complete`);
}

/**
 * Mark a booking as no-show
 */
export async function markNoShow(id: string): Promise<Booking> {
  return post<Booking>(`/api/bookings/${id}/no-show`);
}

/**
 * Cancel a booking with optional reason (POST version)
 */
export async function cancelBookingWithReason(
  id: string,
  reason?: string,
): Promise<Booking> {
  return post<Booking>(`/api/bookings/${id}/cancel`, { reason });
}

/**
 * Reschedule a booking
 */
export async function rescheduleBooking(
  id: string,
  newDate: string,
  newTime: string,
  newSlotId?: string,
): Promise<Booking> {
  return post<Booking>(`/api/bookings/${id}/reschedule`, {
    new_date: newDate,
    new_time: newTime,
    new_slot_id: newSlotId,
  } as RescheduleInput);
}

// ============================================================================
// AVAILABILITY
// ============================================================================

interface SlotsResponse {
  slots: AvailabilitySlot[];
}

interface AvailabilityCheckResponse {
  available: boolean;
}

interface CreateSlotInput {
  slot_date: string;
  start_time: string;
  end_time: string;
  slot_type?: string;
  resource_id?: string;
  total_capacity?: number;
  price_override_cents?: number;
  notes?: string;
}

interface GenerateSlotsInput {
  start_date: string;
  end_date: string;
  slot_duration_minutes?: number;
}

/**
 * Get available slots for a date
 */
export async function getAvailableSlots(
  date: string,
  options?: { resourceId?: string; slotType?: string },
): Promise<SlotsResponse> {
  const params: Record<string, string> = { date };
  if (options?.resourceId) params.resource_id = options.resourceId;
  if (options?.slotType) params.slot_type = options.slotType;

  return get<SlotsResponse>("/api/availability/slots", params);
}

/**
 * Get available slots for a date range
 */
export async function getAvailableSlotsForRange(
  startDate: string,
  endDate: string,
  resourceId?: string,
): Promise<SlotsResponse> {
  const params: Record<string, string> = {
    start_date: startDate,
    end_date: endDate,
  };
  if (resourceId) params.resource_id = resourceId;

  return get<SlotsResponse>("/api/availability/slots", params);
}

/**
 * Check if a specific time is available
 */
export async function checkAvailability(
  date: string,
  time: string,
  duration?: number,
  resourceId?: string,
): Promise<AvailabilityCheckResponse> {
  const params: Record<string, string> = { date, time };
  if (duration) params.duration = String(duration);
  if (resourceId) params.resource_id = resourceId;

  return get<AvailabilityCheckResponse>("/api/availability/check", params);
}

/**
 * Create a manual slot
 */
export async function createSlot(
  input: CreateSlotInput,
): Promise<AvailabilitySlot> {
  return post<AvailabilitySlot>("/api/availability/slots", input);
}

/**
 * Update a slot
 */
export async function updateSlot(
  id: string,
  input: Partial<CreateSlotInput>,
): Promise<AvailabilitySlot> {
  return put<AvailabilitySlot>(`/api/availability/slots/${id}`, input);
}

/**
 * Block a slot
 */
export async function blockSlot(
  id: string,
  reason?: string,
): Promise<AvailabilitySlot> {
  return patch<AvailabilitySlot>(`/api/availability/slots/${id}/block`, {
    reason,
  });
}

/**
 * Unblock a slot
 */
export async function unblockSlot(id: string): Promise<AvailabilitySlot> {
  return patch<AvailabilitySlot>(`/api/availability/slots/${id}/unblock`);
}

/**
 * Delete a slot
 */
export async function deleteSlot(id: string): Promise<{ success: boolean }> {
  return del<{ success: boolean }>(`/api/availability/slots/${id}`);
}

/**
 * Generate slots from operating hours
 */
export async function generateSlots(
  input: GenerateSlotsInput,
): Promise<{ generated: number }> {
  return post<{ generated: number }>("/api/availability/generate", input);
}

// ============================================================================
// CALENDAR VIEW HELPERS
// ============================================================================

/**
 * Get date range for a calendar view
 */
export function getDateRangeForView(
  date: Date,
  view: CalendarView,
): { startDate: string; endDate: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  switch (view) {
    case "month": {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      // Include days from previous/next month to fill calendar grid
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - startDate.getDay());
      const endDate = new Date(lastDay);
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
      return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      };
    }
    case "week": {
      const dayOfWeek = date.getDay();
      const startDate = new Date(year, month, day - dayOfWeek);
      const endDate = new Date(year, month, day + (6 - dayOfWeek));
      return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      };
    }
    case "day": {
      const dateStr = formatDate(date);
      return { startDate: dateStr, endDate: dateStr };
    }
  }
}

/**
 * Navigate calendar by view
 */
export function navigateCalendar(
  date: Date,
  view: CalendarView,
  direction: "prev" | "next",
): Date {
  const newDate = new Date(date);
  const delta = direction === "next" ? 1 : -1;

  switch (view) {
    case "month":
      newDate.setMonth(newDate.getMonth() + delta);
      break;
    case "week":
      newDate.setDate(newDate.getDate() + delta * 7);
      break;
    case "day":
      newDate.setDate(newDate.getDate() + delta);
      break;
  }

  return newDate;
}
