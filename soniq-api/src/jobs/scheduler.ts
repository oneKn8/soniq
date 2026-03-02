import cron from "node-cron";
import { processReminders, sendDueReminders } from "./reminders.js";
import { processCallbacks } from "./callbacks.js";
import {
  processQueue,
  retryFailed,
} from "../services/notifications/notification-service.js";
import { updateAllEngagementScores } from "./engagement.js";
import {
  generateDailySlots,
  cleanupOldSlots,
} from "./availability-generator.js";
import { sendReviewRequests } from "./review-requests.js";

/**
 * Start the background job scheduler
 *
 * Jobs:
 * - Every minute: Process booking reminders (24h and 1h before)
 * - Every 5 minutes: Process callback queue for missed calls
 * - Every 15 minutes: Process notification queue, retry failed
 * - Every hour: Update engagement scores
 * - Daily at midnight: Generate availability slots, cleanup old data
 * - Daily at 9 AM: Send review requests for completed bookings
 */
export function startScheduler(): void {
  console.log("[SCHEDULER] Starting background jobs");

  // Process booking reminders every 10 minutes (30-min window makes 1-min unnecessary)
  cron.schedule("*/10 * * * *", async () => {
    try {
      await processReminders();
    } catch (error) {
      console.error("[SCHEDULER] Reminder job failed:", error);
    }
  });

  // Process callback queue every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      await processCallbacks();
    } catch (error) {
      console.error("[SCHEDULER] Callback job failed:", error);
    }
  });

  // Process notification queue and retry failed every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    try {
      const processed = await processQueue();
      const retried = await retryFailed();
      if (processed > 0 || retried > 0) {
        console.log(
          `[SCHEDULER] Notifications: ${processed} processed, ${retried} retried`,
        );
      }
    } catch (error) {
      console.error("[SCHEDULER] Notification queue job failed:", error);
    }
  });

  // Update engagement scores every hour
  cron.schedule("0 * * * *", async () => {
    try {
      await sendDueReminders();
      await updateAllEngagementScores();
    } catch (error) {
      console.error("[SCHEDULER] Hourly jobs failed:", error);
    }
  });

  // Daily jobs at midnight (generate slots, cleanup)
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log("[SCHEDULER] Running daily midnight jobs");
      await generateDailySlots();
      await cleanupOldSlots();
    } catch (error) {
      console.error("[SCHEDULER] Daily midnight jobs failed:", error);
    }
  });

  // Send review requests daily at 9 AM
  cron.schedule("0 9 * * *", async () => {
    try {
      await sendReviewRequests();
    } catch (error) {
      console.error("[SCHEDULER] Review request job failed:", error);
    }
  });

  console.log("[SCHEDULER] Jobs scheduled:");
  console.log("  - Reminders: every 10 minutes");
  console.log("  - Callbacks: every 5 minutes");
  console.log("  - Notification queue: every 15 minutes");
  console.log("  - Engagement scores: every hour");
  console.log("  - Daily slot generation: midnight");
  console.log("  - Review requests: 9 AM daily");
}
