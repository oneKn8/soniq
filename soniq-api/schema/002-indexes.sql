-- Soniq Database Indexes
-- Performance indexes for common query patterns

-- ============================================================================
-- TENANT LOOKUPS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tenants_phone ON tenants(phone_number);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_active ON tenant_members(tenant_id, user_id) WHERE is_active = true;

-- ============================================================================
-- CONTACTS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(tenant_id, phone_normalized);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_status ON contacts(tenant_id, lead_status) WHERE lead_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_last_contact ON contacts(tenant_id, last_contact_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_engagement ON contacts(tenant_id, engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_contact_notes_contact ON contact_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_tenant ON contact_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contact_activity_contact ON contact_activity(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_activity_tenant ON contact_activity(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contact_activity_created ON contact_activity(created_at DESC);

-- ============================================================================
-- CALLS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_calls_tenant ON calls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calls_vapi ON calls(vapi_call_id);
CREATE INDEX IF NOT EXISTS idx_calls_contact ON calls(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calls_phone ON calls(tenant_id, caller_phone);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_calls_created ON calls(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_started ON calls(tenant_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_logs_tenant ON conversation_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_call ON conversation_logs(call_id) WHERE call_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_logs_session ON conversation_logs(session_id);

CREATE INDEX IF NOT EXISTS idx_voicemails_tenant ON voicemails(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voicemails_status ON voicemails(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_voicemails_created ON voicemails(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_callback_queue_tenant ON callback_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_callback_queue_status ON callback_queue(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_callback_queue_priority ON callback_queue(tenant_id, priority, created_at);

-- ============================================================================
-- BOOKINGS & AVAILABILITY
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_contact ON bookings(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(tenant_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_upcoming ON bookings(tenant_id, booking_date, booking_time)
  WHERE status IN ('pending', 'confirmed');
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation ON bookings(confirmation_code);
CREATE INDEX IF NOT EXISTS idx_bookings_resource ON bookings(resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id) WHERE slot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pending_bookings_tenant ON pending_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pending_bookings_status ON pending_bookings(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_resources_tenant ON resources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resources_active ON resources(tenant_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_availability_slots_tenant ON availability_slots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_availability_slots_date ON availability_slots(tenant_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_availability_slots_resource ON availability_slots(resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_availability_slots_available ON availability_slots(tenant_id, slot_date, status)
  WHERE status = 'available';

CREATE INDEX IF NOT EXISTS idx_availability_templates_tenant ON availability_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_availability_templates_active ON availability_templates(tenant_id) WHERE is_active = true;

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_at)
  WHERE status = 'pending' AND scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_contact ON notifications(contact_id) WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_templates_tenant ON notification_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_tenant ON notification_preferences(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sms_messages_tenant ON sms_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_booking ON sms_messages(booking_id) WHERE booking_id IS NOT NULL;

-- ============================================================================
-- TENANT CONFIG
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_capabilities_tenant ON tenant_capabilities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_integrations_tenant ON tenant_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_promotions_tenant ON tenant_promotions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_promotions_active ON tenant_promotions(tenant_id)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_escalation_contacts_tenant ON escalation_contacts(tenant_id);

-- ============================================================================
-- AUDIT & ANALYTICS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_function_calls_tenant ON llm_function_calls(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_llm_function_calls_call ON llm_function_calls(call_sid) WHERE call_sid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_llm_function_calls_function ON llm_function_calls(function_name);
