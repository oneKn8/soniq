-- Soniq Voice Agent - Initial Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TENANTS TABLE
-- Multi-tenant business configurations
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Identity
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  phone_number TEXT NOT NULL UNIQUE, -- Vapi phone number

  -- Agent configuration
  agent_name TEXT NOT NULL DEFAULT 'AI Assistant',
  agent_personality JSONB NOT NULL DEFAULT '{"tone": "professional", "verbosity": "balanced", "empathy": "medium", "humor": false}',
  voice_config JSONB NOT NULL DEFAULT '{"provider": "cartesia", "voice_id": "a0e99841-438c-4a64-b679-ae501e7d6091", "voice_name": "Default", "speaking_rate": 1.0, "pitch": 1.0}',

  -- Greetings
  greeting_standard TEXT NOT NULL,
  greeting_after_hours TEXT,
  greeting_returning TEXT,

  -- Operating hours
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  operating_hours JSONB NOT NULL DEFAULT '{"schedule": [], "holidays": []}',

  -- Escalation
  escalation_enabled BOOLEAN DEFAULT TRUE,
  escalation_phone TEXT,
  escalation_triggers TEXT[] DEFAULT ARRAY['speak to human', 'manager'],

  -- Feature flags
  features JSONB NOT NULL DEFAULT '{"sms_confirmations": true, "email_notifications": false, "live_transfer": true, "voicemail_fallback": true, "sentiment_analysis": true, "recording_enabled": true, "transcription_enabled": true}',

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise'))
);

-- Index for fast phone number lookup (critical for webhook performance)
CREATE INDEX IF NOT EXISTS idx_tenants_phone ON tenants(phone_number) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);

-- ============================================================================
-- CALLS TABLE
-- Call logs with Vapi data
-- ============================================================================
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- References
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vapi_call_id TEXT NOT NULL UNIQUE,

  -- Call details
  caller_phone TEXT,
  caller_name TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL CHECK (status IN ('ringing', 'connected', 'completed', 'failed', 'missed')),

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Outcome
  ended_reason TEXT,
  outcome_type TEXT CHECK (outcome_type IN ('booking', 'inquiry', 'support', 'escalation', 'hangup')),
  outcome_success BOOLEAN,

  -- AI analysis
  transcript TEXT,
  summary TEXT,
  sentiment_score DECIMAL(3,2),
  intents_detected TEXT[],

  -- Recording
  recording_url TEXT,

  -- Cost tracking (in cents)
  cost_cents INTEGER
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_calls_tenant ON calls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calls_vapi_id ON calls(vapi_call_id);
CREATE INDEX IF NOT EXISTS idx_calls_created ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);

-- ============================================================================
-- BOOKINGS TABLE
-- Reservations and appointments
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- References
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,

  -- Customer
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,

  -- Booking details
  booking_type TEXT NOT NULL DEFAULT 'general',
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  duration_minutes INTEGER,
  notes TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  confirmation_code TEXT NOT NULL UNIQUE,

  -- Pricing (in cents)
  amount_cents INTEGER,

  -- Reminders
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation ON bookings(confirmation_code);
CREATE INDEX IF NOT EXISTS idx_bookings_reminder ON bookings(reminder_sent, booking_date) WHERE status = 'confirmed';

-- ============================================================================
-- CALLBACK QUEUE TABLE
-- Missed calls that need follow-up
-- ============================================================================
CREATE TABLE IF NOT EXISTS callback_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- References
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  original_call_id UUID REFERENCES calls(id) ON DELETE SET NULL,

  -- Callback details
  phone_number TEXT NOT NULL,
  reason TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- Index for job processing
CREATE INDEX IF NOT EXISTS idx_callbacks_pending ON callback_queue(status, priority DESC, created_at ASC) WHERE status = 'pending';

-- ============================================================================
-- SMS MESSAGES TABLE
-- SMS tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- References
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,

  -- Message details
  to_phone TEXT NOT NULL,
  from_phone TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('confirmation', 'reminder', 'missed_call', 'custom')),
  body TEXT NOT NULL,

  -- Twilio tracking
  twilio_sid TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  error_message TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_tenant ON sms_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sms_status ON sms_messages(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable after setting up auth
-- ============================================================================

-- For now, keep RLS disabled for development
-- In production, enable and configure policies

-- ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE callback_queue ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_calls_updated_at
  BEFORE UPDATE ON calls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
