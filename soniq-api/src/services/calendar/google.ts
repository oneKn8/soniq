/**
 * Google Calendar Service Adapter
 * Implements CalendarService interface using Google Calendar API
 */

import { google, calendar_v3 } from "googleapis";
import type {
  CalendarService,
  TimeSlot,
  BookingRequest,
  BookingConfirmation,
  DateRange,
  BusyPeriod,
} from "./types.js";
import type { TenantIntegration } from "../../types/database.js";
import { updateOne } from "../database/query-helpers.js";

interface TenantIntegrationRow {
  id: string;
  tenant_id: string;
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  status: string;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export class GoogleCalendarService implements CalendarService {
  private calendar: calendar_v3.Calendar;
  private integration: TenantIntegration;

  constructor(integration: TenantIntegration) {
    this.integration = integration;

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );

    auth.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
    });

    this.calendar = google.calendar({ version: "v3", auth });
  }

  async checkAvailability(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<TimeSlot[]> {
    try {
      // Get busy times from Google Calendar
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: dateRange.start,
          timeMax: dateRange.end,
          items: [{ id: "primary" }],
        },
      });

      const busySlots =
        (response.data.calendars?.primary?.busy as BusyPeriod[]) || [];

      // Generate available slots based on busy periods
      return this.generateAvailableSlots(dateRange, busySlots);
    } catch (error: unknown) {
      const err = error as { code?: number };
      // Handle token refresh if needed
      if (err.code === 401) {
        await this.refreshToken();
        return this.checkAvailability(tenantId, dateRange);
      }
      throw error;
    }
  }

  async createBooking(
    tenantId: string,
    booking: BookingRequest,
  ): Promise<BookingConfirmation> {
    try {
      const event: calendar_v3.Schema$Event = {
        summary: `${booking.service || "Appointment"} - ${booking.customerName}`,
        description: `Phone: ${booking.customerPhone}\n${booking.notes || ""}`,
        start: { dateTime: booking.startTime },
        end: { dateTime: booking.endTime },
      };

      if (booking.customerEmail) {
        event.attendees = [{ email: booking.customerEmail }];
      }

      const response = await this.calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
        sendUpdates: "all", // Send email notifications
      });

      return {
        id: response.data.id!,
        externalId: response.data.id!,
        status: "confirmed",
        startTime: booking.startTime,
        endTime: booking.endTime,
      };
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err.code === 401) {
        await this.refreshToken();
        return this.createBooking(tenantId, booking);
      }
      throw error;
    }
  }

  async cancelBooking(tenantId: string, bookingId: string): Promise<boolean> {
    try {
      await this.calendar.events.delete({
        calendarId: "primary",
        eventId: bookingId,
        sendUpdates: "all",
      });
      return true;
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err.code === 401) {
        await this.refreshToken();
        return this.cancelBooking(tenantId, bookingId);
      }
      if (err.code === 404) {
        // Event already deleted or doesn't exist
        return true;
      }
      throw error;
    }
  }

  async getBookings(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<BookingConfirmation[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: "primary",
        timeMin: dateRange.start,
        timeMax: dateRange.end,
        singleEvents: true,
        orderBy: "startTime",
      });

      return (response.data.items || []).map((event) => ({
        id: event.id!,
        externalId: event.id!,
        status: "confirmed" as const,
        startTime: event.start?.dateTime || event.start?.date || "",
        endTime: event.end?.dateTime || event.end?.date || "",
      }));
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err.code === 401) {
        await this.refreshToken();
        return this.getBookings(tenantId, dateRange);
      }
      throw error;
    }
  }

  /**
   * Refresh the OAuth access token
   */
  private async refreshToken(): Promise<void> {
    if (!this.integration.refresh_token) {
      throw new Error("No refresh token available");
    }

    const tokenUrl = "https://oauth2.googleapis.com/token";

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        refresh_token: this.integration.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      // Mark integration as expired
      await updateOne<TenantIntegrationRow>(
        "tenant_integrations",
        {
          status: "expired",
          updated_at: new Date().toISOString(),
        },
        { id: this.integration.id },
      );

      throw new Error("Token refresh failed");
    }

    const tokens = (await response.json()) as {
      access_token: string;
      expires_in?: number;
    };

    // Update integration with new token
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    await updateOne<TenantIntegrationRow>(
      "tenant_integrations",
      {
        access_token: tokens.access_token,
        token_expires_at: expiresAt,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { id: this.integration.id },
    );

    // Update internal state
    this.integration.access_token = tokens.access_token;

    // Update OAuth client
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    auth.setCredentials({
      access_token: tokens.access_token,
      refresh_token: this.integration.refresh_token,
    });
    this.calendar = google.calendar({ version: "v3", auth });
  }

  /**
   * Generate available time slots from busy periods
   * Creates 30-minute slots during business hours (9 AM - 5 PM)
   */
  private generateAvailableSlots(
    dateRange: DateRange,
    busySlots: BusyPeriod[],
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const slotDuration = 30; // minutes

    // Default business hours (can be customized per tenant)
    const businessStart = 9; // 9 AM
    const businessEnd = 17; // 5 PM

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    // Iterate through each day in the range
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      // Skip weekends
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Generate slots for the day
        for (let hour = businessStart; hour < businessEnd; hour++) {
          for (let minute = 0; minute < 60; minute += slotDuration) {
            const slotStart = new Date(currentDate);
            slotStart.setHours(hour, minute, 0, 0);

            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

            // Check if slot is within the requested range
            if (slotStart >= startDate && slotEnd <= endDate) {
              // Check if slot conflicts with any busy period
              const isBusy = busySlots.some((busy) => {
                const busyStart = new Date(busy.start);
                const busyEnd = new Date(busy.end);
                return slotStart < busyEnd && slotEnd > busyStart;
              });

              slots.push({
                start: slotStart.toISOString(),
                end: slotEnd.toISOString(),
                available: !isBusy,
              });
            }
          }
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }
}
