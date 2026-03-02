-- Migration 018: Voice Pipeline Feature Flag
-- Adds per-tenant flag to route calls through custom pipeline or LiveKit Agents

ALTER TABLE tenants ADD COLUMN voice_pipeline TEXT NOT NULL DEFAULT 'custom'
  CHECK (voice_pipeline IN ('custom', 'livekit'));

COMMENT ON COLUMN tenants.voice_pipeline IS 'Voice pipeline routing: custom = SignalWire WebSocket stream, livekit = LiveKit Agents SIP';
