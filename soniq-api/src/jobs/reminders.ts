import { queryAll } from "../services/database/client.js";
import { updateOne } from "../services/database/query-helpers.js";
import { sendReminder } from "../services/twilio/sms.js";
import { sendBookingReminder } from "../services/notifications/notification-service.js";

interface BookingIdOnly {
  id: string;
}

interface BookingWithContact {
  id: string;
  tenant_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  booking_type: string | null;
  booking_date: string;
  booking_time: string;
  duration_minutes: number | null;
  confirmation_code: string | null;
  contact_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_do_not_sms: boolean | null;
  contact_do_not_email: boolean | null;
}

interface ExistingNotification {
  booking_id: string;
}

/**
 * Process booking reminders (legacy - uses direct SMS)
 *
 * Finds bookings that are 24 hours away and haven't been reminded yet.
 * Sends SMS reminders to customers.
 */
export async function processReminders(): Promise<void> {
  // Calculate the reminder window (24 hours from now, +/- 30 minutes)
  const now = new Date();
  const reminderTarget = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Get the date and time range
  const targetDate = reminderTarget.toISOString().split("T")[0];
  const targetTimeStart = reminderTarget.toTimeString().slice(0, 5);

  // Add 30 minutes to the time
  const targetTimeEnd = new Date(reminderTarget.getTime() + 30 * 60 * 1000)
    .toTimeString()
    .slice(0, 5);

  // Find bookings that need reminders
  const bookings = await queryAll<BookingIdOnly>(
    `SELECT id
     FROM bookings
     WHERE status = $1
       AND reminder_sent = $2
       AND booking_date = $3
       AND booking_time >= $4
       AND booking_time < $5`,
    ["confirmed", false, targetDate, targetTimeStart, targetTimeEnd],
  );

  if (bookings.length === 0) {
    return; // No reminders to send
  }

  console.log(`[REMINDERS] Sending ${bookings.length} reminders`);

  // Send reminders
  for (const booking of bookings) {
    try {
      await sendReminder(booking.id);
    } catch (err) {
      console.error(`[REMINDERS] Failed for booking ${booking.id}:`, err);
    }
  }
}

/**
 * Send due reminders using the notification service
 *
 * Checks for:
 * - 24-hour reminders for bookings tomorrow
 * - 1-hour reminders for bookings in the next hour
 */
export async function sendDueReminders(): Promise<void> {
  const now = new Date();

  // 24-hour reminders
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDate = tomorrow.toISOString().split("T")[0];

  // Find bookings that need 24h reminders (with contact info via LEFT JOIN)
  const bookings24h = await queryAll<BookingWithContact>(
    `SELECT
       b.id, b.tenant_id, b.customer_name, b.customer_phone, b.customer_email,
       b.booking_type, b.booking_date, b.booking_time, b.duration_minutes,
       b.confirmation_code, b.contact_id,
       c.id AS contact_id,
       c.name AS contact_name,
       c.phone AS contact_phone,
       c.email AS contact_email,
       c.do_not_sms AS contact_do_not_sms,
       c.do_not_email AS contact_do_not_email
     FROM bookings b
     LEFT JOIN contacts c ON b.contact_id = c.id
     WHERE b.status = ANY($1)
       AND b.booking_date = $2
       AND b.reminder_sent = $3`,
    [["pending", "confirmed"], tomorrowDate, false],
  );

  if (bookings24h.length > 0) {
    console.log(
      `[REMINDERS] Processing ${bookings24h.length} 24-hour reminders`,
    );

    for (const booking of bookings24h) {
      try {
        const contact = booking.contact_id
          ? {
              id: booking.contact_id,
              name: booking.contact_name,
              phone: booking.contact_phone,
              email: booking.contact_email,
              do_not_sms: booking.contact_do_not_sms ?? false,
              do_not_email: booking.contact_do_not_email ?? false,
            }
          : null;

        if (contact) {
          await sendBookingReminder(
            booking.tenant_id,
            booking as any,
            contact as any,
            24,
          );
        }

        // Mark reminder as sent
        await updateOne(
          "bookings",
          {
            reminder_sent: true,
            reminder_sent_at: new Date().toISOString(),
          },
          { id: booking.id },
        );
      } catch (err) {
        console.error(`[REMINDERS] 24h failed for ${booking.id}:`, err);
      }
    }
  }

  // 1-hour reminders
  const oneHour = new Date(now.getTime() + 60 * 60 * 1000);
  const todayDate = now.toISOString().split("T")[0];
  const oneHourTime = oneHour.toTimeString().slice(0, 5);
  const oneHourEnd = new Date(oneHour.getTime() + 15 * 60 * 1000)
    .toTimeString()
    .slice(0, 5);

  // Find bookings in the next hour that haven't had 1h reminders
  const bookings1h = await queryAll<BookingWithContact>(
    `SELECT
       b.id, b.tenant_id, b.customer_name, b.customer_phone, b.customer_email,
       b.booking_type, b.booking_date, b.booking_time, b.duration_minutes,
       b.confirmation_code, b.contact_id,
       c.id AS contact_id,
       c.name AS contact_name,
       c.phone AS contact_phone,
       c.email AS contact_email,
       c.do_not_sms AS contact_do_not_sms,
       c.do_not_email AS contact_do_not_email
     FROM bookings b
     LEFT JOIN contacts c ON b.contact_id = c.id
     WHERE b.status = ANY($1)
       AND b.booking_date = $2
       AND b.booking_time >= $3
       AND b.booking_time <= $4`,
    [["pending", "confirmed"], todayDate, oneHourTime, oneHourEnd],
  );

  if (bookings1h.length > 0) {
    // Check if we already sent 1h reminders via notifications table
    const bookingIds = bookings1h.map((b) => b.id);
    const existing = await queryAll<ExistingNotification>(
      `SELECT booking_id
       FROM notifications
       WHERE booking_id = ANY($1)
         AND notification_type = $2`,
      [bookingIds, "booking_reminder_1h"],
    );

    const alreadySent = new Set(existing.map((n) => n.booking_id));

    for (const booking of bookings1h) {
      if (alreadySent.has(booking.id)) continue;

      try {
        const contact = booking.contact_id
          ? {
              id: booking.contact_id,
              name: booking.contact_name,
              phone: booking.contact_phone,
              email: booking.contact_email,
              do_not_sms: booking.contact_do_not_sms ?? false,
              do_not_email: booking.contact_do_not_email ?? false,
            }
          : null;

        if (contact) {
          await sendBookingReminder(
            booking.tenant_id,
            booking as any,
            contact as any,
            1,
          );
        }
      } catch (err) {
        console.error(`[REMINDERS] 1h failed for ${booking.id}:`, err);
      }
    }
  }
}
