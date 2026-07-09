import { Hono } from "hono";
import { z } from "zod";
import {
  getVoicemails,
  updateVoicemailStatus,
  updateVoicemailRecording,
  updateVoicemailTranscript,
  saveVoicemail,
  generateVoicemailTwiML,
  getVoicemailGreeting,
  type VoicemailReason,
} from "../services/voice/voicemail.js";

import { getAuthTenantId, verifyTelephonyWebhook } from "../middleware/index.js";
import { parseJson, parseForm } from "../lib/validate.js";

// ============================================================================
// Dashboard router (JWT + X-Tenant-ID). Mounted at /api/voicemails.
// ============================================================================
export const voicemailRoutes = new Hono();

/**
 * GET /api/voicemails
 * List voicemails for a tenant
 */
voicemailRoutes.get("/", async (c) => {
  const tenantId = getAuthTenantId(c);
  const status = c.req.query("status");
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const result = await getVoicemails(tenantId, { status, limit, offset });

  return c.json({
    voicemails: result.voicemails,
    total: result.total,
    limit,
    offset,
  });
});

const updateStatusSchema = z.object({
  status: z.enum(["pending", "reviewed", "callback_scheduled", "resolved"]),
});

/**
 * PATCH /api/voicemails/:id/status
 * Update voicemail status
 */
voicemailRoutes.patch("/:id/status", async (c) => {
  const id = c.req.param("id");
  const parsed = await parseJson(c, updateStatusSchema);
  if (!parsed.success) return parsed.response;

  const success = await updateVoicemailStatus(id, parsed.data.status);

  if (!success) {
    return c.json({ error: "Failed to update status" }, 500);
  }

  return c.json({ success: true });
});

/**
 * GET /api/voicemails/stats/:tenantId
 * Get voicemail statistics
 */
voicemailRoutes.get("/stats/:tenantId", async (c) => {
  const tenantId = c.req.param("tenantId");

  const [pending, reviewed, resolved] = await Promise.all([
    getVoicemails(tenantId, { status: "pending", limit: 1 }),
    getVoicemails(tenantId, { status: "reviewed", limit: 1 }),
    getVoicemails(tenantId, { status: "resolved", limit: 1 }),
  ]);

  return c.json({
    pending: pending.total,
    reviewed: reviewed.total,
    resolved: resolved.total,
    total: pending.total + reviewed.total + resolved.total,
  });
});

// ============================================================================
// Public webhook router (SignalWire). Mounted at /webhooks/voicemail.
// Signature-verified via verifyTelephonyWebhook(); NOT behind JWT so the
// telephony provider can actually reach these callbacks.
// ============================================================================
export const voicemailWebhookRoutes = new Hono();

// Every webhook endpoint must carry a valid provider signature (fail closed).
voicemailWebhookRoutes.use("*", verifyTelephonyWebhook());

const VOICEMAIL_REASONS = [
  "after_hours",
  "max_retries",
  "no_agent_available",
  "caller_requested",
  "call_failed",
] as const;

const recordSchema = z.object({
  tenantId: z.string().min(1),
  callSid: z.string().min(1),
  callerPhone: z.string().min(1),
  callerName: z.string().optional(),
  reason: z.enum(VOICEMAIL_REASONS),
});

/**
 * POST /webhooks/voicemail/record
 * Initiate voicemail recording (returns TwiML)
 */
voicemailWebhookRoutes.post("/record", async (c) => {
  const parsed = await parseForm(c, recordSchema);
  if (!parsed.success) return parsed.response;

  const { tenantId, callSid, callerPhone, callerName, reason } = parsed.data;

  // Save initial voicemail record
  const result = await saveVoicemail({
    tenantId,
    callSid,
    callerPhone,
    callerName,
    reason: reason as VoicemailReason,
    status: "pending",
  });

  if (!result.success) {
    return c.json({ error: result.error }, 500);
  }

  // Generate TwiML for recording
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3100";
  const callbackUrl = `${backendUrl}/webhooks/voicemail/callback/complete`;
  const greeting = getVoicemailGreeting(reason as VoicemailReason);
  const twiml = generateVoicemailTwiML(greeting, callbackUrl);

  return c.text(twiml, 200, {
    "Content-Type": "application/xml",
  });
});

// SignalWire callback bodies: validate the fields the handlers consume but stay
// permissive on unknown provider params so legitimate callbacks are never
// dropped.
const recordingCompleteSchema = z
  .object({
    CallSid: z.string().optional(),
    RecordingUrl: z.string().optional(),
    RecordingSid: z.string().optional(),
    RecordingDuration: z.string().optional(),
  })
  .passthrough();

/**
 * POST /webhooks/voicemail/callback/complete
 * SignalWire callback when recording is complete
 */
voicemailWebhookRoutes.post("/callback/complete", async (c) => {
  const parsed = await parseForm(c, recordingCompleteSchema);
  if (!parsed.success) return parsed.response;

  const callSid = parsed.data.CallSid;
  const recordingUrl = parsed.data.RecordingUrl;
  const recordingSid = parsed.data.RecordingSid || "";
  const recordingDuration = parseInt(parsed.data.RecordingDuration || "0", 10);

  console.log("[VOICEMAIL] Recording complete:", {
    callSid,
    recordingUrl,
    recordingSid,
    duration: recordingDuration,
  });

  if (callSid && recordingUrl) {
    await updateVoicemailRecording(
      callSid,
      recordingUrl,
      recordingSid,
      recordingDuration,
    );
  }

  // Return TwiML to end the call
  return c.text(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you for your message. Goodbye.</Say>
  <Hangup/>
</Response>`,
    200,
    { "Content-Type": "application/xml" },
  );
});

/**
 * POST /webhooks/voicemail/callback/status
 * SignalWire callback for recording status updates
 */
voicemailWebhookRoutes.post("/callback/status", async (c) => {
  const body = await c.req.parseBody();
  console.log("[VOICEMAIL] Recording status:", body);
  return c.json({ received: true });
});

const transcribeSchema = z
  .object({
    CallSid: z.string().optional(),
    TranscriptionText: z.string().optional(),
  })
  .passthrough();

/**
 * POST /webhooks/voicemail/callback/transcribe
 * SignalWire callback with transcription
 */
voicemailWebhookRoutes.post("/callback/transcribe", async (c) => {
  const parsed = await parseForm(c, transcribeSchema);
  if (!parsed.success) return parsed.response;

  const callSid = parsed.data.CallSid;
  const transcriptionText = parsed.data.TranscriptionText;

  console.log("[VOICEMAIL] Transcription received:", {
    callSid,
    transcript: transcriptionText?.substring(0, 100),
  });

  if (callSid && transcriptionText) {
    await updateVoicemailTranscript(callSid, transcriptionText);
  }

  return c.json({ received: true });
});
