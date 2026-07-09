// Voice Tool Execution
// Handles tool calls from the LiveKit Python agent via internal API

import type {
  ToolExecutionContext,
  CheckAvailabilityArgs,
  CheckAvailabilityResult,
  CreateBookingArgs,
  CreateBookingResult,
  TransferToHumanArgs,
  TransferToHumanResult,
  EndCallArgs,
  EndCallResult,
  CreateOrderArgs,
  CreateOrderResult,
  LogNoteArgs,
  LogNoteResult,
} from "../../types/voice.js";
import { query, queryOne, queryAll } from "../database/client.js";
import { insertOne } from "../database/query-helpers.js";
import { findOrCreateByPhone } from "../contacts/contact-service.js";
import { logger } from "../../lib/logger.js";

// Generate confirmation code
function generateConfirmationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Tool execution functions

interface BookingTimeRow {
  booking_time: string;
}

export async function executeCheckAvailability(
  args: CheckAvailabilityArgs,
  context: ToolExecutionContext,
): Promise<CheckAvailabilityResult> {
  logger.info({ args }, `[TOOLS] check_availability called for tenant ${context.tenantId}:`);

  try {
    const existingBookings = await queryAll<BookingTimeRow>(
      `SELECT booking_time FROM bookings
       WHERE tenant_id = $1 AND booking_date = $2 AND status != 'cancelled'`,
      [context.tenantId, args.date],
    );

    const bookedTimes = new Set(
      existingBookings?.map((b) => b.booking_time) || [],
    );
    const allSlots = [
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
    ];
    const availableSlots = allSlots.filter((slot) => !bookedTimes.has(slot));

    if (availableSlots.length === 0) {
      return {
        available: false,
        slots: [],
        message: `I'm sorry, we don't have any availability on ${args.date}. Would you like to check another date?`,
      };
    }

    const formattedSlots = availableSlots.slice(0, 3).map(formatTimeForVoice);

    return {
      available: true,
      slots: availableSlots,
      message: `We have availability at ${formattedSlots.join(", ")}.${availableSlots.length > 3 ? " And a few other times as well." : ""} Which time works best for you?`,
    };
  } catch (error) {
    logger.error({ error }, "[TOOLS] check_availability error:");
    return {
      available: false,
      message:
        "I encountered an error checking availability. Let me try again.",
    };
  }
}

interface CallIdRow {
  id: string;
}

interface BookingRow {
  id: string;
}

export async function executeCreateBooking(
  args: CreateBookingArgs,
  context: ToolExecutionContext,
): Promise<CreateBookingResult> {
  logger.info({ args }, `[TOOLS] create_booking called for tenant ${context.tenantId}:`);

  try {
    const confirmationCode = generateConfirmationCode();

    // Try to find the call record for linking (may not exist yet during call)
    let callId: string | null = null;
    if (context.callSid) {
      const callRecord = await queryOne<CallIdRow>(
        "SELECT id FROM calls WHERE vapi_call_id = $1",
        [context.callSid],
      );
      callId = callRecord?.id || null;
    }

    const data = await insertOne<BookingRow>("bookings", {
      tenant_id: context.tenantId,
      customer_name: args.customer_name,
      customer_phone: args.customer_phone,
      booking_type: args.service_type || "general",
      booking_date: args.date,
      booking_time: args.time,
      notes: args.notes
        ? `${args.notes} (Call: ${context.callSid})`
        : `Booked via call ${context.callSid}`,
      status: "confirmed",
      confirmation_code: confirmationCode,
      reminder_sent: false,
      source: "call",
      call_id: callId,
    });

    const formattedTime = formatTimeForVoice(args.time);
    const formattedDate = formatDateForVoice(args.date);

    return {
      success: true,
      booking_id: data.id,
      confirmation_code: confirmationCode,
      message: `I've booked your appointment for ${formattedDate} at ${formattedTime}. Your confirmation code is ${confirmationCode}. We'll send you a reminder before your appointment.`,
    };
  } catch (error) {
    logger.error({ error }, "[TOOLS] create_booking error:");
    return {
      success: false,
      message: "I encountered an error creating the booking. Let me try again.",
    };
  }
}

export async function executeTransferToHuman(
  args: TransferToHumanArgs,
  context: ToolExecutionContext,
): Promise<TransferToHumanResult> {
  logger.info({ args }, `[TOOLS] transfer_to_human called for tenant ${context.tenantId}:`);

  if (!context.escalationPhone) {
    logger.warn("[TOOLS] No escalation phone configured");
    return {
      transferred: false,
      message:
        "I'm sorry, I'm not able to transfer you right now. Is there anything else I can help with?",
    };
  }

  try {
    // Update call outcome
    await query(
      `UPDATE calls SET outcome_type = $1, updated_at = $2 WHERE vapi_call_id = $3`,
      ["escalation", new Date().toISOString(), context.callSid],
    );

    // Return escalation phone - the LiveKit agent handles SIP REFER transfer
    logger.info(`[TOOLS] Transfer requested to ${context.escalationPhone} - agent will handle SIP REFER`);
    return {
      transferred: true,
      message: "Transferring you now. Please hold.",
    };
  } catch (error) {
    logger.error({ error }, "[TOOLS] Transfer error:");
    return {
      transferred: false,
      message:
        "I encountered an error with the transfer. Can I help you another way?",
    };
  }
}

export async function executeEndCall(
  args: EndCallArgs,
  context: ToolExecutionContext,
): Promise<EndCallResult> {
  logger.info({ args }, `[TOOLS] end_call called for tenant ${context.tenantId}:`);

  // Just acknowledge - the LiveKit agent handles session shutdown
  return {
    ended: true,
    message: "Call ended.",
  };
}

// Helper to check for invalid placeholder values
function isInvalidValue(value: string | undefined): boolean {
  if (!value) return true;
  const invalid = [
    "unknown",
    "not provided",
    "n/a",
    "none",
    "undefined",
    "null",
    "",
  ];
  return invalid.includes(value.toLowerCase().trim());
}

// Legacy capability strings that are treated as aliases of order_taking
// (no DB migration; existing tenants may still hold these values).
const ORDER_TAKING_CAPABILITIES = new Set([
  "order_taking",
  "takeaway",
  "orders",
]);

// Checks whether the tenant has order/request taking enabled.
async function tenantHasOrderTaking(tenantId: string): Promise<boolean> {
  try {
    const rows = await queryAll<{ capability: string }>(
      `SELECT capability FROM tenant_capabilities
       WHERE tenant_id = $1 AND is_enabled = true`,
      [tenantId],
    );
    return (rows || []).some((row) =>
      ORDER_TAKING_CAPABILITIES.has(row.capability),
    );
  } catch (error) {
    logger.error({ error }, "[TOOLS] Failed to check order_taking capability:");
    return false;
  }
}

const VALID_FULFILLMENT_TYPES = ["pickup", "delivery", "onsite", "none"];

export async function executeCreateOrder(
  args: CreateOrderArgs,
  context: ToolExecutionContext,
): Promise<CreateOrderResult> {
  logger.info({ args }, `[TOOLS] create_order called for tenant ${context.tenantId}:`);

  // GATING: order/request taking must be enabled for this tenant
  const orderingEnabled = await tenantHasOrderTaking(context.tenantId);
  if (!orderingEnabled) {
    logger.info("[TOOLS] Rejected: order_taking capability not enabled");
    return {
      success: false,
      message:
        "I'm sorry, we're not set up to take orders on this line. Is there anything else I can help with?",
    };
  }

  // VALIDATION: Reject invalid/placeholder values
  if (isInvalidValue(args.customer_name)) {
    logger.info("[TOOLS] Rejected: missing customer name");
    return {
      success: false,
      message: "I need a name for the order. What name should I put it under?",
    };
  }

  if (isInvalidValue(args.request_summary)) {
    logger.info("[TOOLS] Rejected: missing request summary");
    return {
      success: false,
      message: "What can I get started for you?",
    };
  }

  const fulfillmentType =
    args.fulfillment_type &&
    VALID_FULFILLMENT_TYPES.includes(args.fulfillment_type)
      ? args.fulfillment_type
      : "none";

  if (
    fulfillmentType === "delivery" &&
    isInvalidValue(args.fulfillment_address)
  ) {
    logger.info("[TOOLS] Rejected: delivery without address");
    return {
      success: false,
      message:
        "For delivery, I need your address. What's the delivery address?",
    };
  }

  const customerPhone =
    args.customer_phone && !isInvalidValue(args.customer_phone)
      ? args.customer_phone
      : context.callerPhone || "caller";

  try {
    const confirmationCode = `OR-${generateConfirmationCode()}`;

    const estimatedMinutes = fulfillmentType === "delivery" ? 40 : 20;
    const readyTime = new Date(Date.now() + estimatedMinutes * 60 * 1000);
    const formattedTime = readyTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const composedNotes = [
      args.request_summary,
      fulfillmentType === "delivery" && args.fulfillment_address
        ? `DELIVER TO: ${args.fulfillment_address}`
        : `FULFILLMENT: ${fulfillmentType}`,
      args.notes && !isInvalidValue(args.notes) ? `NOTES: ${args.notes}` : "",
    ]
      .filter(Boolean)
      .join(". ");

    const data = await insertOne<BookingRow>("bookings", {
      tenant_id: context.tenantId,
      customer_name: args.customer_name,
      customer_phone: customerPhone,
      booking_type: fulfillmentType,
      booking_date: new Date().toISOString().split("T")[0],
      booking_time: new Date().toTimeString().slice(0, 5),
      notes: composedNotes,
      status: "confirmed",
      confirmation_code: confirmationCode,
      reminder_sent: false,
      source: "call",
    });

    const timingText =
      fulfillmentType === "delivery"
        ? `delivered in about ${estimatedMinutes} minutes`
        : fulfillmentType === "pickup"
          ? `ready in about ${estimatedMinutes} minutes`
          : "taken care of shortly";

    return {
      success: true,
      order_id: data.id,
      confirmation_code: confirmationCode,
      estimated_time: formattedTime,
      message: `Your order is confirmed! It will be ${timingText}. Your confirmation number is ${confirmationCode}. Is there anything else I can help you with?`,
    };
  } catch (error) {
    logger.error({ error }, "[TOOLS] create_order error:");
    return {
      success: false,
      message: "I encountered an error placing your order. Let me try again.",
    };
  }
}

export async function executeLogNote(
  args: LogNoteArgs,
  context: ToolExecutionContext,
): Promise<LogNoteResult> {
  logger.info({ args }, `[TOOLS] log_note called for tenant ${context.tenantId}:`);

  try {
    // Find or create the contact by phone
    let contactId: string | null = null;
    if (context.callerPhone) {
      const contact = await findOrCreateByPhone(
        context.tenantId,
        context.callerPhone,
      );
      contactId = contact?.id || null;
    }

    if (!contactId) {
      return {
        success: false,
        message: "Note saved.",
      };
    }

    // Find call record for linking
    let callId: string | null = null;
    if (context.callSid) {
      const callRecord = await queryOne<CallIdRow>(
        "SELECT id FROM calls WHERE vapi_call_id = $1",
        [context.callSid],
      );
      callId = callRecord?.id || null;
    }

    const validTypes = [
      "general",
      "preference",
      "complaint",
      "compliment",
      "follow_up",
      "internal",
    ];
    const noteType = validTypes.includes(args.note_type || "")
      ? args.note_type
      : "general";

    await insertOne("contact_notes", {
      tenant_id: context.tenantId,
      contact_id: contactId,
      note_type: noteType,
      content: args.note,
      call_id: callId,
      is_pinned: false,
      is_private: false,
      created_by: "voice_agent",
      created_by_name: "Voice Agent",
    });

    return {
      success: true,
      message: "Note saved.",
    };
  } catch (error) {
    logger.error({ error }, "[TOOLS] log_note error:");
    return {
      success: false,
      message: "Note saved.",
    };
  }
}

// Tool executor - routes tool calls to the right function
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolExecutionContext,
): Promise<unknown> {
  switch (toolName) {
    case "check_availability":
      return executeCheckAvailability(
        args as unknown as CheckAvailabilityArgs,
        context,
      );
    case "create_booking":
      return executeCreateBooking(
        args as unknown as CreateBookingArgs,
        context,
      );
    case "create_order":
      return executeCreateOrder(args as unknown as CreateOrderArgs, context);
    case "transfer_to_human":
      return executeTransferToHuman(
        args as unknown as TransferToHumanArgs,
        context,
      );
    case "end_call":
      return executeEndCall(args as unknown as EndCallArgs, context);
    case "log_note":
      return executeLogNote(args as unknown as LogNoteArgs, context);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Helper functions
function formatTimeForVoice(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;

  if (minutes === 0) {
    return `${hour12} ${period}`;
  }
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function formatDateForVoice(date: string): string {
  const d = new Date(date + "T12:00:00");
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
  };
  return d.toLocaleDateString("en-US", options);
}
