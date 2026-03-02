// Post-Call Automation
// Runs after every call is logged to auto-create deals, tasks, and update contacts.
// Non-blocking: called with .catch() so it never blocks the call log response.

import { insertOne, updateOne } from "../database/query-helpers.js";
import { tenantQueryOne } from "../database/pool.js";
import { getPipelineConfig } from "../../config/industry-pipeline.js";

interface PostCallContext {
  tenantId: string;
  callId: string;
  contactId: string | null;
  callerPhone: string | null;
  callerName: string | null;
  outcomeType: string;
  durationSeconds: number;
  status: string;
  industry: string;
}

interface ContactRow {
  id: string;
  name: string | null;
  total_calls: number;
  engagement_score: number;
  lead_status: string | null;
  status: string;
}

/**
 * Run post-call automation rules:
 * 1. Booking made -> deal (stage: won), lead_status: converted
 * 2. Escalation -> task (call_back, high priority, due tomorrow)
 * 3. Missed/short call -> task (call_back, high priority, due today)
 * 4. Repeat caller (3+ calls, score >= 80) -> VIP status
 * 5. First-time caller -> deal (stage: new), lead_status: new
 */
export async function runPostCallAutomation(
  ctx: PostCallContext,
): Promise<void> {
  if (!ctx.contactId) return;

  const config = getPipelineConfig(ctx.industry);

  // Get contact info for rule evaluation
  const contact = await tenantQueryOne<ContactRow>(
    ctx.tenantId,
    `SELECT id, name, total_calls, engagement_score, lead_status, status
     FROM contacts WHERE id = $1`,
    [ctx.contactId],
  );
  if (!contact) return;

  const contactName =
    contact.name || ctx.callerName || ctx.callerPhone || "Unknown";
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const tomorrow = new Date(now.getTime() + 86400000)
    .toISOString()
    .split("T")[0];

  try {
    // Rule 1: Booking outcome -> won deal + converted
    if (ctx.outcomeType === "booking") {
      await insertOne("deals", {
        tenant_id: ctx.tenantId,
        name: `${contactName} - ${config.dealLabel}`,
        stage: config.completedStage,
        source: "call",
        contact_id: ctx.contactId,
        call_id: ctx.callId,
        created_by: "auto",
      });

      if (contact.lead_status !== "converted") {
        await updateOne(
          "contacts",
          { lead_status: "converted", updated_at: now.toISOString() },
          { id: ctx.contactId },
        );
      }
      console.log(
        `[AUTOMATION] Deal created (won) for booking: ${contactName}`,
      );
      return;
    }

    // Rule 2: Escalation -> follow-up task
    if (ctx.outcomeType === "escalation") {
      await insertOne("tasks", {
        tenant_id: ctx.tenantId,
        title: `Follow up: escalated call from ${contactName}`,
        type: "call_back",
        priority: "high",
        due_date: tomorrow,
        contact_id: ctx.contactId,
        call_id: ctx.callId,
        source: "auto",
        created_by: "auto",
      });
      console.log(`[AUTOMATION] Task created for escalation: ${contactName}`);
      return;
    }

    // Rule 3: Missed or very short call (<10s) -> callback task
    if (ctx.status === "missed" || ctx.durationSeconds < 10) {
      await insertOne("tasks", {
        tenant_id: ctx.tenantId,
        title: `Missed call from ${contactName}`,
        type: "call_back",
        priority: "high",
        due_date: today,
        contact_id: ctx.contactId,
        call_id: ctx.callId,
        source: "auto",
        created_by: "auto",
      });
      console.log(`[AUTOMATION] Task created for missed call: ${contactName}`);
      return;
    }

    // Rule 4: Repeat caller with high engagement -> VIP
    if (
      contact.total_calls >= 3 &&
      contact.engagement_score >= 80 &&
      contact.status !== "vip"
    ) {
      await updateOne(
        "contacts",
        { status: "vip", updated_at: now.toISOString() },
        { id: ctx.contactId },
      );
      console.log(`[AUTOMATION] Contact upgraded to VIP: ${contactName}`);
    }

    // Rule 5: First-time caller (inquiry) -> new deal + new lead
    if (contact.total_calls <= 1 && ctx.outcomeType === "inquiry") {
      await insertOne("deals", {
        tenant_id: ctx.tenantId,
        name: `${contactName} - New ${config.dealLabel}`,
        stage: config.defaultStage,
        source: "call",
        contact_id: ctx.contactId,
        call_id: ctx.callId,
        created_by: "auto",
      });

      if (!contact.lead_status || contact.lead_status === "new") {
        await updateOne(
          "contacts",
          { lead_status: "new", updated_at: now.toISOString() },
          { id: ctx.contactId },
        );
      }
      console.log(
        `[AUTOMATION] Deal created (new lead) for first caller: ${contactName}`,
      );
    }
  } catch (error) {
    console.error("[AUTOMATION] Post-call automation error:", error);
  }
}
