/**
 * Calendly Service Adapter
 * Implements CalendarService interface using Calendly API
 *
 * Note: Calendly has limited direct booking capability.
 * Bookings are typically done via Calendly's scheduling pages.
 * This adapter focuses on reading availability and managing existing events.
 */

import type {
  CalendarService,
  TimeSlot,
  BookingRequest,
  BookingConfirmation,
  DateRange,
} from "./types.js";
import type { TenantIntegration } from "../../types/database.js";
import { updateOne } from "../database/query-helpers.js";

const CALENDLY_API_BASE = "https://api.calendly.com";

interface CalendlyUser {
  uri: string;
  name: string;
  email: string;
  scheduling_url: string;
}

interface CalendlyEventType {
  uri: string;
  name: string;
  duration: number;
  scheduling_url: string;
}

interface CalendlyEvent {
  uri: string;
  name: string;
  status: string;
  start_time: string;
  end_time: string;
  event_type: string;
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

export class CalendlyService implements CalendarService {
  private integration: TenantIntegration;
  private userUri: string | null = null;

  constructor(integration: TenantIntegration) {
    this.integration = integration;
  }

  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(`${CALENDLY_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.integration.access_token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (response.status === 401) {
      await this.refreshToken();
      return this.apiRequest<T>(endpoint, options);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Calendly API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  private async getCurrentUser(): Promise<string> {
    if (this.userUri) {
      return this.userUri;
    }

    const response = await this.apiRequest<{ resource: CalendlyUser }>(
      "/users/me",
    );
    this.userUri = response.resource.uri;
    return this.userUri;
  }

  async checkAvailability(
    _tenantId: string,
    dateRange: DateRange,
  ): Promise<TimeSlot[]> {
    try {
      const userUri = await this.getCurrentUser();

      // Get event types for this user
      const eventTypesResponse = await this.apiRequest<{
        collection: CalendlyEventType[];
      }>(`/event_types?user=${encodeURIComponent(userUri)}&active=true`);

      const eventTypes = eventTypesResponse.collection;
      if (eventTypes.length === 0) {
        return [];
      }

      // Get scheduled events (busy times) for the date range
      const eventsResponse = await this.apiRequest<{
        collection: CalendlyEvent[];
      }>(
        `/scheduled_events?user=${encodeURIComponent(userUri)}&min_start_time=${dateRange.start}&max_start_time=${dateRange.end}&status=active`,
      );

      const busyPeriods = eventsResponse.collection.map((event) => ({
        start: event.start_time,
        end: event.end_time,
      }));

      // Generate available slots
      return this.generateAvailableSlots(dateRange, busyPeriods);
    } catch (error) {
      console.error("[CALENDLY] Error checking availability:", error);
      throw error;
    }
  }

  async createBooking(
    _tenantId: string,
    _booking: BookingRequest,
  ): Promise<BookingConfirmation> {
    // Calendly doesn't support direct booking via API for most use cases.
    // Bookings should be done via Calendly's scheduling page.
    // For assisted mode, we create a pending booking instead.
    throw new Error(
      "Direct booking not supported via Calendly API. Use pending booking fallback.",
    );
  }

  async cancelBooking(_tenantId: string, bookingId: string): Promise<boolean> {
    try {
      // Calendly uses URIs as IDs
      const eventUri = bookingId.startsWith("https://")
        ? bookingId
        : `https://api.calendly.com/scheduled_events/${bookingId}`;

      await this.apiRequest(
        `/scheduled_events/${this.extractId(eventUri)}/cancellation`,
        {
          method: "POST",
          body: JSON.stringify({
            reason: "Cancelled via Soniq",
          }),
        },
      );

      return true;
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message?.includes("404")) {
        // Event already cancelled or doesn't exist
        return true;
      }
      throw error;
    }
  }

  async getBookings(
    _tenantId: string,
    dateRange: DateRange,
  ): Promise<BookingConfirmation[]> {
    try {
      const userUri = await this.getCurrentUser();

      const response = await this.apiRequest<{ collection: CalendlyEvent[] }>(
        `/scheduled_events?user=${encodeURIComponent(userUri)}&min_start_time=${dateRange.start}&max_start_time=${dateRange.end}&status=active`,
      );

      return response.collection.map((event) => ({
        id: this.extractId(event.uri),
        externalId: event.uri,
        status: "confirmed" as const,
        startTime: event.start_time,
        endTime: event.end_time,
      }));
    } catch (error) {
      console.error("[CALENDLY] Error getting bookings:", error);
      throw error;
    }
  }

  /**
   * Extract ID from Calendly URI
   */
  private extractId(uri: string): string {
    const parts = uri.split("/");
    return parts[parts.length - 1];
  }

  /**
   * Refresh the OAuth access token
   */
  private async refreshToken(): Promise<void> {
    if (!this.integration.refresh_token) {
      throw new Error("No refresh token available");
    }

    const tokenUrl = "https://auth.calendly.com/oauth/token";

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.CALENDLY_CLIENT_ID || "",
        client_secret: process.env.CALENDLY_CLIENT_SECRET || "",
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
  }

  /**
   * Generate available time slots
   */
  private generateAvailableSlots(
    dateRange: DateRange,
    busyPeriods: Array<{ start: string; end: string }>,
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const slotDuration = 30; // minutes

    // Default business hours
    const businessStart = 9;
    const businessEnd = 17;

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        for (let hour = businessStart; hour < businessEnd; hour++) {
          for (let minute = 0; minute < 60; minute += slotDuration) {
            const slotStart = new Date(currentDate);
            slotStart.setHours(hour, minute, 0, 0);

            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

            if (slotStart >= startDate && slotEnd <= endDate) {
              const isBusy = busyPeriods.some((busy) => {
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
