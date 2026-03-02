/**
 * Microsoft Outlook Calendar Service Adapter
 * Implements CalendarService interface using Microsoft Graph API
 */

import { Client } from "@microsoft/microsoft-graph-client";
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

interface GraphEvent {
  id: string;
  subject?: string;
  start?: { dateTime: string; timeZone?: string };
  end?: { dateTime: string; timeZone?: string };
  body?: { contentType: string; content: string };
  attendees?: Array<{ emailAddress: { address: string; name?: string } }>;
}

interface ScheduleInformation {
  scheduleId: string;
  scheduleItems: Array<{
    status: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
  }>;
}

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

export class OutlookCalendarService implements CalendarService {
  private client: Client;
  private integration: TenantIntegration;

  constructor(integration: TenantIntegration) {
    this.integration = integration;

    this.client = Client.init({
      authProvider: (done) => {
        done(null, integration.access_token || "");
      },
    });
  }

  async checkAvailability(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<TimeSlot[]> {
    try {
      // Get schedule availability using getSchedule endpoint
      const response = await this.client.api("/me/calendar/getSchedule").post({
        schedules: ["me"],
        startTime: {
          dateTime: dateRange.start,
          timeZone: "UTC",
        },
        endTime: {
          dateTime: dateRange.end,
          timeZone: "UTC",
        },
        availabilityViewInterval: 30, // 30-minute slots
      });

      const scheduleInfo = response.value?.[0] as
        | ScheduleInformation
        | undefined;
      const busySlots: BusyPeriod[] = (scheduleInfo?.scheduleItems || [])
        .filter((item) => item.status !== "free")
        .map((item) => ({
          start: item.start.dateTime,
          end: item.end.dateTime,
        }));

      return this.generateAvailableSlots(dateRange, busySlots);
    } catch (error: unknown) {
      const err = error as { statusCode?: number };
      if (err.statusCode === 401) {
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
      const event: Partial<GraphEvent> = {
        subject: `${booking.service || "Appointment"} - ${booking.customerName}`,
        body: {
          contentType: "text",
          content: `Phone: ${booking.customerPhone}\n${booking.notes || ""}`,
        },
        start: {
          dateTime: booking.startTime,
          timeZone: "UTC",
        },
        end: {
          dateTime: booking.endTime,
          timeZone: "UTC",
        },
      };

      if (booking.customerEmail) {
        event.attendees = [
          {
            emailAddress: {
              address: booking.customerEmail,
              name: booking.customerName,
            },
          },
        ];
      }

      const response = (await this.client
        .api("/me/events")
        .post(event)) as GraphEvent;

      return {
        id: response.id,
        externalId: response.id,
        status: "confirmed",
        startTime: booking.startTime,
        endTime: booking.endTime,
      };
    } catch (error: unknown) {
      const err = error as { statusCode?: number };
      if (err.statusCode === 401) {
        await this.refreshToken();
        return this.createBooking(tenantId, booking);
      }
      throw error;
    }
  }

  async cancelBooking(tenantId: string, bookingId: string): Promise<boolean> {
    try {
      await this.client.api(`/me/events/${bookingId}`).delete();
      return true;
    } catch (error: unknown) {
      const err = error as { statusCode?: number };
      if (err.statusCode === 401) {
        await this.refreshToken();
        return this.cancelBooking(tenantId, bookingId);
      }
      if (err.statusCode === 404) {
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
      const response = await this.client
        .api("/me/calendarView")
        .query({
          startDateTime: dateRange.start,
          endDateTime: dateRange.end,
          $orderby: "start/dateTime",
          $top: 100,
        })
        .get();

      const events = (response.value || []) as GraphEvent[];

      return events.map((event) => ({
        id: event.id,
        externalId: event.id,
        status: "confirmed" as const,
        startTime: event.start?.dateTime || "",
        endTime: event.end?.dateTime || "",
      }));
    } catch (error: unknown) {
      const err = error as { statusCode?: number };
      if (err.statusCode === 401) {
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

    const tokenUrl =
      "https://login.microsoftonline.com/common/oauth2/v2.0/token";

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID || "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
        refresh_token: this.integration.refresh_token,
        grant_type: "refresh_token",
        scope: "https://graph.microsoft.com/Calendars.ReadWrite offline_access",
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
      refresh_token?: string;
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
        refresh_token: tokens.refresh_token || this.integration.refresh_token,
        token_expires_at: expiresAt,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { id: this.integration.id },
    );

    // Update internal state
    this.integration.access_token = tokens.access_token;

    // Reinitialize client with new token
    this.client = Client.init({
      authProvider: (done) => {
        done(null, tokens.access_token);
      },
    });
  }

  /**
   * Generate available time slots from busy periods
   */
  private generateAvailableSlots(
    dateRange: DateRange,
    busySlots: BusyPeriod[],
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const slotDuration = 30; // minutes

    // Default business hours
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
        for (let hour = businessStart; hour < businessEnd; hour++) {
          for (let minute = 0; minute < 60; minute += slotDuration) {
            const slotStart = new Date(currentDate);
            slotStart.setHours(hour, minute, 0, 0);

            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

            if (slotStart >= startDate && slotEnd <= endDate) {
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

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }
}
