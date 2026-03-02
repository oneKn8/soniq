/**
 * Pending Bookings API Routes
 * Endpoints for managing pending booking requests (assisted mode)
 */

import { Hono } from "hono";
import { z } from "zod";
import { getAuthUserId, getAuthTenantId } from "../middleware/index.js";
import {
  getPendingBookings,
  getPendingBookingById,
  confirmPendingBooking,
  rejectPendingBooking,
  convertPendingToConfirmed,
} from "../services/calendar/pending.js";

export const pendingBookingsRoutes = new Hono();

// Validation schemas
const rejectSchema = z.object({
  reason: z.string().optional(),
});

const convertSchema = z.object({
  confirmed_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  confirmed_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
});

/**
 * GET /api/pending-bookings
 * Returns list of pending bookings for the tenant
 */
pendingBookingsRoutes.get("/", async (c) => {
  try {
    const tenantId = getAuthTenantId(c);
    const status = c.req.query("status"); // optional filter: pending, confirmed, rejected

    const bookings = await getPendingBookings(tenantId, status);

    return c.json({ bookings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[PENDING_BOOKINGS] GET / error:", error);
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/pending-bookings/stats
 * Returns statistics about pending bookings
 */
pendingBookingsRoutes.get("/stats", async (c) => {
  try {
    const tenantId = getAuthTenantId(c);

    // Get all pending bookings and calculate stats
    const allBookings = await getPendingBookings(tenantId);

    const stats = {
      total: allBookings.length,
      pending: allBookings.filter((b) => b.status === "pending").length,
      confirmed: allBookings.filter((b) => b.status === "confirmed").length,
      rejected: allBookings.filter((b) => b.status === "rejected").length,
    };

    return c.json({ stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[PENDING_BOOKINGS] GET /stats error:", error);
    return c.json({ error: message }, 500);
  }
});

/**
 * PUT /api/pending-bookings/:id/confirm
 * Confirms a pending booking (marks as confirmed)
 */
pendingBookingsRoutes.put("/:id/confirm", async (c) => {
  try {
    const { id } = c.req.param();
    const userId = getAuthUserId(c);
    const tenantId = getAuthTenantId(c);

    // Verify booking belongs to tenant
    const booking = await getPendingBookingById(id, tenantId);

    if (!booking) {
      return c.json({ error: "Booking not found" }, 404);
    }

    if (booking.status !== "pending") {
      return c.json({ error: `Booking is already ${booking.status}` }, 400);
    }

    await confirmPendingBooking(id, userId);

    return c.json({ success: true, status: "confirmed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[PENDING_BOOKINGS] PUT /:id/confirm error:", error);
    return c.json({ error: message }, 500);
  }
});

/**
 * PUT /api/pending-bookings/:id/reject
 * Rejects a pending booking
 */
pendingBookingsRoutes.put("/:id/reject", async (c) => {
  try {
    const { id } = c.req.param();
    const userId = getAuthUserId(c);
    const tenantId = getAuthTenantId(c);

    // Parse and validate body
    const body = await c.req.json();
    const parsed = rejectSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { error: "Validation failed", details: parsed.error.issues },
        400,
      );
    }

    // Verify booking belongs to tenant
    const booking = await getPendingBookingById(id, tenantId);

    if (!booking) {
      return c.json({ error: "Booking not found" }, 404);
    }

    if (booking.status !== "pending") {
      return c.json({ error: `Booking is already ${booking.status}` }, 400);
    }

    await rejectPendingBooking(id, userId, parsed.data.reason);

    return c.json({ success: true, status: "rejected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[PENDING_BOOKINGS] PUT /:id/reject error:", error);
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /api/pending-bookings/:id/convert
 * Converts a pending booking to a confirmed booking in the bookings table
 * Optionally allows specifying a different date/time
 */
pendingBookingsRoutes.post("/:id/convert", async (c) => {
  try {
    const { id } = c.req.param();
    const userId = getAuthUserId(c);
    const tenantId = getAuthTenantId(c);

    // Parse and validate body
    const body = await c.req.json();
    const parsed = convertSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { error: "Validation failed", details: parsed.error.issues },
        400,
      );
    }

    // Verify booking belongs to tenant
    const booking = await getPendingBookingById(id, tenantId);

    if (!booking) {
      return c.json({ error: "Booking not found" }, 404);
    }

    if (booking.status !== "pending") {
      return c.json({ error: `Booking is already ${booking.status}` }, 400);
    }

    // Convert to confirmed booking
    const confirmedBookingId = await convertPendingToConfirmed(
      id,
      tenantId,
      userId,
      parsed.data.confirmed_date,
      parsed.data.confirmed_time,
    );

    return c.json({
      success: true,
      booking_id: confirmedBookingId,
      status: "confirmed",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[PENDING_BOOKINGS] POST /:id/convert error:", error);
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/pending-bookings/:id
 * Returns a single pending booking by ID
 */
pendingBookingsRoutes.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const tenantId = getAuthTenantId(c);

    const booking = await getPendingBookingById(id, tenantId);

    if (!booking) {
      return c.json({ error: "Booking not found" }, 404);
    }

    return c.json({ booking });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[PENDING_BOOKINGS] GET /:id error:", error);
    return c.json({ error: message }, 500);
  }
});
