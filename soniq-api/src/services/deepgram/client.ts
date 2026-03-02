// Deepgram Client Setup
// Real-time speech-to-text using Nova-2

import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import type { DeepgramConfig, DeepgramTranscript } from "../../types/voice.js";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

if (!DEEPGRAM_API_KEY) {
  console.error(
    "[DEEPGRAM] CRITICAL: DEEPGRAM_API_KEY not set - STT will not work",
  );
}

// Validate API key format (should be 40 char hex or longer for newer keys)
function validateApiKey(key: string): boolean {
  if (!key || key.length < 32) {
    console.error("[DEEPGRAM] API key appears invalid (too short)");
    return false;
  }
  return true;
}

// Create Deepgram client singleton
export const deepgramClient =
  DEEPGRAM_API_KEY && validateApiKey(DEEPGRAM_API_KEY)
    ? createClient(DEEPGRAM_API_KEY)
    : null;

// Verify API key by making a test request
export async function verifyDeepgramApiKey(): Promise<{
  valid: boolean;
  error?: string;
}> {
  if (!DEEPGRAM_API_KEY) {
    return { valid: false, error: "DEEPGRAM_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.deepgram.com/v1/projects", {
      method: "GET",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401 || response.status === 403) {
      const body = await response.text();
      console.error(
        "[DEEPGRAM] API key validation failed:",
        response.status,
        body,
      );
      return {
        valid: false,
        error: `Invalid API key (HTTP ${response.status})`,
      };
    }

    if (!response.ok) {
      return { valid: false, error: `API error: HTTP ${response.status}` };
    }

    console.log("[DEEPGRAM] API key verified successfully");
    return { valid: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[DEEPGRAM] API key verification network error:", msg);
    return { valid: false, error: `Network error: ${msg}` };
  }
}

// Default configuration for phone calls
// BALANCE: Not too fast (cuts off speakers) vs not too slow (awkward pauses)
//
// MODEL CHOICE for live streaming (latency vs accuracy trade-off):
// - nova-2-phonecall: Optimized for phone calls - handles compression, low-bandwidth, background noise
//   * WER: 8.4% streaming, fastest inference (29.8 s/hr)
//   * Deepgram recommendation: "best bet for phonecall accuracy"
//   * Cost: $0.0043/min
// - nova-3-general: Latest gen, 54% better accuracy (6.84% WER), better for accents
//   * But NOT phonecall-optimized, cost: $0.0066/min (53% more expensive)
// - nova-3-medical: Latest gen, optimized for medical vocabulary
//
// NOTE: Whisper models are NOT supported for live streaming on Deepgram
// They only work for batch/pre-recorded transcription
//
// Using nova-2-phonecall: Best for phone calls (SignalWire/Twilio integration)
// Upgrade to nova-3-general if accent accuracy needs justify 53% higher cost
// Set DEEPGRAM_MODEL env var to override
export const defaultDeepgramConfig: DeepgramConfig = {
  model:
    (process.env.DEEPGRAM_MODEL as DeepgramConfig["model"]) ||
    "nova-2-phonecall",
  language: "en", // "en" allows accent flexibility vs "en-US" which expects American
  punctuate: true,
  interimResults: true,
  utteranceEndMs: 1000, // Minimum allowed value (Deepgram rejects <1000)
  vadEvents: true,
  encoding: "linear16", // 16-bit signed PCM (matches SignalWire L16@24000h)
  sampleRate: 24000, // 24kHz - high quality audio
  channels: 1,
  endpointing: 250, // Faster turn-taking while still avoiding most mid-word cutoffs
};

export { LiveTranscriptionEvents };
export type { DeepgramTranscript };
