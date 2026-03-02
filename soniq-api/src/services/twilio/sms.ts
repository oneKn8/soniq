import { queryOne } from "../database/client.js";
import { insertOne, updateOne } from "../database/query-helpers.js";
import { getTwilioClient } from "./client.js";
import { getTemplate } from "./templates.js";

interface QueueSmsParams {
  tenantId: string;
  bookingId?: string;
  callId?: string;
  toPhone: string;
  messageType: "confirmation" | "reminder" | "missed_call" | "custom";
  context: Record<string, string>;
  customBody?: string;
}

interface SmsInsertRow {
  id: string;
}

interface BookingWithTenantRow {
  id: string;
  tenant_id: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  booking_time: string;
  confirmation_code: string;
  reminder_sent: boolean;
  business_name: string | null;
}

/**
 * Queue an SMS message for sending
 *
 * This creates a record in sms_messages and attempts to send via Twilio.
 */
export async function queueSms(params: QueueSmsParams): Promise<void> {
  const {
    tenantId,
    bookingId,
    callId,
    toPhone,
    messageType,
    context,
    customBody,
  } = params;

  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!fromPhone) {
    console.warn("[SMS] No TWILIO_PHONE_NUMBER configured, skipping SMS");
    return;
  }

  // Get message body from template or custom
  const body = customBody || getTemplate(messageType, context);

  // Create SMS record
  const smsRecord = await insertOne<SmsInsertRow>("sms_messages", {
    tenant_id: tenantId,
    booking_id: bookingId,
    call_id: callId,
    to_phone: toPhone,
    from_phone: fromPhone,
    message_type: messageType,
    body,
    status: "pending",
  });

  // Try to send immediately
  try {
    const client = getTwilioClient();

    if (!client) {
      console.warn("[SMS] Twilio client not configured, message queued");
      return;
    }

    const message = await client.messages.create({
      body,
      from: fromPhone,
      to: toPhone,
    });

    // Update record with Twilio SID and status
    await updateOne(
      "sms_messages",
      {
        twilio_sid: message.sid,
        status: "sent",
      },
      { id: smsRecord.id },
    );

    console.log(`[SMS] Sent to ${toPhone}, SID: ${message.sid}`);
  } catch (error) {
    console.error("[SMS] Failed to send:", error);

    // Update record with error
    await updateOne(
      "sms_messages",
      {
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      },
      { id: smsRecord.id },
    );

    throw error;
  }
}

/**
 * Send a booking reminder SMS
 */
export async function sendReminder(bookingId: string): Promise<boolean> {
  // Get booking details with tenant info
  const booking = await queryOne<BookingWithTenantRow>(
    `SELECT b.*, t.business_name
     FROM bookings b
     LEFT JOIN tenants t ON b.tenant_id = t.id
     WHERE b.id = $1`,
    [bookingId],
  );

  if (!booking) {
    console.error("[SMS] Booking not found:", bookingId);
    throw new Error(`Booking not found: ${bookingId}`);
  }

  // Check if already reminded
  if (booking.reminder_sent) {
    console.log("[SMS] Reminder already sent for:", bookingId);
    return true;
  }

  await queueSms({
    tenantId: booking.tenant_id,
    bookingId,
    toPhone: booking.customer_phone,
    messageType: "reminder",
    context: {
      customerName: booking.customer_name,
      businessName: booking.business_name || "us",
      date: formatDate(booking.booking_date),
      time: formatTime(booking.booking_time),
      confirmationCode: booking.confirmation_code,
    },
  });

  // Mark as reminded
  await updateOne(
    "bookings",
    {
      reminder_sent: true,
      reminder_sent_at: new Date().toISOString(),
    },
    { id: bookingId },
  );

  return true;
}

/**
 * Send an SMS directly (used by notification service)
 */
export async function sendSMS(toPhone: string, body: string): Promise<void> {
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!fromPhone) {
    console.warn("[SMS] No TWILIO_PHONE_NUMBER configured, skipping SMS");
    return;
  }

  const client = getTwilioClient();

  if (!client) {
    console.warn("[SMS] Twilio client not configured");
    return;
  }

  const message = await client.messages.create({
    body,
    from: fromPhone,
    to: toPhone,
  });

  console.log(`[SMS] Sent to ${toPhone}, SID: ${message.sid}`);
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}
