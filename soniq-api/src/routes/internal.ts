// Internal API Routes
// Used by the LiveKit Python agent to communicate with soniq-api
// Authenticated via INTERNAL_API_KEY bearer token

import { Hono } from "hono";
import type { Context, Next } from "hono";
import {
  getTenantByPhoneWithFallback,
  getTenantById,
} from "../services/database/tenant-cache.js";
import { buildSystemPrompt } from "../services/gemini/chat.js";
import { executeTool } from "../services/gemini/tools.js";
import { insertOne } from "../services/database/query-helpers.js";
import { findOrCreateByPhone } from "../services/contacts/contact-service.js";
import { runPostCallAutomation } from "../services/automation/post-call.js";
import type { ToolExecutionContext } from "../types/voice.js";

export const internalRoutes = new Hono();

// Internal API key auth middleware
function internalAuth() {
  return async (c: Context, next: Next) => {
    const apiKey = process.env.INTERNAL_API_KEY;
    if (!apiKey) {
      console.error("[INTERNAL] INTERNAL_API_KEY not configured");
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
    console.warn(`[INTERNAL] No tenant found for phone: ${phone}`);
    return c.json({ error: "Tenant not found" }, 404);
  }

  // Build the system prompt using the existing prompt builder
  // The DB SELECT * returns columns beyond the base Tenant type (location, custom_instructions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenant as any;
  const systemPrompt = buildSystemPrompt(
    tenant.agent_name,
    tenant.business_name,
    tenant.industry,
    tenant.agent_personality,
    {
      operatingHours: t.operating_hours,
      locationAddress: t.location_address || undefined,
      locationCity: t.location_city || undefined,
      customInstructions: t.custom_instructions || undefined,
      escalationPhone: tenant.escalation_phone || undefined,
      timezone: tenant.timezone,
    },
  );

  return c.json({
    id: tenant.id,
    business_name: tenant.business_name,
    industry: tenant.industry,
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
  });
});

// POST /internal/voice-tools/:action
// Routes tool calls from the Python agent to existing tool execution functions
internalRoutes.post("/voice-tools/:action", async (c) => {
  const action = c.req.param("action");

  const body = await c.req.json<{
    tenant_id: string;
    call_sid: string;
    caller_phone?: string;
    escalation_phone?: string;
    args: Record<string, unknown>;
  }>();

  if (!body.tenant_id || !action) {
    return c.json({ error: "tenant_id and action are required" }, 400);
  }

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
    console.error(`[INTERNAL] Tool ${action} failed:`, error);
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

// POST /internal/calls/log
// Saves a call record from the Python agent
internalRoutes.post("/calls/log", async (c) => {
  const body = await c.req.json<{
    tenant_id: string;
    call_sid: string;
    caller_phone?: string;
    caller_name?: string;
    direction?: "inbound" | "outbound";
    status?: string;
    started_at: string;
    ended_at: string;
    duration_seconds: number;
    ended_reason?: string;
    outcome_type?: "booking" | "inquiry" | "support" | "escalation" | "hangup";
    outcome_success?: boolean;
    transcript?: string;
    summary?: string;
    sentiment_score?: number;
    intents_detected?: string[];
    recording_url?: string;
    cost_cents?: number;
  }>();

  if (!body.tenant_id || !body.call_sid) {
    return c.json({ error: "tenant_id and call_sid are required" }, 400);
  }

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
        console.warn("[INTERNAL] Failed to find/create contact:", err);
      }
    }

    const record = await insertOne("calls", {
      tenant_id: body.tenant_id,
      vapi_call_id: body.call_sid,
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
    });

    console.log(
      `[INTERNAL] Call logged: ${body.call_sid}, ${body.duration_seconds}s, ${body.outcome_type || "inquiry"}`,
    );

    // Run post-call automation (deals, tasks, status updates) - non-blocking
    const tenant = getTenantById(body.tenant_id);
    runPostCallAutomation({
      tenantId: body.tenant_id,
      callId: record.id,
      contactId,
      callerPhone: body.caller_phone || null,
      callerName: body.caller_name || null,
      outcomeType: body.outcome_type || "inquiry",
      durationSeconds: body.duration_seconds,
      status: mapCallStatus(body.status),
      industry: tenant?.industry || "restaurant",
    }).catch((err) => {
      console.error("[INTERNAL] Post-call automation error:", err);
    });

    return c.json({ success: true, id: record.id });
  } catch (error) {
    console.error("[INTERNAL] Failed to log call:", error);
    return c.json({ error: "Failed to save call record" }, 500);
  }
});
