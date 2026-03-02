-- Soniq CRM - Production Schema
-- Run this in Supabase SQL Editor after 001_initial.sql
-- Version: 2.0.0
-- Date: 2026-01-11

-- ============================================================================
-- CONTACTS TABLE
-- Core CRM entity - every customer/caller
-- ============================================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identity
  phone TEXT NOT NULL,
  phone_normalized TEXT NOT NULL,
  email TEXT,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  company TEXT,

  -- Source tracking
  source TEXT NOT NULL DEFAULT 'call' CHECK (source IN ('call', 'booking', 'import', 'manual', 'sms', 'web')),
  source_details JSONB DEFAULT '{}',

  -- Timestamps
  first_contact_at TIMESTAMPTZ DEFAULT NOW(),
  last_contact_at TIMESTAMPTZ,
  last_booking_at TIMESTAMPTZ,
  last_call_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Engagement metrics
  total_calls INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  total_completed_bookings INTEGER DEFAULT 0,
  total_cancelled_bookings INTEGER DEFAULT 0,
  total_no_shows INTEGER DEFAULT 0,
  total_sms_sent INTEGER DEFAULT 0,
  total_emails_sent INTEGER DEFAULT 0,
  lifetime_value_cents INTEGER DEFAULT 0,
  average_booking_value_cents INTEGER DEFAULT 0,

  -- Scoring
  engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  sentiment_average DECIMAL(3,2) CHECK (sentiment_average >= -1 AND sentiment_average <= 1),

  -- Status & Classification
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked', 'vip', 'churned')),
  lead_status TEXT CHECK (lead_status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),

  -- Preferences
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('phone', 'sms', 'email')),
  preferred_contact_time TEXT,
  preferred_language TEXT DEFAULT 'en',
  timezone TEXT,

  -- Communication preferences (compliance)
  do_not_call BOOLEAN DEFAULT FALSE,
  do_not_sms BOOLEAN DEFAULT FALSE,
  do_not_email BOOLEAN DEFAULT FALSE,
  marketing_opt_in BOOLEAN DEFAULT FALSE,
  marketing_opt_in_at TIMESTAMPTZ,

  -- Custom data
  custom_fields JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,

  -- Avatar/profile
  avatar_url TEXT,

  -- Ensure unique per tenant + normalized phone
  UNIQUE(tenant_id, phone_normalized)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(tenant_id, phone_normalized);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_contacts_last_contact ON contacts(tenant_id, last_contact_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_contacts_search ON contacts USING GIN(
  to_tsvector('english', coalesce(name,'') || ' ' || coalesce(email,'') || ' ' || coalesce(phone,''))
);
-- RLS performance index (100x+ improvement)
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_rls ON contacts(tenant_id) WHERE tenant_id IS NOT NULL;

-- ============================================================================
-- CONTACT NOTES TABLE
-- Notes attached to contacts
-- ============================================================================
CREATE TABLE IF NOT EXISTS contact_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Content
  note_type TEXT NOT NULL DEFAULT 'general' CHECK (note_type IN (
    'general', 'call_summary', 'booking_note', 'preference',
    'complaint', 'compliment', 'follow_up', 'internal', 'system'
  )),
  content TEXT NOT NULL,

  -- Rich content support
  attachments JSONB DEFAULT '[]',

  -- Attribution
  created_by TEXT,
  created_by_name TEXT,

  -- Relations
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- Flags
  is_pinned BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_notes_contact ON contact_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_created ON contact_notes(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_notes_pinned ON contact_notes(contact_id) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_contact_notes_tenant ON contact_notes(tenant_id);

-- ============================================================================
-- CONTACT ACTIVITY TABLE
-- Activity timeline / audit trail for contacts
-- ============================================================================
CREATE TABLE IF NOT EXISTS contact_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Activity details
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'call_received', 'call_made', 'booking_created', 'booking_modified',
    'booking_cancelled', 'booking_completed', 'booking_no_show',
    'sms_sent', 'sms_received', 'email_sent', 'email_opened', 'email_clicked',
    'note_added', 'tag_added', 'tag_removed', 'status_changed',
    'merged', 'imported', 'exported'
  )),

  -- Details
  description TEXT,
  metadata JSONB DEFAULT '{}',

  -- Relations
  related_id UUID,
  related_type TEXT,

  -- Attribution
  performed_by TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_activity_contact ON contact_activity(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_activity_type ON contact_activity(contact_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_contact_activity_tenant ON contact_activity(tenant_id);

-- ============================================================================
-- RESOURCES TABLE
-- Staff, rooms, equipment that can be booked
-- ============================================================================
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('staff', 'room', 'equipment', 'service', 'other')),
  description TEXT,

  -- Capacity
  capacity INTEGER DEFAULT 1 CHECK (capacity > 0),

  -- Availability
  is_active BOOLEAN DEFAULT TRUE,
  default_duration_minutes INTEGER DEFAULT 60 CHECK (default_duration_minutes > 0),

  -- Scheduling
  accepts_bookings BOOLEAN DEFAULT TRUE,
  buffer_before_minutes INTEGER DEFAULT 0 CHECK (buffer_before_minutes >= 0),
  buffer_after_minutes INTEGER DEFAULT 0 CHECK (buffer_after_minutes >= 0),

  -- Display
  color TEXT,
  avatar_url TEXT,
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resources_tenant ON resources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_resources_active ON resources(tenant_id) WHERE is_active = TRUE;

-- ============================================================================
-- AVAILABILITY TEMPLATES TABLE
-- Reusable availability schedules
-- ============================================================================
CREATE TABLE IF NOT EXISTS availability_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Which resource this applies to (null = all)
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,

  -- Weekly schedule: [{day: 0-6, enabled: bool, slots: [{start: "09:00", end: "17:00", capacity: 1}]}]
  schedule JSONB NOT NULL,

  -- Exceptions
  blocked_dates DATE[] DEFAULT '{}',

  -- Validity
  valid_from DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_availability_templates_tenant ON availability_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_availability_templates_resource ON availability_templates(resource_id);

-- ============================================================================
-- AVAILABILITY SLOTS TABLE
-- Generated time slots for booking
-- ============================================================================
CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- When
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- What
  slot_type TEXT NOT NULL DEFAULT 'general',
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,

  -- Capacity
  total_capacity INTEGER NOT NULL DEFAULT 1 CHECK (total_capacity > 0),
  booked_count INTEGER NOT NULL DEFAULT 0 CHECK (booked_count >= 0),

  -- Status
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'full', 'blocked', 'holiday', 'break')),

  -- Pricing override
  price_override_cents INTEGER CHECK (price_override_cents >= 0),

  -- Auto-generated vs manual
  is_generated BOOLEAN DEFAULT FALSE,
  template_id UUID REFERENCES availability_templates(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(tenant_id, resource_id, slot_date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_slots_lookup ON availability_slots(tenant_id, slot_date, status);
CREATE INDEX IF NOT EXISTS idx_slots_resource ON availability_slots(tenant_id, resource_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_slots_available ON availability_slots(tenant_id, slot_date)
  WHERE status = 'available' AND booked_count < total_capacity;

-- ============================================================================
-- NOTIFICATION TEMPLATES TABLE
-- Must be created before notifications (FK reference)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),

  -- Content
  subject_template TEXT,
  body_template TEXT NOT NULL,
  body_html_template TEXT,

  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,

  -- Variables available
  available_variables TEXT[] DEFAULT '{}',

  -- Preview
  preview_data JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_templates_tenant ON notification_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON notification_templates(tenant_id, notification_type, channel);
CREATE INDEX IF NOT EXISTS idx_templates_default ON notification_templates(tenant_id, notification_type, channel)
  WHERE is_default = TRUE;

-- ============================================================================
-- NOTIFICATIONS TABLE
-- All notification records
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Channel
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),

  -- Type
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'booking_confirmation', 'booking_reminder_24h', 'booking_reminder_1h',
    'booking_modified', 'booking_cancelled', 'booking_rescheduled',
    'missed_call_followup', 'thank_you', 'review_request',
    'marketing', 'custom'
  )),

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'queued', 'sending', 'sent', 'delivered',
    'opened', 'clicked', 'bounced', 'failed', 'cancelled'
  )),

  -- Recipient
  recipient TEXT NOT NULL,
  recipient_name TEXT,

  -- Content
  subject TEXT,
  body TEXT NOT NULL,
  body_html TEXT,

  -- Template reference
  template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  template_variables JSONB DEFAULT '{}',

  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  -- Related records
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,

  -- Provider tracking
  provider TEXT,
  provider_message_id TEXT,

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
  max_retries INTEGER DEFAULT 3 CHECK (max_retries >= 0),
  next_retry_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_contact ON notifications(contact_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_retry ON notifications(next_retry_at)
  WHERE status = 'failed' AND retry_count < max_retries;
CREATE INDEX IF NOT EXISTS idx_notifications_booking ON notifications(booking_id);

-- ============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- Per-tenant notification settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Which notification type
  notification_type TEXT NOT NULL,

  -- Channel settings
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT TRUE,

  -- Timing (for reminders)
  reminder_hours_before INTEGER[] DEFAULT '{24, 1}',

  -- Template overrides
  email_template_id UUID REFERENCES notification_templates(id),
  sms_template_id UUID REFERENCES notification_templates(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_tenant ON notification_preferences(tenant_id);

-- ============================================================================
-- AUDIT LOGS TABLE
-- Comprehensive audit trail for compliance
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  user_id TEXT,
  action TEXT NOT NULL CHECK (action IN (
    'create', 'update', 'delete', 'export', 'import',
    'login', 'logout', 'view', 'search'
  )),
  resource_type TEXT NOT NULL,
  resource_id UUID,

  old_values JSONB,
  new_values JSONB,

  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action, created_at DESC);

-- ============================================================================
-- MODIFY EXISTING TABLES
-- Add CRM relationships
-- ============================================================================

-- Add contact_id to calls
ALTER TABLE calls ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_calls_contact ON calls(contact_id);

-- Add CRM columns to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS resource_id UUID REFERENCES resources(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS slot_id UUID REFERENCES availability_slots(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'call' CHECK (source IN ('call', 'web', 'manual', 'api'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rescheduled_from UUID REFERENCES bookings(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rescheduled_count INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_bookings_contact ON bookings(contact_id);
CREATE INDEX IF NOT EXISTS idx_bookings_resource ON bookings(resource_id);

-- Add contact_id to sms_messages
ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sms_contact ON sms_messages(contact_id);

-- Add contact_id to callback_queue
ALTER TABLE callback_queue ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_callbacks_contact ON callback_queue(contact_id);

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_contacts_updated_at ON contacts;
CREATE TRIGGER trigger_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_contact_notes_updated_at ON contact_notes;
CREATE TRIGGER trigger_contact_notes_updated_at
  BEFORE UPDATE ON contact_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_resources_updated_at ON resources;
CREATE TRIGGER trigger_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_availability_templates_updated_at ON availability_templates;
CREATE TRIGGER trigger_availability_templates_updated_at
  BEFORE UPDATE ON availability_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_availability_slots_updated_at ON availability_slots;
CREATE TRIGGER trigger_availability_slots_updated_at
  BEFORE UPDATE ON availability_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER trigger_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_notifications_updated_at ON notifications;
CREATE TRIGGER trigger_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trigger_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable for all CRM tables
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on existing tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE callback_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- Service role can access all data (for backend operations)
-- ============================================================================

-- Tenants
CREATE POLICY service_role_tenants ON tenants FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Contacts
CREATE POLICY service_role_contacts ON contacts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Contact Notes
CREATE POLICY service_role_contact_notes ON contact_notes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Contact Activity
CREATE POLICY service_role_contact_activity ON contact_activity FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Resources
CREATE POLICY service_role_resources ON resources FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Availability Templates
CREATE POLICY service_role_availability_templates ON availability_templates FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Availability Slots
CREATE POLICY service_role_availability_slots ON availability_slots FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Notifications
CREATE POLICY service_role_notifications ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Notification Templates
CREATE POLICY service_role_notification_templates ON notification_templates FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Notification Preferences
CREATE POLICY service_role_notification_preferences ON notification_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Audit Logs
CREATE POLICY service_role_audit_logs ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Calls
CREATE POLICY service_role_calls ON calls FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Bookings
CREATE POLICY service_role_bookings ON bookings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Callback Queue
CREATE POLICY service_role_callback_queue ON callback_queue FOR ALL TO service_role USING (true) WITH CHECK (true);

-- SMS Messages
CREATE POLICY service_role_sms_messages ON sms_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- VIEWS
-- With security_invoker for RLS compliance (PostgreSQL 15+)
-- ============================================================================

-- Contact summary view for quick lookups
CREATE OR REPLACE VIEW contact_summary
WITH (security_invoker = true) AS
SELECT
  id,
  tenant_id,
  phone,
  phone_normalized,
  email,
  name,
  first_name,
  last_name,
  status,
  lead_status,
  total_calls,
  total_bookings,
  engagement_score,
  last_contact_at,
  created_at
FROM contacts;

-- Upcoming bookings view
CREATE OR REPLACE VIEW upcoming_bookings
WITH (security_invoker = true) AS
SELECT
  b.id,
  b.tenant_id,
  b.customer_name,
  b.customer_phone,
  b.booking_date,
  b.booking_time,
  b.status,
  b.confirmation_code,
  c.name AS contact_name,
  c.email AS contact_email,
  r.name AS resource_name
FROM bookings b
LEFT JOIN contacts c ON b.contact_id = c.id
LEFT JOIN resources r ON b.resource_id = r.id
WHERE b.booking_date >= CURRENT_DATE
  AND b.status IN ('pending', 'confirmed')
ORDER BY b.booking_date, b.booking_time;

-- ============================================================================
-- FUNCTIONS
-- Utility functions for CRM operations
-- ============================================================================

-- Normalize phone number (basic E.164 normalization)
-- Full validation should happen in application code with libphonenumber-js
CREATE OR REPLACE FUNCTION normalize_phone(phone_input TEXT)
RETURNS TEXT AS $$
DECLARE
  cleaned TEXT;
BEGIN
  -- Remove all non-digit characters except leading +
  cleaned := regexp_replace(phone_input, '[^0-9+]', '', 'g');

  -- Ensure it starts with +
  IF NOT cleaned LIKE '+%' THEN
    -- Assume US if 10 digits
    IF length(regexp_replace(cleaned, '[^0-9]', '', 'g')) = 10 THEN
      cleaned := '+1' || regexp_replace(cleaned, '[^0-9]', '', 'g');
    -- Assume US if 11 digits starting with 1
    ELSIF length(regexp_replace(cleaned, '[^0-9]', '', 'g')) = 11 AND cleaned LIKE '1%' THEN
      cleaned := '+' || regexp_replace(cleaned, '[^0-9]', '', 'g');
    END IF;
  END IF;

  RETURN cleaned;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update contact metrics
CREATE OR REPLACE FUNCTION update_contact_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'calls' THEN
    UPDATE contacts
    SET
      total_calls = total_calls + 1,
      last_call_at = NEW.started_at,
      last_contact_at = NEW.started_at,
      updated_at = NOW()
    WHERE id = NEW.contact_id;
  ELSIF TG_TABLE_NAME = 'bookings' THEN
    UPDATE contacts
    SET
      total_bookings = total_bookings + 1,
      last_booking_at = NEW.created_at,
      last_contact_at = NEW.created_at,
      updated_at = NOW()
    WHERE id = NEW.contact_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update contact metrics on new call
CREATE TRIGGER trigger_calls_update_contact_metrics
  AFTER INSERT ON calls
  FOR EACH ROW
  WHEN (NEW.contact_id IS NOT NULL)
  EXECUTE FUNCTION update_contact_metrics();

-- Trigger to update contact metrics on new booking
CREATE TRIGGER trigger_bookings_update_contact_metrics
  AFTER INSERT ON bookings
  FOR EACH ROW
  WHEN (NEW.contact_id IS NOT NULL)
  EXECUTE FUNCTION update_contact_metrics();

-- Generate confirmation code
CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS TEXT AS $$
BEGIN
  RETURN upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DEFAULT NOTIFICATION TEMPLATES
-- Run after migration to populate default templates
-- ============================================================================

-- Function to seed default templates for a tenant
CREATE OR REPLACE FUNCTION seed_notification_templates(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  -- Booking confirmation - SMS
  INSERT INTO notification_templates (tenant_id, name, notification_type, channel, body_template, is_default, available_variables)
  VALUES (
    p_tenant_id,
    'Booking Confirmation SMS',
    'booking_confirmation',
    'sms',
    'Hi {{customer_name}}, your {{booking_type}} is confirmed for {{booking_date}} at {{booking_time}}. Confirmation: {{confirmation_code}}. Reply CANCEL to cancel.',
    true,
    ARRAY['customer_name', 'booking_type', 'booking_date', 'booking_time', 'confirmation_code', 'business_name']
  )
  ON CONFLICT (tenant_id, name) DO NOTHING;

  -- Booking confirmation - Email
  INSERT INTO notification_templates (tenant_id, name, notification_type, channel, subject_template, body_template, body_html_template, is_default, available_variables)
  VALUES (
    p_tenant_id,
    'Booking Confirmation Email',
    'booking_confirmation',
    'email',
    'Booking Confirmed - {{confirmation_code}}',
    'Hi {{customer_name}},

Your {{booking_type}} has been confirmed.

Date: {{booking_date}}
Time: {{booking_time}}
Confirmation Code: {{confirmation_code}}

If you need to make changes, please call us or reply to this email.

Best regards,
{{business_name}}',
    '<h1>Booking Confirmed</h1>
<p>Hi {{customer_name}},</p>
<p>Your {{booking_type}} has been confirmed.</p>
<table>
  <tr><td><strong>Date:</strong></td><td>{{booking_date}}</td></tr>
  <tr><td><strong>Time:</strong></td><td>{{booking_time}}</td></tr>
  <tr><td><strong>Confirmation:</strong></td><td>{{confirmation_code}}</td></tr>
</table>
<p>If you need to make changes, please call us or reply to this email.</p>
<p>Best regards,<br>{{business_name}}</p>',
    true,
    ARRAY['customer_name', 'booking_type', 'booking_date', 'booking_time', 'confirmation_code', 'business_name']
  )
  ON CONFLICT (tenant_id, name) DO NOTHING;

  -- 24h Reminder - SMS
  INSERT INTO notification_templates (tenant_id, name, notification_type, channel, body_template, is_default, available_variables)
  VALUES (
    p_tenant_id,
    'Booking Reminder 24h SMS',
    'booking_reminder_24h',
    'sms',
    'Reminder: Your {{booking_type}} is tomorrow at {{booking_time}}. Confirmation: {{confirmation_code}}. Reply CANCEL to cancel.',
    true,
    ARRAY['customer_name', 'booking_type', 'booking_date', 'booking_time', 'confirmation_code', 'business_name']
  )
  ON CONFLICT (tenant_id, name) DO NOTHING;

  -- 1h Reminder - SMS
  INSERT INTO notification_templates (tenant_id, name, notification_type, channel, body_template, is_default, available_variables)
  VALUES (
    p_tenant_id,
    'Booking Reminder 1h SMS',
    'booking_reminder_1h',
    'sms',
    'Reminder: Your {{booking_type}} is in 1 hour at {{booking_time}}. See you soon!',
    true,
    ARRAY['customer_name', 'booking_type', 'booking_time', 'confirmation_code', 'business_name']
  )
  ON CONFLICT (tenant_id, name) DO NOTHING;

  -- Cancellation - SMS
  INSERT INTO notification_templates (tenant_id, name, notification_type, channel, body_template, is_default, available_variables)
  VALUES (
    p_tenant_id,
    'Booking Cancellation SMS',
    'booking_cancelled',
    'sms',
    'Your {{booking_type}} for {{booking_date}} at {{booking_time}} has been cancelled. Call us to reschedule.',
    true,
    ARRAY['customer_name', 'booking_type', 'booking_date', 'booking_time', 'confirmation_code', 'business_name']
  )
  ON CONFLICT (tenant_id, name) DO NOTHING;

  -- Missed call follow-up - SMS
  INSERT INTO notification_templates (tenant_id, name, notification_type, channel, body_template, is_default, available_variables)
  VALUES (
    p_tenant_id,
    'Missed Call Follow-up SMS',
    'missed_call_followup',
    'sms',
    'Hi! We missed your call. How can we help? Call us back or reply to this message. - {{business_name}}',
    true,
    ARRAY['customer_name', 'business_name']
  )
  ON CONFLICT (tenant_id, name) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage to authenticated users (when auth is implemented)
-- For now, all access goes through service_role

COMMENT ON TABLE contacts IS 'CRM contacts - customers and callers';
COMMENT ON TABLE contact_notes IS 'Notes attached to contacts';
COMMENT ON TABLE contact_activity IS 'Activity timeline for contacts';
COMMENT ON TABLE resources IS 'Bookable resources - staff, rooms, equipment';
COMMENT ON TABLE availability_templates IS 'Reusable availability schedules';
COMMENT ON TABLE availability_slots IS 'Generated time slots for booking';
COMMENT ON TABLE notifications IS 'All notification records';
COMMENT ON TABLE notification_templates IS 'Reusable notification templates';
COMMENT ON TABLE notification_preferences IS 'Per-tenant notification settings';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail';
