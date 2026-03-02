/**
 * Pending Bookings Service
 * Handles booking requests that couldn't be directly confirmed
 * Used for assisted mode when no calendar integration is available
 */

import { queryOne, queryAll } from "../database/client.js";
import { insertOne, updateOne } from "../database/query-helpers.js";
import type { BookingRequest, BookingConfirmation } from "./types.js";
import type { PendingBooking } from "../../types/database.js";

export interface PendingBookingWithCall extends PendingBooking {
  calls?: {
    id: string;
    started_at: string;
    transcript?: string;
  };
}

interface PendingBookingRow {
  id: string;
  tenant_id: string;
  call_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  requested_date: string | null;
  requested_time: string | null;
  service: string | null;
  notes: string | null;
  status: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PendingBookingWithCallRow extends PendingBookingRow {
  call_id_joined: string | null;
  call_started_at: string | null;
  call_transcript: string | null;
}

interface BookingRow {
  id: string;
  tenant_id: string;
  call_id: string | null;
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

/**
 * Create a pending booking
 * Called when direct calendar booking fails or is unavailable
 */
export async function createPendingBooking(
  tenantId: string,
  booking: BookingRequest,
  callId?: string,
): Promise<BookingConfirmation> {
  // Parse date and time from ISO string if provided
  const requestedDate = booking.startTime
    ? booking.startTime.split("T")[0]
    : null;
  const requestedTime = booking.startTime
    ? booking.startTime.split("T")[1]?.substring(0, 5)
    : null;

  try {
    const data = await insertOne<PendingBookingRow>("pending_bookings", {
      tenant_id: tenantId,
      call_id: callId || null,
      customer_name: booking.customerName,
      customer_phone: booking.customerPhone,
      customer_email: booking.customerEmail,
      requested_date: requestedDate,
      requested_time: requestedTime,
      service: booking.service,
      notes: booking.notes,
      status: "pending",
    });

    console.log(`[PENDING_BOOKING] Created pending booking ${data.id}`);

    return {
      id: data.id,
      status: "pending",
      startTime: booking.startTime,
      endTime: booking.endTime,
    };
  } catch (error) {
    console.error("[PENDING_BOOKING] Creation failed:", error);
    throw new Error(
      `Failed to create pending booking: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Confirm a pending booking
 * Called by staff when they manually confirm the booking
 */
export async function confirmPendingBooking(
  bookingId: string,
  userId: string,
): Promise<void> {
  try {
    const result = await updateOne<PendingBookingRow>(
      "pending_bookings",
      {
        status: "confirmed",
        confirmed_by: userId,
        confirmed_at: new Date().toISOString(),
      },
      { id: bookingId },
    );

    if (!result) {
      throw new Error("Pending booking not found");
    }

    console.log(
      `[PENDING_BOOKING] Confirmed booking ${bookingId} by ${userId}`,
    );
  } catch (error) {
    console.error("[PENDING_BOOKING] Confirmation failed:", error);
    throw new Error(
      `Failed to confirm pending booking: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Reject a pending booking
 * Called by staff when they cannot fulfill the booking request
 */
export async function rejectPendingBooking(
  bookingId: string,
  userId: string,
  reason?: string,
): Promise<void> {
  try {
    const updateData: Record<string, unknown> = {
      status: "rejected",
      confirmed_by: userId,
      confirmed_at: new Date().toISOString(),
    };

    // Append rejection reason to notes if provided
    if (reason) {
      const existing = await queryOne<{ notes: string | null }>(
        `SELECT notes FROM pending_bookings WHERE id = $1`,
        [bookingId],
      );

      const existingNotes = existing?.notes || "";
      updateData.notes = existingNotes
        ? `${existingNotes}\n\nRejected: ${reason}`
        : `Rejected: ${reason}`;
    }

    const result = await updateOne<PendingBookingRow>(
      "pending_bookings",
      updateData,
      { id: bookingId },
    );

    if (!result) {
      throw new Error("Pending booking not found");
    }

    console.log(`[PENDING_BOOKING] Rejected booking ${bookingId} by ${userId}`);
  } catch (error) {
    console.error("[PENDING_BOOKING] Rejection failed:", error);
    throw new Error(
      `Failed to reject pending booking: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Get pending bookings for a tenant
 */
export async function getPendingBookings(
  tenantId: string,
  status?: string,
): Promise<PendingBookingWithCall[]> {
  try {
    let sql = `
      SELECT
        pb.*,
        c.id as call_id_joined,
        c.started_at as call_started_at,
        c.transcript as call_transcript
      FROM pending_bookings pb
      LEFT JOIN calls c ON pb.call_id = c.id
      WHERE pb.tenant_id = $1
    `;
    const params: unknown[] = [tenantId];

    if (status) {
      sql += ` AND pb.status = $2`;
      params.push(status);
    }

    sql += ` ORDER BY pb.created_at DESC`;

    const rows = await queryAll<PendingBookingWithCallRow>(sql, params);

    return rows.map((row) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      call_id: row.call_id ?? undefined,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone ?? "",
      customer_email: row.customer_email ?? undefined,
      requested_date: row.requested_date ?? undefined,
      requested_time: row.requested_time ?? undefined,
      service: row.service ?? undefined,
      notes: row.notes ?? undefined,
      status: row.status as PendingBooking["status"],
      confirmed_by: row.confirmed_by ?? undefined,
      confirmed_at: row.confirmed_at ?? undefined,
      created_at: row.created_at,
      calls: row.call_id_joined
        ? {
            id: row.call_id_joined,
            started_at: row.call_started_at || "",
            transcript: row.call_transcript ?? undefined,
          }
        : undefined,
    }));
  } catch (error) {
    console.error("[PENDING_BOOKING] Failed to get bookings:", error);
    throw new Error(
      `Failed to get pending bookings: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Get a single pending booking by ID
 */
export async function getPendingBookingById(
  bookingId: string,
  tenantId: string,
): Promise<PendingBookingWithCall | null> {
  try {
    const row = await queryOne<PendingBookingWithCallRow>(
      `SELECT
        pb.*,
        c.id as call_id_joined,
        c.started_at as call_started_at,
        c.transcript as call_transcript
      FROM pending_bookings pb
      LEFT JOIN calls c ON pb.call_id = c.id
      WHERE pb.id = $1 AND pb.tenant_id = $2`,
      [bookingId, tenantId],
    );

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      tenant_id: row.tenant_id,
      call_id: row.call_id ?? undefined,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone ?? "",
      customer_email: row.customer_email ?? undefined,
      requested_date: row.requested_date ?? undefined,
      requested_time: row.requested_time ?? undefined,
      service: row.service ?? undefined,
      notes: row.notes ?? undefined,
      status: row.status as PendingBooking["status"],
      confirmed_by: row.confirmed_by ?? undefined,
      confirmed_at: row.confirmed_at ?? undefined,
      created_at: row.created_at,
      calls: row.call_id_joined
        ? {
            id: row.call_id_joined,
            started_at: row.call_started_at || "",
            transcript: row.call_transcript ?? undefined,
          }
        : undefined,
    };
  } catch (error) {
    console.error("[PENDING_BOOKING] Failed to get booking:", error);
    throw new Error(
      `Failed to get pending booking: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Convert a pending booking to a confirmed booking in the bookings table
 */
export async function convertPendingToConfirmed(
  bookingId: string,
  tenantId: string,
  userId: string,
  confirmedDate?: string,
  confirmedTime?: string,
): Promise<string> {
  // Get the pending booking
  const pending = await getPendingBookingById(bookingId, tenantId);
  if (!pending) {
    throw new Error("Pending booking not found");
  }

  // Use provided date/time or fall back to requested
  const bookingDate = confirmedDate || pending.requested_date;
  const bookingTime = confirmedTime || pending.requested_time;

  if (!bookingDate || !bookingTime) {
    throw new Error("Booking date and time are required");
  }

  // Generate confirmation code
  const confirmationCode = generateConfirmationCode();

  try {
    // Create the confirmed booking
    const booking = await insertOne<BookingRow>("bookings", {
      tenant_id: tenantId,
      call_id: pending.call_id,
      customer_name: pending.customer_name,
      customer_phone: pending.customer_phone,
      customer_email: pending.customer_email,
      booking_date: bookingDate,
      booking_time: bookingTime,
      booking_type: pending.service || "appointment",
      notes: pending.notes,
      status: "confirmed",
      confirmation_code: confirmationCode,
      source: "call",
    });

    // Update pending booking status
    await confirmPendingBooking(bookingId, userId);

    console.log(
      `[PENDING_BOOKING] Converted pending ${bookingId} to confirmed ${booking.id}`,
    );

    return booking.id;
  } catch (error) {
    console.error(
      "[PENDING_BOOKING] Failed to create confirmed booking:",
      error,
    );
    throw new Error(
      `Failed to create booking: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

function generateConfirmationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
