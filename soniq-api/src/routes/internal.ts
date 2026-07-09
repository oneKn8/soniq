// Internal API Routes
// Used by the LiveKit Python agent to communicate with soniq-api
// Authenticated via INTERNAL_API_KEY bearer token

import { Hono } from "hono";
import type { Context, Next } from "hono";
import { z } from "zod";
import { parseJson } from "../lib/validate.js";
import { getTenantByPhoneWithFallback } from "../services/database/tenant-cache.js";
import { buildSystemPrompt } from "../services/gemini/chat.js";
import { executeTool } from "../services/gemini/tools.js";
import { insertOne } from "../services/database/query-helpers.js";
import { queryAll } from "../services/database/client.js";
import { findOrCreateByPhone } from "../services/contacts/contact-service.js";
import { runPostCallAutomation } from "../services/automation/post-call.js";
import type { ToolExecutionContext } from "../types/voice.js";
import { logger } from "../lib/logger.js";

export const internalRoutes = new Hono();

// Internal API key auth middleware
function internalAuth() {
  return async (c: Context, next: Next) => {
    const apiKey = process.env.INTERNAL_API_KEY;
    if (!apiKey) {
      logger.error("[INTERNAL] INTERNAL_API_KEY not configured");
      return c.json({ error: "Internal API not configured" }, 500);
    }

    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Missing Authorization header" }, 401);
    }

    const token = authHeader.slice(7);
    if (token !== apiKey) {
      return c.json({ error: "Invalid API key" }, 403);
    }

    await next();
  };
}

// Apply auth to all routes
internalRoutes.use("*", internalAuth());

// GET /internal/tenants/by-phone/:phone
// Returns tenant config + voice config + system prompt for the Python agent
internalRoutes.get("/tenants/by-phone/:phone", async (c) => {
  const phone = decodeURIComponent(c.req.param("phone"));

  if (!phone) {
    return c.json({ error: "Phone number required" }, 400);
  }

  const tenant = await getTenantByPhoneWithFallback(phone);

  if (!tenant) {
    logger.warn(`[INTERNAL] No tenant found for phone: ${phone}`);
    return c.json({ error: "Tenant not found" }, 404);
  }

  // Fetch the tenant's enabled capabilities (drives prompt blocks and agent gating)
  let capabilities: string[] = [];
  try {
    const capRows = await queryAll<{ capability: string }>(
      `SELECT capability FROM tenant_capabilities
       WHERE tenant_id = $1 AND is_enabled = true`,
      [tenant.id],
    );
    capabilities = (capRows || []).map((row) => row.capability);
  } catch (err) {
    logger.warn({ err }, "[INTERNAL] Failed to load tenant capabilities:");
  }

  // Build the system prompt using the existing prompt builder
  // The DB SELECT * returns columns beyond the base Tenant type (location, custom_instructions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenant as any;
  const systemPrompt = buildSystemPrompt(
    tenant.agent_name,
    tenant.business_name,
    tenant.agent_personality,
    {
      operatingHours: t.operating_hours,
      locationAddress: t.location_address || undefined,
      locationCity: t.location_city || undefined,
      customInstructions: t.custom_instructions || undefined,
      escalationPhone: tenant.escalation_phone || undefined,
      timezone: tenant.timezone,
      capabilities,
    },
  );

  return c.json({
    id: tenant.id,
    business_name: tenant.business_name,
    agent_name: tenant.agent_name,
    phone_number: tenant.phone_number,
    voice_config: tenant.voice_config,
    agent_personality: tenant.agent_personality,
    greeting_standard: tenant.greeting_standard,
    greeting_after_hours: tenant.greeting_after_hours,
    greeting_returning: tenant.greeting_returning,
    timezone: tenant.timezone,
    operating_hours: tenant.operating_hours,
    escalation_enabled: tenant.escalation_enabled,
    escalation_phone: tenant.escalation_phone,
    escalation_triggers: tenant.escalation_triggers,
    features: tenant.features,
    voice_pipeline: tenant.voice_pipeline,
    max_call_duration_seconds: t.max_call_duration_seconds ?? 900,
    system_prompt: systemPrompt,
    capabilities,
  });
});

const voiceToolSchema = z.object({
  tenant_id: z.string().min(1),
  call_sid: z.string().optional(),
  caller_phone: z.string().optional(),
  escalation_phone: z.string().optional(),
  args: z.record(z.unknown()).optional(),
});

// POST /internal/voice-tools/:action
// Routes tool calls from the Python agent to existing tool execution functions
internalRoutes.post("/voice-tools/:action", async (c) => {
  const action = c.req.param("action");

  if (!action) {
    return c.json({ error: "action is required" }, 400);
  }

  const parsed = await parseJson(c, voiceToolSchema);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const context: ToolExecutionContext = {
    tenantId: body.tenant_id,
    callSid: body.call_sid || "",
    callerPhone: body.caller_phone,
    escalationPhone: body.escalation_phone,
  };

  try {
    const result = await executeTool(action, body.args || {}, context);
    return c.json({ result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Tool execution failed";
    logger.error({ error }, `[INTERNAL] Tool ${action} failed:`);
    return c.json({ error: message }, 500);
  }
});

// Map agent status values to DB constraint: ('ringing', 'connected', 'completed', 'failed', 'missed')
type DbCallStatus = "ringing" | "connected" | "completed" | "failed" | "missed";

function mapCallStatus(status: string | undefined): DbCallStatus {
  switch (status) {
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "transferred":
      return "completed"; // Transfers are completed calls with escalation outcome
    case "no-answer":
      return "missed";
    default:
      return "completed";
  }
}

const callLogSchema = z.object({
  tenant_id: z.string().min(1),
  call_sid: z.string().min(1),
  caller_phone: z.string().optional(),
  caller_name: z.string().optional(),
  direction: z.enum(["inbound", "outbound"]).optional(),
  // status stays a loose string; it is normalized by mapCallStatus.
  status: z.string().optional(),
  started_at: z.string(),
  ended_at: z.string(),
  duration_seconds: z.coerce.number().nonnegative(),
  ended_reason: z.string().optional(),
  outcome_type: z
    .enum(["booking", "inquiry", "support", "escalation", "hangup"])
    .optional(),
  outcome_success: z.boolean().optional(),
  transcript: z.string().optional(),
  summary: z.string().optional(),
  sentiment_score: z.coerce.number().optional(),
  intents_detected: z.array(z.string()).optional(),
  recording_url: z.string().optional(),
  cost_cents: z.coerce.number().optional(),
});

// POST /internal/calls/log
// Saves a call record from the Python agent
internalRoutes.post("/calls/log", async (c) => {
  const parsed = await parseJson(c, callLogSchema);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  try {
    // Auto-create or find contact by caller phone
    let contactId: string | null = null;
    if (body.caller_phone) {
      try {
        const contact = await findOrCreateByPhone(
          body.tenant_id,
          body.caller_phone,
          { name: body.caller_name || undefined, source: "call" },
        );
        contactId = contact.id;
      } catch (err) {
        logger.warn({ err }, "[INTERNAL] Failed to find/create contact:");
      }
    }

    const record = await insertOne(
      "calls",
      {
        tenant_id: body.tenant_id,
        provider_call_id: body.call_sid,
        caller_phone: body.caller_phone || null,
        caller_name: body.caller_name || null,
        direction: body.direction || "inbound",
        status: mapCallStatus(body.status),
        started_at: body.started_at,
        ended_at: body.ended_at,
        duration_seconds: body.duration_seconds,
        ended_reason: body.ended_reason || null,
        outcome_type: body.outcome_type || "inquiry",
        outcome_success: body.outcome_success ?? true,
        transcript: body.transcript || null,
        summary: body.summary || null,
        sentiment_score: body.sentiment_score ?? null,
        intents_detected: body.intents_detected || null,
        recording_url: body.recording_url || null,
        cost_cents: body.cost_cents ?? null,
        contact_id: contactId,
      },
      "*",
      body.tenant_id,
    );

    logger.info(`[INTERNAL] Call logged: ${body.call_sid}, ${body.duration_seconds}s, ${body.outcome_type || "inquiry"}`);

    // Run post-call automation (deals, tasks, status updates) - non-blocking
    runPostCallAutomation({
      tenantId: body.tenant_id,
      callId: record.id,
      contactId,
      callerPhone: body.caller_phone || null,
      callerName: body.caller_name || null,
      outcomeType: body.outcome_type || "inquiry",
      durationSeconds: body.duration_seconds,
      status: mapCallStatus(body.status),
    }).catch((err) => {
      logger.error({ err }, "[INTERNAL] Post-call automation error:");
    });

    return c.json({ success: true, id: record.id });
  } catch (error) {
    logger.error({ error }, "[INTERNAL] Failed to log call:");
    return c.json({ error: "Failed to save call record" }, 500);
  }
});
