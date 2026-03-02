// Booking Service - CRM booking management
import { queryOne, queryAll } from "../database/client.js";
import {
  insertOne,
  updateOne,
  rpc,
  paginatedQuery,
} from "../database/query-helpers.js";
import {
  BookingFilters,
  PaginationParams,
  PaginatedResult,
  CalendarEvent,
  DaySummary,
} from "../../types/crm.js";
import { Booking } from "../../types/database.js";

export async function createBooking(
  tenantId: string,
  data: {
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
  },
): Promise<Booking> {
  const confirmationCode = generateConfirmationCode();

  const booking = await insertOne<Booking>("bookings", {
    tenant_id: tenantId,
    ...data,
    confirmation_code: confirmationCode,
    status: "pending",
    reminder_sent: false,
  });

  // Update slot booked_count if slot_id provided
  if (data.slot_id) {
    await rpc("increment_slot_booked", { p_slot_id: data.slot_id });
  }

  return booking;
}

export async function getBooking(
  tenantId: string,
  id: string,
): Promise<Booking | null> {
  return queryOne<Booking>(
    "SELECT * FROM bookings WHERE tenant_id = $1 AND id = $2",
    [tenantId, id],
  );
}

export async function updateBooking(
  tenantId: string,
  id: string,
  updates: Partial<Booking>,
): Promise<Booking> {
  delete (updates as any).id;
  delete (updates as any).tenant_id;
  delete (updates as any).confirmation_code;

  const result = await updateOne<Booking>("bookings", updates, {
    tenant_id: tenantId,
    id,
  });

  if (!result) {
    throw new Error("Failed to update booking: not found");
  }

  return result;
}

export async function cancelBooking(
  tenantId: string,
  id: string,
  reason?: string,
): Promise<Booking> {
  const booking = await getBooking(tenantId, id);
  if (!booking) throw new Error("Booking not found");

  // Release slot if exists
  if (booking.slot_id) {
    await rpc("decrement_slot_booked", { p_slot_id: booking.slot_id });
  }

  return updateBooking(tenantId, id, {
    status: "cancelled",
    notes: reason
      ? `${booking.notes || ""}\nCancelled: ${reason}`.trim()
      : booking.notes,
  });
}

export async function rescheduleBooking(
  tenantId: string,
  id: string,
  newDate: string,
  newTime: string,
  newSlotId?: string,
): Promise<Booking> {
  const booking = await getBooking(tenantId, id);
  if (!booking) throw new Error("Booking not found");

  // Release old slot
  if (booking.slot_id) {
    await rpc("decrement_slot_booked", { p_slot_id: booking.slot_id });
  }

  // Reserve new slot
  if (newSlotId) {
    await rpc("increment_slot_booked", { p_slot_id: newSlotId });
  }

  return updateBooking(tenantId, id, {
    booking_date: newDate,
    booking_time: newTime,
    slot_id: newSlotId,
    rescheduled_from: id,
    rescheduled_count: (booking.rescheduled_count || 0) + 1,
  });
}

export async function searchBookings(
  tenantId: string,
  filters: BookingFilters = {},
  pagination: PaginationParams = {},
): Promise<PaginatedResult<Booking>> {
  const limit = pagination.limit || 20;
  const offset = pagination.offset || 0;
  const sortBy = pagination.sort_by || "booking_date";
  const sortOrder = pagination.sort_order || "asc";

  // Build WHERE clause dynamically
  const conditions: string[] = ["tenant_id = $1"];
  const params: unknown[] = [tenantId];
  let paramIndex = 2;

  if (filters.status) {
    const statuses = Array.isArray(filters.status)
      ? filters.status
      : [filters.status];
    conditions.push(`status = ANY($${paramIndex})`);
    params.push(statuses);
    paramIndex++;
  }

  if (filters.contact_id) {
    conditions.push(`contact_id = $${paramIndex}`);
    params.push(filters.contact_id);
    paramIndex++;
  }

  if (filters.resource_id) {
    conditions.push(`resource_id = $${paramIndex}`);
    params.push(filters.resource_id);
    paramIndex++;
  }

  if (filters.start_date) {
    conditions.push(`booking_date >= $${paramIndex}`);
    params.push(filters.start_date);
    paramIndex++;
  }

  if (filters.end_date) {
    conditions.push(`booking_date <= $${paramIndex}`);
    params.push(filters.end_date);
    paramIndex++;
  }

  if (filters.booking_type) {
    conditions.push(`booking_type = $${paramIndex}`);
    params.push(filters.booking_type);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  return paginatedQuery<Booking>("bookings", {
    select: "*",
    whereRaw: { clause: whereClause, params },
    orderBy: sortBy,
    orderDir: sortOrder,
    limit,
    offset,
  });
}

export async function getCalendarData(
  tenantId: string,
  startDate: string,
  endDate: string,
): Promise<CalendarEvent[]> {
  const data = await queryAll<{
    id: string;
    customer_name: string;
    customer_phone: string;
    booking_date: string;
    booking_time: string;
    duration_minutes: number | null;
    status: string;
    booking_type: string;
    confirmation_code: string;
  }>(
    `SELECT id, customer_name, customer_phone, booking_date, booking_time,
            duration_minutes, status, booking_type, confirmation_code
     FROM bookings
     WHERE tenant_id = $1
       AND booking_date >= $2
       AND booking_date <= $3
       AND status = ANY($4)
     ORDER BY booking_date, booking_time`,
    [tenantId, startDate, endDate, ["pending", "confirmed"]],
  );

  return data.map((b) => ({
    id: b.id,
    title: b.customer_name,
    start: `${b.booking_date}T${b.booking_time}`,
    end: `${b.booking_date}T${addMinutes(b.booking_time, b.duration_minutes || 60)}`,
    status: b.status,
    contact_name: b.customer_name,
    contact_phone: b.customer_phone,
    booking_type: b.booking_type,
    confirmation_code: b.confirmation_code,
  }));
}

export async function getDaySummary(
  tenantId: string,
  date: string,
): Promise<DaySummary> {
  const bookings = await queryAll<{
    status: string;
    amount_cents: number | null;
  }>(
    "SELECT status, amount_cents FROM bookings WHERE tenant_id = $1 AND booking_date = $2",
    [tenantId, date],
  );

  return {
    date,
    total_bookings: bookings.length,
    confirmed_bookings: bookings.filter((b) => b.status === "confirmed").length,
    pending_bookings: bookings.filter((b) => b.status === "pending").length,
    cancelled_bookings: bookings.filter((b) => b.status === "cancelled").length,
    available_slots: 0, // To be filled from availability
    total_slots: 0,
    revenue_cents: bookings
      .filter((b) => b.status === "completed")
      .reduce((sum, b) => sum + (b.amount_cents || 0), 0),
  };
}

export async function confirmBooking(
  tenantId: string,
  id: string,
): Promise<Booking> {
  return updateBooking(tenantId, id, { status: "confirmed" });
}

export async function markCompleted(
  tenantId: string,
  id: string,
): Promise<Booking> {
  return updateBooking(tenantId, id, { status: "completed" });
}

export async function markNoShow(
  tenantId: string,
  id: string,
): Promise<Booking> {
  return updateBooking(tenantId, id, { status: "no_show" });
}

export async function getUpcomingBookings(
  tenantId: string,
  hoursAhead: number = 24,
): Promise<Booking[]> {
  const now = new Date();
  const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  return queryAll<Booking>(
    `SELECT * FROM bookings
     WHERE tenant_id = $1
       AND status = ANY($2)
       AND booking_date >= $3
       AND booking_date <= $4
     ORDER BY booking_date, booking_time`,
    [
      tenantId,
      ["pending", "confirmed"],
      now.toISOString().split("T")[0],
      future.toISOString().split("T")[0],
    ],
  );
}

function generateConfirmationCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
