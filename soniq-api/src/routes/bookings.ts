// Bookings API Routes - CRM Integration
import { Hono } from "hono";
import { z } from "zod";
import {
  createBooking,
  getBooking,
  updateBooking,
  cancelBooking,
  rescheduleBooking,
  searchBookings,
  confirmBooking,
  markCompleted,
  markNoShow,
  getCalendarData,
  getDaySummary,
  getUpcomingBookings,
} from "../services/bookings/booking-service.js";
import { BookingFilters, PaginationParams } from "../types/crm.js";
import { getAuthTenantId } from "../middleware/index.js";

export const bookingsRoutes = new Hono();

// Helper to get tenant ID from auth context
function getTenantId(c: Parameters<typeof getAuthTenantId>[0]): string {
  return getAuthTenantId(c);
}

// Helper to transform null to undefined
const nullToUndefined = <T>(val: T | null | undefined): T | undefined =>
  val === null ? undefined : val;

// Validation schemas
const createBookingSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_phone: z.string().min(1, "Customer phone is required"),
  customer_email: z.string().email().nullish().transform(nullToUndefined),
  booking_type: z.string().min(1, "Booking type is required"),
  booking_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  booking_time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
  duration_minutes: z.number().positive().optional(),
  notes: z.string().nullish().transform(nullToUndefined),
  amount_cents: z.number().nonnegative().optional(),
  contact_id: z.string().uuid().optional(),
  resource_id: z.string().uuid().optional(),
  slot_id: z.string().uuid().optional(),
  call_id: z.string().uuid().optional(),
  source: z.enum(["call", "web", "manual", "api"]).optional(),
});

const updateBookingSchema = z.object({
  customer_name: z.string().optional(),
  customer_email: z.string().email().nullish().transform(nullToUndefined),
  booking_type: z.string().optional(),
  booking_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  booking_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  duration_minutes: z.number().positive().optional(),
  notes: z.string().nullish().transform(nullToUndefined),
  amount_cents: z.number().nonnegative().optional(),
  resource_id: z.string().uuid().nullish().transform(nullToUndefined),
  status: z
    .enum(["pending", "confirmed", "cancelled", "completed", "no_show"])
    .optional(),
});

// ============================================================================
// LIST & SEARCH
// ============================================================================

/**
 * GET /api/bookings
 * List bookings with filters and pagination
 */
bookingsRoutes.get("/", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const query = c.req.query();

    const filters: BookingFilters = {};
    const pagination: PaginationParams = {};

    // Parse filters
    if (query.status) {
      filters.status = query.status.includes(",")
        ? query.status.split(",")
        : query.status;
    }
    if (query.contact_id) filters.contact_id = query.contact_id;
    if (query.resource_id) filters.resource_id = query.resource_id;
    if (query.start_date) filters.start_date = query.start_date;
    if (query.end_date) filters.end_date = query.end_date;
    if (query.date) {
      filters.start_date = query.date;
      filters.end_date = query.date;
    }
    if (query.booking_type) filters.booking_type = query.booking_type;

    // Parse pagination
    if (query.limit) pagination.limit = parseInt(query.limit);
    if (query.offset) pagination.offset = parseInt(query.offset);
    if (query.sort_by) pagination.sort_by = query.sort_by;
    if (query.sort_order)
      pagination.sort_order = query.sort_order as "asc" | "desc";

    const result = await searchBookings(tenantId, filters, pagination);

    return c.json({
      bookings: result.data,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      has_more: result.has_more,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("X-Tenant-ID")) {
      return c.json({ error: message }, 400);
    }
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/bookings/upcoming
 * Get upcoming bookings (next N hours)
 */
bookingsRoutes.get("/upcoming", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const hours = parseInt(c.req.query("hours") || "24");

    const bookings = await getUpcomingBookings(tenantId, hours);

    return c.json({ bookings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/bookings/calendar
 * Get bookings as calendar events
 */
bookingsRoutes.get("/calendar", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const { start_date, end_date } = c.req.query();

    if (!start_date || !end_date) {
      return c.json({ error: "start_date and end_date required" }, 400);
    }

    const events = await getCalendarData(tenantId, start_date, end_date);

    return c.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/bookings/day-summary
 * Get summary for a specific day
 */
bookingsRoutes.get("/day-summary", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const date = c.req.query("date");

    if (!date) {
      return c.json({ error: "date required" }, 400);
    }

    const summary = await getDaySummary(tenantId, date);

    return c.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// CRUD
// ============================================================================

/**
 * GET /api/bookings/:id
 * Get a single booking by ID
 */
bookingsRoutes.get("/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");

    const booking = await getBooking(tenantId, id);

    if (!booking) {
      return c.json({ error: "Booking not found" }, 404);
    }

    return c.json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /api/bookings
 * Create a new booking
 */
bookingsRoutes.post("/", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json();

    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parsed.error.issues,
        },
        400,
      );
    }

    const booking = await createBooking(tenantId, parsed.data);

    return c.json(booking, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * PUT /api/bookings/:id
 * Update a booking
 */
bookingsRoutes.put("/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const body = await c.req.json();

    const parsed = updateBookingSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parsed.error.issues,
        },
        400,
      );
    }

    const booking = await updateBooking(tenantId, id, parsed.data);

    return c.json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 500);
  }
});

/**
 * PATCH /api/bookings/:id
 * Partial update a booking (backwards compatibility)
 */
bookingsRoutes.patch("/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const body = await c.req.json();

    const parsed = updateBookingSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parsed.error.issues,
        },
        400,
      );
    }

    const booking = await updateBooking(tenantId, id, parsed.data);

    return c.json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 500);
  }
});

/**
 * DELETE /api/bookings/:id
 * Cancel a booking
 */
bookingsRoutes.delete("/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));

    await cancelBooking(tenantId, id, body.reason);

    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// STATUS TRANSITIONS
// ============================================================================

/**
 * POST /api/bookings/:id/confirm
 * Confirm a pending booking
 */
bookingsRoutes.post("/:id/confirm", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");

    const booking = await confirmBooking(tenantId, id);

    return c.json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /api/bookings/:id/complete
 * Mark a booking as completed
 */
bookingsRoutes.post("/:id/complete", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");

    const booking = await markCompleted(tenantId, id);

    return c.json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /api/bookings/:id/no-show
 * Mark a booking as no-show
 */
bookingsRoutes.post("/:id/no-show", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");

    const booking = await markNoShow(tenantId, id);

    return c.json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /api/bookings/:id/cancel
 * Cancel a booking with optional reason
 */
bookingsRoutes.post("/:id/cancel", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));

    const booking = await cancelBooking(tenantId, id, body.reason);

    return c.json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ============================================================================
// RESCHEDULE
// ============================================================================

/**
 * POST /api/bookings/:id/reschedule
 * Reschedule a booking to a new date/time
 */
bookingsRoutes.post("/:id/reschedule", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const body = await c.req.json();

    const rescheduleSchema = z.object({
      new_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
      new_time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
      new_slot_id: z.string().uuid().optional(),
    });

    const parsed = rescheduleSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parsed.error.issues,
        },
        400,
      );
    }

    const booking = await rescheduleBooking(
      tenantId,
      id,
      parsed.data.new_date,
      parsed.data.new_time,
      parsed.data.new_slot_id,
    );

    return c.json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 500);
  }
});
