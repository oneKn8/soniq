/**
 * Built-in Calendar Service
 * Implements CalendarService interface using Soniq's own bookings table
 */

import type {
  CalendarService,
  TimeSlot,
  BookingRequest,
  BookingConfirmation,
  DateRange,
} from "./types.js";
import { queryOne, queryAll } from "../database/client.js";
import { insertOne, updateOne } from "../database/query-helpers.js";

interface OperatingHours {
  [day: string]: {
    open: string;
    close: string;
    closed?: boolean;
  };
}

interface ExistingBooking {
  id: string;
  booking_date: string;
  booking_time: string;
  duration_minutes: number | null;
  status: string;
}

interface TenantData {
  operating_hours: OperatingHours | null;
}

interface BookingRow {
  id: string;
  tenant_id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  booking_date: string;
  booking_time: string;
  booking_type: string;
  duration_minutes: number | null;
  notes: string | null;
  status: string;
  confirmation_code: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export class BuiltinCalendarService implements CalendarService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  async checkAvailability(
    _tenantId: string,
    dateRange: DateRange,
  ): Promise<TimeSlot[]> {
    // Get existing bookings
    const startDate = dateRange.start.split("T")[0];
    const endDate = dateRange.end.split("T")[0];

    const bookings = await queryAll<ExistingBooking>(
      `SELECT id, booking_date, booking_time, duration_minutes, status
       FROM bookings
       WHERE tenant_id = $1
         AND booking_date >= $2
         AND booking_date <= $3
         AND status != $4`,
      [this.tenantId, startDate, endDate, "cancelled"],
    );

    // Get tenant operating hours
    const tenant = await queryOne<TenantData>(
      `SELECT operating_hours FROM tenants WHERE id = $1`,
      [this.tenantId],
    );

    return this.generateSlots(
      dateRange,
      bookings,
      tenant?.operating_hours ?? null,
    );
  }

  async createBooking(
    _tenantId: string,
    booking: BookingRequest,
  ): Promise<BookingConfirmation> {
    // Generate confirmation code
    const confirmationCode = this.generateConfirmationCode();

    // Parse date and time from ISO string
    const bookingDate = booking.startTime.split("T")[0];
    const bookingTime = booking.startTime.split("T")[1].substring(0, 5);

    // Calculate duration in minutes
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    const durationMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / 60000,
    );

    try {
      const data = await insertOne<BookingRow>("bookings", {
        tenant_id: this.tenantId,
        customer_name: booking.customerName,
        customer_phone: booking.customerPhone,
        customer_email: booking.customerEmail,
        booking_date: bookingDate,
        booking_time: bookingTime,
        booking_type: booking.service || "appointment",
        duration_minutes: durationMinutes,
        notes: booking.notes,
        status: "confirmed",
        confirmation_code: confirmationCode,
        source: "call",
      });

      return {
        id: data.id,
        status: "confirmed",
        startTime: booking.startTime,
        endTime: booking.endTime,
      };
    } catch (error) {
      console.error("[BUILTIN_CALENDAR] Booking creation failed:", error);
      throw new Error(
        `Failed to create booking: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async cancelBooking(_tenantId: string, bookingId: string): Promise<boolean> {
    try {
      const result = await updateOne<BookingRow>(
        "bookings",
        {
          status: "cancelled",
          updated_at: new Date().toISOString(),
        },
        {
          tenant_id: this.tenantId,
          id: bookingId,
        },
      );

      if (!result) {
        throw new Error("Booking not found");
      }

      return true;
    } catch (error) {
      console.error("[BUILTIN_CALENDAR] Booking cancellation failed:", error);
      throw new Error(
        `Failed to cancel booking: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getBookings(
    _tenantId: string,
    dateRange: DateRange,
  ): Promise<BookingConfirmation[]> {
    const startDate = dateRange.start.split("T")[0];
    const endDate = dateRange.end.split("T")[0];

    try {
      const data = await queryAll<ExistingBooking>(
        `SELECT id, booking_date, booking_time, duration_minutes, status
         FROM bookings
         WHERE tenant_id = $1
           AND booking_date >= $2
           AND booking_date <= $3
         ORDER BY booking_date, booking_time`,
        [this.tenantId, startDate, endDate],
      );

      return data.map((booking: ExistingBooking) => {
        const startDateTime = `${booking.booking_date}T${booking.booking_time}:00`;
        const duration = booking.duration_minutes || 30;
        const endDateTime = new Date(
          new Date(startDateTime).getTime() + duration * 60000,
        ).toISOString();

        return {
          id: booking.id,
          status:
            booking.status === "cancelled"
              ? ("pending" as const)
              : ("confirmed" as const),
          startTime: new Date(startDateTime).toISOString(),
          endTime: endDateTime,
        };
      });
    } catch (error) {
      console.error("[BUILTIN_CALENDAR] Failed to get bookings:", error);
      throw new Error(
        `Failed to get bookings: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Generate time slots based on operating hours and existing bookings
   */
  private generateSlots(
    dateRange: DateRange,
    bookings: ExistingBooking[],
    operatingHours: OperatingHours | null,
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const slotDuration = 30; // minutes

    // Default business hours if none configured
    const defaultHours: { open: string; close: string; closed?: boolean } = {
      open: "09:00",
      close: "17:00",
      closed: false,
    };

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const dayName = dayNames[dayOfWeek];
      const dateStr = currentDate.toISOString().split("T")[0];

      // Get operating hours for this day
      const dayHours = operatingHours?.[dayName] || defaultHours;

      // Skip if closed
      if (dayHours.closed) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Parse open/close times
      const [openHour, openMinute] = dayHours.open.split(":").map(Number);
      const [closeHour, closeMinute] = dayHours.close.split(":").map(Number);

      // Get bookings for this day
      const dayBookings = bookings.filter((b) => b.booking_date === dateStr);

      // Generate slots for the day
      let hour = openHour;
      let minute = openMinute;

      while (hour < closeHour || (hour === closeHour && minute < closeMinute)) {
        const slotStart = new Date(currentDate);
        slotStart.setHours(hour, minute, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

        // Check if within requested range
        if (slotStart >= startDate && slotEnd <= endDate) {
          // Check if slot conflicts with existing booking
          const isBooked = dayBookings.some((booking) => {
            const bookingStart = booking.booking_time;
            const bookingDuration = booking.duration_minutes || 30;

            // Parse booking times
            const [bHour, bMin] = bookingStart.split(":").map(Number);
            const bookingStartTime = new Date(currentDate);
            bookingStartTime.setHours(bHour, bMin, 0, 0);

            const bookingEndTime = new Date(bookingStartTime);
            bookingEndTime.setMinutes(
              bookingEndTime.getMinutes() + bookingDuration,
            );

            // Check overlap
            return slotStart < bookingEndTime && slotEnd > bookingStartTime;
          });

          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            available: !isBooked,
          });
        }

        // Move to next slot
        minute += slotDuration;
        if (minute >= 60) {
          hour += Math.floor(minute / 60);
          minute = minute % 60;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  /**
   * Generate a unique confirmation code
   */
  private generateConfirmationCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
