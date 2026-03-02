// Availability Service - Slot management
import { queryOne, queryAll } from "../database/client.js";
import {
  insertOne,
  updateOne,
  deleteRows,
  batchUpsert,
} from "../database/query-helpers.js";
import { AvailabilitySlot } from "../../types/crm.js";

/**
 * Get available slots for a specific date
 */
export async function getAvailableSlots(
  tenantId: string,
  date: string,
  options: { resourceId?: string; slotType?: string } = {},
): Promise<AvailabilitySlot[]> {
  const params: unknown[] = [tenantId, date];
  let paramIndex = 3;

  let sql = `
    SELECT * FROM availability_slots
    WHERE tenant_id = $1
      AND slot_date = $2
      AND status = 'available'
      AND booked_count < total_capacity
  `;

  if (options.resourceId) {
    sql += ` AND resource_id = $${paramIndex++}`;
    params.push(options.resourceId);
  }

  if (options.slotType) {
    sql += ` AND slot_type = $${paramIndex++}`;
    params.push(options.slotType);
  }

  sql += ` ORDER BY start_time`;

  return queryAll<AvailabilitySlot>(sql, params);
}

/**
 * Get available slots for a date range
 */
export async function getAvailableSlotsForRange(
  tenantId: string,
  startDate: string,
  endDate: string,
  options: { resourceId?: string } = {},
): Promise<AvailabilitySlot[]> {
  const params: unknown[] = [tenantId, startDate, endDate];
  let paramIndex = 4;

  let sql = `
    SELECT * FROM availability_slots
    WHERE tenant_id = $1
      AND slot_date >= $2
      AND slot_date <= $3
      AND status = 'available'
      AND booked_count < total_capacity
  `;

  if (options.resourceId) {
    sql += ` AND resource_id = $${paramIndex++}`;
    params.push(options.resourceId);
  }

  sql += ` ORDER BY slot_date, start_time`;

  return queryAll<AvailabilitySlot>(sql, params);
}

/**
 * Create a new availability slot
 */
export async function createSlot(
  tenantId: string,
  data: {
    slot_date: string;
    start_time: string;
    end_time: string;
    slot_type?: string;
    resource_id?: string;
    total_capacity?: number;
    price_override_cents?: number;
    notes?: string;
  },
): Promise<AvailabilitySlot> {
  const slotData = {
    tenant_id: tenantId,
    slot_date: data.slot_date,
    start_time: data.start_time,
    end_time: data.end_time,
    slot_type: data.slot_type || "general",
    resource_id: data.resource_id,
    total_capacity: data.total_capacity || 1,
    price_override_cents: data.price_override_cents,
    notes: data.notes,
    booked_count: 0,
    status: "available",
    is_generated: false,
  };

  return insertOne<AvailabilitySlot>("availability_slots", slotData);
}

/**
 * Update an existing availability slot
 */
export async function updateSlot(
  tenantId: string,
  id: string,
  updates: Partial<AvailabilitySlot>,
): Promise<AvailabilitySlot> {
  // Remove fields that should not be updated
  const safeUpdates = { ...updates };
  delete (safeUpdates as Record<string, unknown>).id;
  delete (safeUpdates as Record<string, unknown>).tenant_id;

  const result = await updateOne<AvailabilitySlot>(
    "availability_slots",
    safeUpdates,
    { tenant_id: tenantId, id },
  );

  if (!result) {
    throw new Error("Failed to update slot: slot not found");
  }

  return result;
}

/**
 * Block a slot from being booked
 */
export async function blockSlot(
  tenantId: string,
  id: string,
  reason?: string,
): Promise<AvailabilitySlot> {
  return updateSlot(tenantId, id, { status: "blocked", notes: reason });
}

/**
 * Unblock a previously blocked slot
 */
export async function unblockSlot(
  tenantId: string,
  id: string,
): Promise<AvailabilitySlot> {
  return updateSlot(tenantId, id, { status: "available", notes: undefined });
}

/**
 * Delete an availability slot
 */
export async function deleteSlot(tenantId: string, id: string): Promise<void> {
  const deleted = await deleteRows("availability_slots", {
    tenant_id: tenantId,
    id,
  });

  if (deleted === 0) {
    throw new Error("Failed to delete slot: slot not found");
  }
}

/**
 * Check if a specific time slot is available for booking
 */
export async function checkAvailability(
  tenantId: string,
  date: string,
  time: string,
  _durationMinutes: number = 60,
  resourceId?: string,
): Promise<boolean> {
  const params: unknown[] = [tenantId, date, time];
  let paramIndex = 4;

  let sql = `
    SELECT id, total_capacity, booked_count
    FROM availability_slots
    WHERE tenant_id = $1
      AND slot_date = $2
      AND start_time = $3
      AND status = 'available'
  `;

  if (resourceId) {
    sql += ` AND resource_id = $${paramIndex++}`;
    params.push(resourceId);
  }

  sql += ` LIMIT 1`;

  const slot = await queryOne<{
    id: string;
    total_capacity: number;
    booked_count: number;
  }>(sql, params);

  if (!slot) {
    return false;
  }

  return slot.booked_count < slot.total_capacity;
}

/**
 * Generate availability slots from tenant operating hours
 */
export async function generateSlotsFromOperatingHours(
  tenantId: string,
  startDate: string,
  endDate: string,
  slotDurationMinutes: number = 60,
): Promise<number> {
  // Get tenant operating hours
  const tenant = await queryOne<{
    operating_hours: {
      schedule?: Array<{
        day: number;
        enabled: boolean;
        open_time: string;
        close_time: string;
      }>;
    } | null;
  }>("SELECT operating_hours FROM tenants WHERE id = $1", [tenantId]);

  if (!tenant) {
    throw new Error("Failed to get tenant: tenant not found");
  }

  const schedule = tenant.operating_hours?.schedule || [];
  const slots: Record<string, unknown>[] = [];

  // Generate slots for each day in range
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const daySchedule = schedule.find((s) => s.day === dayOfWeek);

    if (!daySchedule?.enabled) continue;

    const dateStr = d.toISOString().split("T")[0];
    const openMinutes = timeToMinutes(daySchedule.open_time);
    const closeMinutes = timeToMinutes(daySchedule.close_time);

    for (let t = openMinutes; t < closeMinutes; t += slotDurationMinutes) {
      slots.push({
        tenant_id: tenantId,
        resource_id: null,
        slot_date: dateStr,
        start_time: minutesToTime(t),
        end_time: minutesToTime(t + slotDurationMinutes),
        slot_type: "general",
        total_capacity: 1,
        booked_count: 0,
        status: "available",
        is_generated: true,
      });
    }
  }

  if (slots.length === 0) return 0;

  // Insert in batches
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < slots.length; i += batchSize) {
    const batch = slots.slice(i, i + batchSize);
    const count = await batchUpsert(
      "availability_slots",
      batch,
      ["tenant_id", "resource_id", "slot_date", "start_time"],
      { ignoreDuplicates: true },
    );
    inserted += count;
  }

  return inserted;
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
