// Review Request Job
import { queryAll, queryOne } from "../services/database/client.js";
import { queueNotification } from "../services/notifications/notification-service.js";

interface BookingWithContact {
  id: string;
  tenant_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  booking_type: string | null;
  updated_at: string;
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

interface TenantInfo {
  business_name: string | null;
}

/**
 * Send review requests for bookings completed 24 hours ago
 * Runs daily at 9 AM
 */
export async function sendReviewRequests(): Promise<void> {
  // Find bookings completed 24-48 hours ago that haven't received review requests
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // Get completed bookings with their contacts via LEFT JOIN
  const bookings = await queryAll<BookingWithContact>(
    `SELECT
       b.id,
       b.tenant_id,
       b.customer_name,
       b.customer_phone,
       b.customer_email,
       b.booking_type,
       b.updated_at,
       b.contact_id,
       c.name AS contact_name,
       c.phone AS contact_phone,
       c.email AS contact_email,
       c.do_not_sms AS contact_do_not_sms,
       c.do_not_email AS contact_do_not_email
     FROM bookings b
     LEFT JOIN contacts c ON b.contact_id = c.id
     WHERE b.status = $1
       AND b.updated_at >= $2
       AND b.updated_at <= $3`,
    ["completed", twoDaysAgo.toISOString(), oneDayAgo.toISOString()],
  );

  if (bookings.length === 0) {
    return;
  }

  // Check which bookings already received review requests
  const bookingIds = bookings.map((b) => b.id);
  const existingNotifications = await queryAll<ExistingNotification>(
    `SELECT booking_id
     FROM notifications
     WHERE booking_id = ANY($1)
       AND notification_type = $2`,
    [bookingIds, "review_request"],
  );

  const alreadySent = new Set(existingNotifications.map((n) => n.booking_id));

  let sentCount = 0;

  for (const booking of bookings) {
    if (alreadySent.has(booking.id)) continue;

    // Get tenant info for business name
    const tenant = await queryOne<TenantInfo>(
      `SELECT business_name FROM tenants WHERE id = $1`,
      [booking.tenant_id],
    );

    const variables = {
      customer_name: booking.contact_name || booking.customer_name || "there",
      business_name: tenant?.business_name || "Our team",
      booking_type: booking.booking_type || "appointment",
    };

    // Send SMS if allowed
    const phone = booking.contact_phone || booking.customer_phone;
    const doNotSms = booking.contact_do_not_sms ?? false;

    if (phone && !doNotSms) {
      try {
        await queueNotification(booking.tenant_id, {
          contact_id: booking.contact_id ?? undefined,
          channel: "sms",
          notification_type: "review_request",
          recipient: phone,
          recipient_name:
            booking.contact_name ?? booking.customer_name ?? undefined,
          booking_id: booking.id,
          template_variables: variables,
        });
        sentCount++;
      } catch (err) {
        console.error(
          `[REVIEW] Failed to send SMS for booking ${booking.id}:`,
          err,
        );
      }
    }

    // Send email if allowed
    const email = booking.contact_email || booking.customer_email;
    const doNotEmail = booking.contact_do_not_email ?? false;

    if (email && !doNotEmail) {
      try {
        await queueNotification(booking.tenant_id, {
          contact_id: booking.contact_id ?? undefined,
          channel: "email",
          notification_type: "review_request",
          recipient: email,
          recipient_name:
            booking.contact_name ?? booking.customer_name ?? undefined,
          booking_id: booking.id,
          template_variables: variables,
        });
        sentCount++;
      } catch (err) {
        console.error(
          `[REVIEW] Failed to send email for booking ${booking.id}:`,
          err,
        );
      }
    }
  }

  if (sentCount > 0) {
    console.log(`[REVIEW] Sent ${sentCount} review requests`);
  }
}
