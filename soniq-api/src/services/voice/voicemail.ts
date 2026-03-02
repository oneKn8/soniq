// Voicemail Service
// Handles voicemail recording and storage when agent is unavailable

import { queryOne, queryAll } from "../database/client.js";
import { insertOne, updateOne } from "../database/query-helpers.js";

export interface VoicemailConfig {
  enabled: boolean;
  maxDurationSeconds: number;
  greetingMessage: string;
  afterHoursMessage: string;
  transcribeVoicemail: boolean;
}

export interface VoicemailRecord {
  id?: string;
  tenantId: string;
  callSid: string;
  callerPhone: string;
  callerName?: string;
  recordingUrl?: string;
  recordingSid?: string;
  durationSeconds?: number;
  transcript?: string;
  reason: VoicemailReason;
  status: "pending" | "reviewed" | "callback_scheduled" | "resolved";
  createdAt?: string;
}

export type VoicemailReason =
  | "after_hours"
  | "max_retries"
  | "no_agent_available"
  | "caller_requested"
  | "call_failed";

const DEFAULT_CONFIG: VoicemailConfig = {
  enabled: true,
  maxDurationSeconds: 120,
  greetingMessage:
    "We're sorry we couldn't assist you right now. Please leave a message after the tone, and we'll get back to you as soon as possible.",
  afterHoursMessage:
    "Thank you for calling. We're currently closed. Please leave a message and we'll return your call during business hours.",
  transcribeVoicemail: true,
};

/**
 * Check if voicemail should be triggered based on conditions
 */
export function shouldTriggerVoicemail(
  isAfterHours: boolean,
  retryCount: number,
  maxRetries: number,
  callerRequested: boolean,
): { trigger: boolean; reason: VoicemailReason | null } {
  if (callerRequested) {
    return { trigger: true, reason: "caller_requested" };
  }

  if (isAfterHours) {
    return { trigger: true, reason: "after_hours" };
  }

  if (retryCount >= maxRetries) {
    return { trigger: true, reason: "max_retries" };
  }

  return { trigger: false, reason: null };
}

/**
 * Get voicemail greeting based on reason
 */
export function getVoicemailGreeting(
  reason: VoicemailReason,
  config: Partial<VoicemailConfig> = {},
): string {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  switch (reason) {
    case "after_hours":
      return mergedConfig.afterHoursMessage;
    case "caller_requested":
      return "I'll transfer you to voicemail now. Please leave your message after the tone.";
    case "max_retries":
    case "no_agent_available":
    case "call_failed":
    default:
      return mergedConfig.greetingMessage;
  }
}

/**
 * Generate TwiML for voicemail recording
 */
export function generateVoicemailTwiML(
  greeting: string,
  callbackUrl: string,
  maxDuration: number = 120,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(greeting)}</Say>
  <Record
    maxLength="${maxDuration}"
    playBeep="true"
    action="${callbackUrl}"
    recordingStatusCallback="${callbackUrl.replace("/complete", "/status")}"
    transcribe="true"
    transcribeCallback="${callbackUrl.replace("/complete", "/transcribe")}"
  />
  <Say voice="Polly.Joanna">We did not receive a recording. Goodbye.</Say>
</Response>`;
}

interface VoicemailInsertRow {
  id: string;
}

/**
 * Save voicemail record to database
 */
export async function saveVoicemail(
  voicemail: VoicemailRecord,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const data = await insertOne<VoicemailInsertRow>("voicemails", {
      tenant_id: voicemail.tenantId,
      call_sid: voicemail.callSid,
      caller_phone: voicemail.callerPhone,
      caller_name: voicemail.callerName,
      recording_url: voicemail.recordingUrl,
      recording_sid: voicemail.recordingSid,
      duration_seconds: voicemail.durationSeconds,
      transcript: voicemail.transcript,
      reason: voicemail.reason,
      status: voicemail.status || "pending",
    });

    return { success: true, id: data.id };
  } catch (error) {
    console.error("[VOICEMAIL] Save error:", error);
    throw error;
  }
}

/**
 * Update voicemail with recording details
 */
export async function updateVoicemailRecording(
  callSid: string,
  recordingUrl: string,
  recordingSid: string,
  durationSeconds: number,
): Promise<boolean> {
  try {
    await updateOne(
      "voicemails",
      {
        recording_url: recordingUrl,
        recording_sid: recordingSid,
        duration_seconds: durationSeconds,
      },
      { call_sid: callSid },
    );

    return true;
  } catch (error) {
    console.error("[VOICEMAIL] Update recording error:", error);
    throw error;
  }
}

/**
 * Update voicemail transcript
 */
export async function updateVoicemailTranscript(
  callSid: string,
  transcript: string,
): Promise<boolean> {
  try {
    await updateOne("voicemails", { transcript }, { call_sid: callSid });

    return true;
  } catch (error) {
    console.error("[VOICEMAIL] Update transcript error:", error);
    throw error;
  }
}

interface VoicemailDbRow {
  id: string;
  tenant_id: string;
  call_sid: string;
  caller_phone: string;
  caller_name: string | null;
  recording_url: string | null;
  recording_sid: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  reason: VoicemailReason;
  status: VoicemailRecord["status"];
  created_at: string;
}

interface CountRow {
  total: string;
}

/**
 * Get voicemails for a tenant
 */
export async function getVoicemails(
  tenantId: string,
  options: { status?: string; limit?: number; offset?: number } = {},
): Promise<{ voicemails: VoicemailRecord[]; total: number }> {
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  try {
    let countSql =
      "SELECT COUNT(*) as total FROM voicemails WHERE tenant_id = $1";
    let dataSql = `
      SELECT * FROM voicemails
      WHERE tenant_id = $1
    `;
    const countParams: unknown[] = [tenantId];
    const dataParams: unknown[] = [tenantId];

    if (options.status) {
      countSql += " AND status = $2";
      dataSql += " AND status = $2";
      countParams.push(options.status);
      dataParams.push(options.status);
    }

    dataSql += ` ORDER BY created_at DESC LIMIT $${dataParams.length + 1} OFFSET $${dataParams.length + 2}`;
    dataParams.push(limit, offset);

    const countResult = await queryOne<CountRow>(countSql, countParams);
    const data = await queryAll<VoicemailDbRow>(dataSql, dataParams);

    return {
      voicemails: (data || []).map(mapDbToVoicemail),
      total: parseInt(countResult?.total || "0", 10),
    };
  } catch (error) {
    console.error("[VOICEMAIL] Get error:", error);
    throw error;
  }
}

/**
 * Update voicemail status
 */
export async function updateVoicemailStatus(
  id: string,
  status: VoicemailRecord["status"],
): Promise<boolean> {
  try {
    await updateOne("voicemails", { status }, { id });

    return true;
  } catch (error) {
    console.error("[VOICEMAIL] Update status error:", error);
    throw error;
  }
}

// Helper functions
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function mapDbToVoicemail(row: VoicemailDbRow): VoicemailRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    callSid: row.call_sid,
    callerPhone: row.caller_phone,
    callerName: row.caller_name || undefined,
    recordingUrl: row.recording_url || undefined,
    recordingSid: row.recording_sid || undefined,
    durationSeconds: row.duration_seconds || undefined,
    transcript: row.transcript || undefined,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
  };
}
