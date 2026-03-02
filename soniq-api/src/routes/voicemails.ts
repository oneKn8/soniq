import { Hono } from "hono";
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

import { getAuthTenantId } from "../middleware/index.js";

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

/**
 * PATCH /api/voicemails/:id/status
 * Update voicemail status
 */
voicemailRoutes.patch("/:id/status", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { status } = body;

  if (
    !["pending", "reviewed", "callback_scheduled", "resolved"].includes(status)
  ) {
    return c.json({ error: "Invalid status" }, 400);
  }

  const success = await updateVoicemailStatus(id, status);

  if (!success) {
    return c.json({ error: "Failed to update status" }, 500);
  }

  return c.json({ success: true });
});

/**
 * POST /api/voicemails/record
 * Initiate voicemail recording (returns TwiML)
 */
voicemailRoutes.post("/record", async (c) => {
  const body = await c.req.json();
  const { tenantId, callSid, callerPhone, callerName, reason } = body;

  if (!tenantId || !callSid || !callerPhone || !reason) {
    return c.json({ error: "Missing required fields" }, 400);
  }

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
  const callbackUrl = `${backendUrl}/api/voicemails/callback/complete`;
  const greeting = getVoicemailGreeting(reason as VoicemailReason);
  const twiml = generateVoicemailTwiML(greeting, callbackUrl);

  return c.text(twiml, 200, {
    "Content-Type": "application/xml",
  });
});

/**
 * POST /api/voicemails/callback/complete
 * SignalWire callback when recording is complete
 */
voicemailRoutes.post("/callback/complete", async (c) => {
  const body = await c.req.parseBody();
  const callSid = body.CallSid as string;
  const recordingUrl = body.RecordingUrl as string;
  const recordingSid = body.RecordingSid as string;
  const recordingDuration = parseInt(
    (body.RecordingDuration as string) || "0",
    10,
  );

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
 * POST /api/voicemails/callback/status
 * SignalWire callback for recording status updates
 */
voicemailRoutes.post("/callback/status", async (c) => {
  const body = await c.req.parseBody();
  console.log("[VOICEMAIL] Recording status:", body);
  return c.json({ received: true });
});

/**
 * POST /api/voicemails/callback/transcribe
 * SignalWire callback with transcription
 */
voicemailRoutes.post("/callback/transcribe", async (c) => {
  const body = await c.req.parseBody();
  const callSid = body.CallSid as string;
  const transcriptionText = body.TranscriptionText as string;

  console.log("[VOICEMAIL] Transcription received:", {
    callSid,
    transcript: transcriptionText?.substring(0, 100),
  });

  if (callSid && transcriptionText) {
    await updateVoicemailTranscript(callSid, transcriptionText);
  }

  return c.json({ received: true });
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
