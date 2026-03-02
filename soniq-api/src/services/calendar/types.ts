/**
 * Calendar Service Types
 * Unified interfaces for calendar operations across providers
 */

export interface TimeSlot {
  start: string; // ISO datetime
  end: string;
  available: boolean;
}

export interface BookingRequest {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  service?: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface BookingConfirmation {
  id: string;
  externalId?: string; // ID in external system (Google, Outlook, etc.)
  status: "confirmed" | "pending";
  startTime: string;
  endTime: string;
}

export interface DateRange {
  start: string; // ISO datetime
  end: string;
}

/**
 * Unified calendar service interface
 * All calendar providers must implement this interface
 */
export interface CalendarService {
  /**
   * Check availability for a date range
   * Returns list of time slots with availability status
   */
  checkAvailability(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<TimeSlot[]>;

  /**
   * Create a booking/appointment
   */
  createBooking(
    tenantId: string,
    booking: BookingRequest,
  ): Promise<BookingConfirmation>;

  /**
   * Cancel an existing booking
   */
  cancelBooking(tenantId: string, bookingId: string): Promise<boolean>;

  /**
   * Get bookings for a date range
   */
  getBookings(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<BookingConfirmation[]>;
}

/**
 * Business hours configuration for slot generation
 */
export interface BusinessHours {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  openTime: string; // HH:mm format
  closeTime: string;
  isOpen: boolean;
}

/**
 * Busy period from external calendar
 */
export interface BusyPeriod {
  start: string;
  end: string;
}
