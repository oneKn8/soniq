import { queryAll } from "../services/database/client.js";
import { updateOne } from "../services/database/query-helpers.js";

interface CallbackRecord {
  id: string;
  tenant_id: string;
  phone_number: string;
  attempts: number;
  status: string;
}

/**
 * Process callback queue
 *
 * Finds missed calls that need callbacks and initiates outbound calls.
 * TODO: Implement outbound calls via SignalWire API.
 */
export async function processCallbacks(): Promise<void> {
  // Find pending callbacks with attempts < 3, ordered by priority (desc) then created_at (asc)
  const callbacks = await queryAll<CallbackRecord>(
    `SELECT id, tenant_id, phone_number, attempts, status
     FROM callback_queue
     WHERE status = $1 AND attempts < $2
     ORDER BY priority DESC, created_at ASC
     LIMIT 10`,
    ["pending", 3],
  );

  if (callbacks.length === 0) {
    return; // No callbacks to process
  }

  console.log(`[CALLBACKS] Processing ${callbacks.length} callbacks`);

  for (const callback of callbacks) {
    try {
      // Mark as in progress
      await updateOne(
        "callback_queue",
        {
          status: "in_progress",
          attempts: callback.attempts + 1,
          last_attempt_at: new Date().toISOString(),
        },
        { id: callback.id },
      );

      // TODO: Initiate outbound call via SignalWire API
      console.log(
        `[CALLBACKS] Would call ${callback.phone_number} for tenant ${callback.tenant_id}`,
      );

      // Mark as completed (in production, this would be after successful call)
      // For now, mark as completed after logging
      await updateOne(
        "callback_queue",
        {
          status: "completed",
          completed_at: new Date().toISOString(),
          notes: "Auto-processed (outbound calls not yet implemented)",
        },
        { id: callback.id },
      );
    } catch (err) {
      console.error(`[CALLBACKS] Failed for ${callback.id}:`, err);

      // Mark as failed if max attempts reached
      if (callback.attempts >= 2) {
        await updateOne(
          "callback_queue",
          {
            status: "failed",
            notes: "Max attempts reached",
          },
          { id: callback.id },
        );
      } else {
        // Reset to pending for retry
        await updateOne(
          "callback_queue",
          { status: "pending" },
          { id: callback.id },
        );
      }
    }
  }
}
