// Availability API Routes
import { Hono } from "hono";
import { z } from "zod";
import {
  getAvailableSlots,
  getAvailableSlotsForRange,
  createSlot,
  updateSlot,
  blockSlot,
  unblockSlot,
  deleteSlot,
  checkAvailability,
  generateSlotsFromOperatingHours,
} from "../services/availability/availability-service.js";

import { getAuthTenantId } from "../middleware/index.js";

export const availabilityRoutes = new Hono();

function getTenantId(c: Parameters<typeof getAuthTenantId>[0]): string {
  return getAuthTenantId(c);
}

// GET /api/availability/slots
availabilityRoutes.get("/slots", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const query = c.req.query();

    if (query.start_date && query.end_date) {
      const slots = await getAvailableSlotsForRange(
        tenantId,
        query.start_date,
        query.end_date,
        {
          resourceId: query.resource_id,
        },
      );
      return c.json({ slots });
    }

    if (!query.date) {
      return c.json({ error: "date or start_date/end_date required" }, 400);
    }

    const slots = await getAvailableSlots(tenantId, query.date, {
      resourceId: query.resource_id,
      slotType: query.slot_type,
    });
    return c.json({ slots });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// GET /api/availability/check
availabilityRoutes.get("/check", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const { date, time, duration, resource_id } = c.req.query();

    if (!date || !time) {
      return c.json({ error: "date and time required" }, 400);
    }

    const available = await checkAvailability(
      tenantId,
      date,
      time,
      parseInt(duration || "60"),
      resource_id,
    );

    return c.json({ available });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// POST /api/availability/slots
availabilityRoutes.post("/slots", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json();

    const schema = z.object({
      slot_date: z.string(),
      start_time: z.string(),
      end_time: z.string(),
      slot_type: z.string().optional(),
      resource_id: z.string().uuid().optional(),
      total_capacity: z.number().positive().optional(),
      price_override_cents: z.number().optional(),
      notes: z.string().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Validation failed", details: parsed.error.issues },
        400,
      );
    }

    const slot = await createSlot(tenantId, parsed.data);
    return c.json(slot, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// PUT /api/availability/slots/:id
availabilityRoutes.put("/slots/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const body = await c.req.json();

    const slot = await updateSlot(tenantId, id, body);
    return c.json(slot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// PATCH /api/availability/slots/:id/block
availabilityRoutes.patch("/slots/:id/block", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));

    const slot = await blockSlot(tenantId, id, body.reason);
    return c.json(slot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// PATCH /api/availability/slots/:id/unblock
availabilityRoutes.patch("/slots/:id/unblock", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");

    const slot = await unblockSlot(tenantId, id);
    return c.json(slot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// DELETE /api/availability/slots/:id
availabilityRoutes.delete("/slots/:id", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param("id");

    await deleteSlot(tenantId, id);
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// POST /api/availability/generate
availabilityRoutes.post("/generate", async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json();

    const schema = z.object({
      start_date: z.string(),
      end_date: z.string(),
      slot_duration_minutes: z.number().positive().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Validation failed" }, 400);
    }

    const count = await generateSlotsFromOperatingHours(
      tenantId,
      parsed.data.start_date,
      parsed.data.end_date,
      parsed.data.slot_duration_minutes,
    );

    return c.json({ generated: count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});
