-- Soniq Database Schema
-- Exported from Supabase, migrated to self-hosted PostgreSQL
-- Generated: 2026-02-03

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  phone_number TEXT NOT NULL UNIQUE,
  agent_name TEXT DEFAULT 'AI Assistant' NOT NULL,
  agent_personality JSONB DEFAULT '{"tone": "professional", "humor": false, "empathy": "medium", "verbosity": "balanced"}'::jsonb NOT NULL,
  voice_config JSONB DEFAULT '{"pitch": 1.0, "provider": "cartesia", "voice_id": "a0e99841-438c-4a64-b679-ae501e7d6091", "voice_name": "Default", "speaking_rate": 1.0}'::jsonb NOT NULL,
  greeting_standard TEXT NOT NULL,
  greeting_after_hours TEXT,
  greeting_returning TEXT,
  timezone TEXT DEFAULT 'America/New_York' NOT NULL,
  operating_hours JSONB DEFAULT '{"holidays": [], "schedule": []}'::jsonb NOT NULL,
  escalation_enabled BOOLEAN DEFAULT true,
  escalation_phone TEXT,
  escalation_triggers TEXT[] DEFAULT ARRAY['speak to human', 'manager'],
  features JSONB DEFAULT '{"live_transfer": true, "recording_enabled": true, "sms_confirmations": true, "sentiment_analysis": true, "voicemail_fallback": true, "email_notifications": false, "transcription_enabled": true}'::jsonb NOT NULL,
  is_active BOOLEAN DEFAULT true,
  subscription_tier TEXT DEFAULT 'starter',
  custom_instructions TEXT,
  questionnaire_answers JSONB,
  contact_email TEXT,
  setup_completed BOOLEAN DEFAULT false,
  setup_step TEXT DEFAULT 'business',
  setup_completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft',
  location_city TEXT,
  location_address TEXT,
  assisted_mode BOOLEAN DEFAULT false,
  after_hours_behavior TEXT DEFAULT 'answer_closed',
  transfer_behavior JSONB DEFAULT '{"type": "warm", "no_answer": "message"}'::jsonb
);

CREATE TABLE IF NOT EXISTS tenant_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member' NOT NULL,
  invited_by UUID,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(tenant_id, user_id)
);

-- ============================================================================
-- CONTACTS & CRM
-- ============================================================================

CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  phone_normalized TEXT NOT NULL,
  email TEXT,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  source TEXT DEFAULT 'call' NOT NULL,
  source_details JSONB DEFAULT '{}'::jsonb,
  first_contact_at TIMESTAMPTZ DEFAULT now(),
  last_contact_at TIMESTAMPTZ,
  last_booking_at TIMESTAMPTZ,
  last_call_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  total_calls INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  total_completed_bookings INTEGER DEFAULT 0,
  total_cancelled_bookings INTEGER DEFAULT 0,
  total_no_shows INTEGER DEFAULT 0,
  total_sms_sent INTEGER DEFAULT 0,
  total_emails_sent INTEGER DEFAULT 0,
  lifetime_value_cents INTEGER DEFAULT 0,
  average_booking_value_cents INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  engagement_level TEXT,
  sentiment_average NUMERIC,
  status TEXT DEFAULT 'active',
  lead_status TEXT,
  preferred_contact_method TEXT,
  preferred_contact_time TEXT,
  preferred_language TEXT DEFAULT 'en',
  timezone TEXT,
  do_not_call BOOLEAN DEFAULT false,
  do_not_sms BOOLEAN DEFAULT false,
  do_not_email BOOLEAN DEFAULT false,
  marketing_opt_in BOOLEAN DEFAULT false,
  marketing_opt_in_at TIMESTAMPTZ,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}'::text[],
  notes TEXT,
  avatar_url TEXT,
  UNIQUE(tenant_id, phone_normalized)
);

CREATE TABLE IF NOT EXISTS contact_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  note_type TEXT DEFAULT 'general' NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_by TEXT,
  created_by_name TEXT,
  call_id UUID,
  booking_id UUID,
  is_pinned BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_activity (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  related_id UUID,
  related_type TEXT,
  performed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- CALLS & CONVERSATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS calls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vapi_call_id TEXT NOT NULL,
  caller_phone TEXT,
  caller_name TEXT,
  direction TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  ended_reason TEXT,
  outcome_type TEXT,
  outcome_success BOOLEAN,
  transcript TEXT,
  summary TEXT,
  sentiment_score NUMERIC,
  intents_detected TEXT[],
  recording_url TEXT,
  cost_cents INTEGER,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS conversation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  industry TEXT,
  scenario_type TEXT,
  language TEXT DEFAULT 'en',
  messages JSONB DEFAULT '[]'::jsonb NOT NULL,
  quality_score NUMERIC,
  is_complete BOOLEAN DEFAULT false,
  has_tool_calls BOOLEAN DEFAULT false,
  has_escalation BOOLEAN DEFAULT false,
  outcome_success BOOLEAN,
  turn_count INTEGER DEFAULT 0,
  user_turns INTEGER DEFAULT 0,
  assistant_turns INTEGER DEFAULT 0,
  tool_calls_count INTEGER DEFAULT 0,
  total_tokens_estimate INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  reviewed BOOLEAN DEFAULT false,
  flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  tags TEXT[] DEFAULT '{}'::text[],
  notes TEXT,
  exported_at TIMESTAMPTZ,
  export_format TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voicemails (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  caller_phone TEXT NOT NULL,
  caller_name TEXT,
  duration_seconds INTEGER,
  recording_url TEXT,
  transcription TEXT,
  summary TEXT,
  sentiment TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'new',
  listened_at TIMESTAMPTZ,
  listened_by TEXT,
  notes TEXT,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS callback_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  original_call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  reason TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL
);

-- ============================================================================
-- BOOKINGS & AVAILABILITY
-- ============================================================================

CREATE TABLE IF NOT EXISTS resources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  capacity INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  default_duration_minutes INTEGER DEFAULT 60,
  accepts_bookings BOOLEAN DEFAULT true,
  buffer_before_minutes INTEGER DEFAULT 0,
  buffer_after_minutes INTEGER DEFAULT 0,
  color TEXT,
  avatar_url TEXT,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS availability_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
  schedule JSONB NOT NULL,
  blocked_dates DATE[] DEFAULT '{}'::date[],
  valid_from DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_type TEXT DEFAULT 'general' NOT NULL,
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
  total_capacity INTEGER DEFAULT 1 NOT NULL,
  booked_count INTEGER DEFAULT 0 NOT NULL,
  status TEXT DEFAULT 'available',
  price_override_cents INTEGER,
  is_generated BOOLEAN DEFAULT false,
  template_id UUID REFERENCES availability_templates(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  booking_type TEXT DEFAULT 'general' NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  duration_minutes INTEGER,
  notes TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  confirmation_code TEXT NOT NULL,
  amount_cents INTEGER,
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
  slot_id UUID REFERENCES availability_slots(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'call',
  rescheduled_from UUID,
  rescheduled_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pending_bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  requested_date DATE,
  requested_time TIME,
  service TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ
);

-- ============================================================================
-- NOTIFICATIONS & SMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  subject_template TEXT,
  body_template TEXT NOT NULL,
  body_html_template TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  available_variables TEXT[] DEFAULT '{}'::text[],
  preview_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT true,
  reminder_hours_before INTEGER[] DEFAULT '{24,1}'::integer[],
  email_template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  sms_template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, notification_type)
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  recipient TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  body_html TEXT,
  template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  template_variables JSONB DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  provider TEXT,
  provider_message_id TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  to_phone TEXT NOT NULL,
  from_phone TEXT NOT NULL,
  message_type TEXT NOT NULL,
  body TEXT NOT NULL,
  twilio_sid TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  error_message TEXT,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL
);

-- ============================================================================
-- TENANT CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_capabilities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN DEFAULT true,
  UNIQUE(tenant_id, capability)
);

CREATE TABLE IF NOT EXISTS tenant_integrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT,
  external_account_id TEXT,
  status TEXT DEFAULT 'active',
  UNIQUE(tenant_id, provider)
);

CREATE TABLE IF NOT EXISTS tenant_promotions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  offer_text TEXT NOT NULL,
  mention_behavior TEXT DEFAULT 'relevant',
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS escalation_contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  availability TEXT DEFAULT 'business_hours',
  availability_hours JSONB
);

-- ============================================================================
-- PHONE CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS port_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  current_carrier TEXT NOT NULL,
  account_number TEXT,
  pin TEXT,
  authorized_name TEXT NOT NULL,
  loa_signed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft',
  rejection_reason TEXT,
  estimated_completion DATE,
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS phone_configurations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  port_request_id UUID REFERENCES port_requests(id) ON DELETE SET NULL,
  phone_number TEXT,
  setup_type TEXT NOT NULL,
  provider TEXT DEFAULT 'signalwire',
  provider_sid TEXT,
  status TEXT DEFAULT 'pending',
  a2p_brand_id TEXT,
  a2p_campaign_id TEXT,
  verified_at TIMESTAMPTZ
);

-- ============================================================================
-- ANALYTICS & LOGGING
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS llm_function_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  call_sid TEXT,
  function_name TEXT NOT NULL,
  arguments JSONB DEFAULT '{}'::jsonb NOT NULL,
  result JSONB,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  execution_ms INTEGER,
  model_used TEXT,
  intent_score INTEGER,
  user_message TEXT,
  retry_count INTEGER DEFAULT 0
);

-- ============================================================================
-- TRAINING DATA (for conversation logs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_prompts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  expected_intent TEXT,
  difficulty TEXT DEFAULT 'medium',
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
