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
import { logger } from "../lib/logger.js";

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
  logger.info("[SCHEDULER] Starting background jobs");

  // Process booking reminders every 10 minutes (30-min window makes 1-min unnecessary)
  cron.schedule("*/10 * * * *", async () => {
    try {
      await processReminders();
    } catch (error) {
      logger.error({ error }, "[SCHEDULER] Reminder job failed:");
    }
  });

  // Process callback queue every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      await processCallbacks();
    } catch (error) {
      logger.error({ error }, "[SCHEDULER] Callback job failed:");
    }
  });

  // Process notification queue and retry failed every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    try {
      const processed = await processQueue();
      const retried = await retryFailed();
      if (processed > 0 || retried > 0) {
        logger.info(`[SCHEDULER] Notifications: ${processed} processed, ${retried} retried`);
      }
    } catch (error) {
      logger.error({ error }, "[SCHEDULER] Notification queue job failed:");
    }
  });

  // Update engagement scores every hour
  cron.schedule("0 * * * *", async () => {
    try {
      await sendDueReminders();
      await updateAllEngagementScores();
    } catch (error) {
      logger.error({ error }, "[SCHEDULER] Hourly jobs failed:");
    }
  });

  // Daily jobs at midnight (generate slots, cleanup)
  cron.schedule("0 0 * * *", async () => {
    try {
      logger.info("[SCHEDULER] Running daily midnight jobs");
      await generateDailySlots();
      await cleanupOldSlots();
    } catch (error) {
      logger.error({ error }, "[SCHEDULER] Daily midnight jobs failed:");
    }
  });

  // Send review requests daily at 9 AM
  cron.schedule("0 9 * * *", async () => {
    try {
      await sendReviewRequests();
    } catch (error) {
      logger.error({ error }, "[SCHEDULER] Review request job failed:");
    }
  });

  logger.info("[SCHEDULER] Jobs scheduled:");
  logger.info("  - Reminders: every 10 minutes");
  logger.info("  - Callbacks: every 5 minutes");
  logger.info("  - Notification queue: every 15 minutes");
  logger.info("  - Engagement scores: every hour");
  logger.info("  - Daily slot generation: midnight");
  logger.info("  - Review requests: 9 AM daily");
}
