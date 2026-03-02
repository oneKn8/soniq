-- Soniq CRM - Test Data Seed
-- Run this in Supabase SQL Editor to populate test data
-- Version: 1.0.0
-- Date: 2026-01-15

-- ============================================================================
-- TENANT
-- ============================================================================
INSERT INTO tenants (
  id,
  business_name,
  industry,
  phone_number,
  agent_name,
  agent_personality,
  voice_config,
  greeting_standard,
  greeting_after_hours,
  greeting_returning,
  timezone,
  operating_hours,
  escalation_enabled,
  escalation_phone,
  escalation_triggers,
  features,
  is_active,
  subscription_tier
) VALUES (
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'Stellar Auto Service',
  'automotive',
  '+14693685602',
  'Luna',
  '{
    "tone": "friendly",
    "verbosity": "balanced",
    "empathy": "high",
    "humor": false
  }',
  '{
    "provider": "cartesia",
    "voice_id": "a0e99841-438c-4a64-b679-ae501e7d6091",
    "voice_name": "Professional Female",
    "speaking_rate": 1.0,
    "pitch": 1.0
  }',
  'Hello and thank you for calling Stellar Auto Service! This is Luna, your AI assistant. How can I help you today?',
  'Thank you for calling Stellar Auto Service. We are currently closed. Our hours are Monday through Friday, 8 AM to 6 PM, and Saturday 9 AM to 3 PM. Please leave a message or call back during business hours.',
  'Welcome back to Stellar Auto Service! Great to hear from you again. How can I assist you today?',
  'America/Chicago',
  '{
    "schedule": [
      {"day": 0, "enabled": false, "slots": []},
      {"day": 1, "enabled": true, "slots": [{"start": "08:00", "end": "18:00"}]},
      {"day": 2, "enabled": true, "slots": [{"start": "08:00", "end": "18:00"}]},
      {"day": 3, "enabled": true, "slots": [{"start": "08:00", "end": "18:00"}]},
      {"day": 4, "enabled": true, "slots": [{"start": "08:00", "end": "18:00"}]},
      {"day": 5, "enabled": true, "slots": [{"start": "08:00", "end": "18:00"}]},
      {"day": 6, "enabled": true, "slots": [{"start": "09:00", "end": "15:00"}]}
    ],
    "holidays": ["2026-01-01", "2026-07-04", "2026-12-25"]
  }',
  true,
  '+14695551234',
  ARRAY['speak to human', 'manager', 'supervisor', 'representative', 'real person'],
  '{
    "sms_confirmations": true,
    "email_notifications": true,
    "live_transfer": true,
    "voicemail_fallback": true,
    "sentiment_analysis": true,
    "recording_enabled": true,
    "transcription_enabled": true
  }',
  true,
  'professional'
)
ON CONFLICT (phone_number) DO UPDATE SET
  business_name = EXCLUDED.business_name,
  agent_name = EXCLUDED.agent_name,
  greeting_standard = EXCLUDED.greeting_standard,
  updated_at = NOW();

-- Get the tenant ID for subsequent inserts
DO $$
DECLARE
  v_tenant_id UUID := 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
BEGIN

-- ============================================================================
-- RESOURCES (Staff and Service Bays)
-- ============================================================================
INSERT INTO resources (tenant_id, name, type, description, capacity, default_duration_minutes, buffer_after_minutes, color, sort_order) VALUES
  (v_tenant_id, 'Mike Rodriguez', 'staff', 'Senior Technician - 15 years experience, ASE certified', 1, 60, 15, '#3B82F6', 1),
  (v_tenant_id, 'Sarah Chen', 'staff', 'Service Advisor - Customer relations specialist', 1, 30, 10, '#10B981', 2),
  (v_tenant_id, 'James Wilson', 'staff', 'Technician - Brake and suspension specialist', 1, 60, 15, '#F59E0B', 3),
  (v_tenant_id, 'Service Bay 1', 'room', 'Main service bay - Full vehicle lifts', 2, 60, 15, '#6366F1', 4),
  (v_tenant_id, 'Service Bay 2', 'room', 'Secondary bay - Oil changes and inspections', 2, 30, 10, '#8B5CF6', 5),
  (v_tenant_id, 'Diagnostic Station', 'equipment', 'Computer diagnostic equipment', 1, 45, 0, '#EC4899', 6)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CONTACTS (Sample Customers)
-- ============================================================================
INSERT INTO contacts (
  tenant_id, phone, phone_normalized, email, name, first_name, last_name, company,
  source, first_contact_at, last_contact_at, total_calls, total_bookings,
  total_completed_bookings, lifetime_value_cents, engagement_score, status,
  preferred_contact_method, tags, notes
) VALUES
  -- VIP Customer
  (v_tenant_id, '(469) 555-0101', '+14695550101', 'john.smith@email.com', 'John Smith', 'John', 'Smith', NULL,
   'call', NOW() - INTERVAL '6 months', NOW() - INTERVAL '2 days', 8, 5, 4, 245000, 85, 'vip',
   'phone', ARRAY['loyal', 'fleet-owner', 'premium'], 'Owns 3 vehicles, always pays promptly. Prefers Mike for service.'),

  -- Regular Customer
  (v_tenant_id, '(469) 555-0102', '+14695550102', 'maria.garcia@gmail.com', 'Maria Garcia', 'Maria', 'Garcia', NULL,
   'call', NOW() - INTERVAL '3 months', NOW() - INTERVAL '1 week', 3, 2, 2, 85000, 65, 'active',
   'sms', ARRAY['returning'], '2022 Honda Accord. Prefers Saturday appointments.'),

  -- New Lead
  (v_tenant_id, '(469) 555-0103', '+14695550103', NULL, 'Robert Johnson', 'Robert', 'Johnson', NULL,
   'call', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 0, 0, 0, 20, 'active',
   'phone', ARRAY['new-lead'], 'Called about brake noise. Needs follow-up quote.'),

  -- Business Customer
  (v_tenant_id, '(469) 555-0104', '+14695550104', 'fleet@dallasdelivery.com', 'Dallas Delivery Co', 'Fleet', 'Manager', 'Dallas Delivery Co',
   'manual', NOW() - INTERVAL '1 year', NOW() - INTERVAL '3 days', 24, 18, 17, 892000, 95, 'vip',
   'email', ARRAY['business', 'fleet', 'priority'], 'Fleet of 12 delivery vans. Monthly maintenance contract. Contact: Tom at ext 205.'),

  -- Inactive Customer
  (v_tenant_id, '(469) 555-0105', '+14695550105', 'emily.wong@outlook.com', 'Emily Wong', 'Emily', 'Wong', NULL,
   'booking', NOW() - INTERVAL '8 months', NOW() - INTERVAL '6 months', 2, 1, 1, 32000, 25, 'inactive',
   'email', ARRAY['winback-candidate'], 'Hasnt visited in 6 months. Send re-engagement offer.'),

  -- Recent No-Show
  (v_tenant_id, '(469) 555-0106', '+14695550106', NULL, 'David Brown', 'David', 'Brown', NULL,
   'call', NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 week', 2, 2, 0, 0, 15, 'active',
   'phone', ARRAY['no-show'], 'Missed last 2 appointments. Confirm day-before.'),

  -- High Value Prospect
  (v_tenant_id, '(469) 555-0107', '+14695550107', 'alex.martinez@techcorp.com', 'Alex Martinez', 'Alex', 'Martinez', 'TechCorp Inc',
   'web', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', 1, 1, 0, 0, 40, 'active',
   'email', ARRAY['high-value', 'corporate'], 'Inquired about fleet maintenance for 8 company vehicles. Scheduled consultation.')
ON CONFLICT (tenant_id, phone_normalized) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  updated_at = NOW();

-- ============================================================================
-- AVAILABILITY TEMPLATE (Weekly Schedule)
-- ============================================================================
INSERT INTO availability_templates (tenant_id, name, description, schedule, is_active) VALUES
(v_tenant_id, 'Standard Week', 'Regular business hours schedule',
'{
  "weekly": [
    {"day": 0, "enabled": false, "slots": []},
    {"day": 1, "enabled": true, "slots": [
      {"start": "08:00", "end": "12:00", "capacity": 4},
      {"start": "13:00", "end": "18:00", "capacity": 4}
    ]},
    {"day": 2, "enabled": true, "slots": [
      {"start": "08:00", "end": "12:00", "capacity": 4},
      {"start": "13:00", "end": "18:00", "capacity": 4}
    ]},
    {"day": 3, "enabled": true, "slots": [
      {"start": "08:00", "end": "12:00", "capacity": 4},
      {"start": "13:00", "end": "18:00", "capacity": 4}
    ]},
    {"day": 4, "enabled": true, "slots": [
      {"start": "08:00", "end": "12:00", "capacity": 4},
      {"start": "13:00", "end": "18:00", "capacity": 4}
    ]},
    {"day": 5, "enabled": true, "slots": [
      {"start": "08:00", "end": "12:00", "capacity": 4},
      {"start": "13:00", "end": "18:00", "capacity": 4}
    ]},
    {"day": 6, "enabled": true, "slots": [
      {"start": "09:00", "end": "15:00", "capacity": 2}
    ]}
  ]
}', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- AVAILABILITY SLOTS (Next 7 Days)
-- ============================================================================
INSERT INTO availability_slots (tenant_id, slot_date, start_time, end_time, slot_type, total_capacity, booked_count, status) VALUES
  -- Today
  (v_tenant_id, CURRENT_DATE, '08:00', '09:00', 'general', 4, 2, 'available'),
  (v_tenant_id, CURRENT_DATE, '09:00', '10:00', 'general', 4, 3, 'available'),
  (v_tenant_id, CURRENT_DATE, '10:00', '11:00', 'general', 4, 4, 'full'),
  (v_tenant_id, CURRENT_DATE, '11:00', '12:00', 'general', 4, 1, 'available'),
  (v_tenant_id, CURRENT_DATE, '13:00', '14:00', 'general', 4, 0, 'available'),
  (v_tenant_id, CURRENT_DATE, '14:00', '15:00', 'general', 4, 2, 'available'),
  (v_tenant_id, CURRENT_DATE, '15:00', '16:00', 'general', 4, 1, 'available'),
  (v_tenant_id, CURRENT_DATE, '16:00', '17:00', 'general', 4, 0, 'available'),
  (v_tenant_id, CURRENT_DATE, '17:00', '18:00', 'general', 4, 0, 'available'),
  -- Tomorrow
  (v_tenant_id, CURRENT_DATE + 1, '08:00', '09:00', 'general', 4, 1, 'available'),
  (v_tenant_id, CURRENT_DATE + 1, '09:00', '10:00', 'general', 4, 0, 'available'),
  (v_tenant_id, CURRENT_DATE + 1, '10:00', '11:00', 'general', 4, 2, 'available'),
  (v_tenant_id, CURRENT_DATE + 1, '11:00', '12:00', 'general', 4, 0, 'available'),
  (v_tenant_id, CURRENT_DATE + 1, '13:00', '14:00', 'general', 4, 0, 'available'),
  (v_tenant_id, CURRENT_DATE + 1, '14:00', '15:00', 'general', 4, 1, 'available'),
  (v_tenant_id, CURRENT_DATE + 1, '15:00', '16:00', 'general', 4, 0, 'available'),
  (v_tenant_id, CURRENT_DATE + 1, '16:00', '17:00', 'general', 4, 0, 'available'),
  (v_tenant_id, CURRENT_DATE + 1, '17:00', '18:00', 'general', 4, 0, 'available'),
  -- Day after tomorrow
  (v_tenant_id, CURRENT_DATE + 2, '08:00', '09:00', 'general', 4, 0, 'available'),
  (v_tenant_id, CURRENT_DATE + 2, '09:00', '10:00', 'general', 4, 0, 'available'),
  (v_tenant_id, CURRENT_DATE + 2, '10:00', '11:00', 'general', 4, 0, 'available'),
  (v_tenant_id, CURRENT_DATE + 2, '11:00', '12:00', 'general', 4, 0, 'available'),
  (v_tenant_id, CURRENT_DATE + 2, '13:00', '14:00', 'general', 4, 0, 'available'),
  (v_tenant_id, CURRENT_DATE + 2, '14:00', '15:00', 'general', 4, 0, 'available'),
  (v_tenant_id, CURRENT_DATE + 2, '15:00', '16:00', 'general', 4, 0, 'available'),
  (v_tenant_id, CURRENT_DATE + 2, '16:00', '17:00', 'general', 4, 0, 'available'),
  (v_tenant_id, CURRENT_DATE + 2, '17:00', '18:00', 'general', 4, 0, 'available')
ON CONFLICT (tenant_id, resource_id, slot_date, start_time) DO NOTHING;

-- ============================================================================
-- BOOKINGS (Sample Appointments)
-- ============================================================================
INSERT INTO bookings (
  tenant_id, customer_name, customer_phone, customer_email,
  booking_type, booking_date, booking_time, duration_minutes,
  notes, status, confirmation_code, amount_cents, source
) VALUES
  -- Todays appointments
  (v_tenant_id, 'John Smith', '+14695550101', 'john.smith@email.com',
   'Oil Change', CURRENT_DATE, '09:00', 30,
   'Synthetic oil as usual. Check tire pressure.', 'confirmed', 'CONF8A2B', 7500, 'call'),

  (v_tenant_id, 'Maria Garcia', '+14695550102', 'maria.garcia@gmail.com',
   'Brake Inspection', CURRENT_DATE, '10:30', 60,
   'Customer reports squeaking noise when braking.', 'confirmed', 'CONF3C4D', 0, 'call'),

  (v_tenant_id, 'Dallas Delivery Co', '+14695550104', 'fleet@dallasdelivery.com',
   'Fleet Maintenance', CURRENT_DATE, '14:00', 120,
   'Scheduled maintenance for 2 delivery vans. Van #4 and Van #7.', 'confirmed', 'CONF5E6F', 35000, 'manual'),

  -- Tomorrows appointments
  (v_tenant_id, 'Alex Martinez', '+14695550107', 'alex.martinez@techcorp.com',
   'Fleet Consultation', CURRENT_DATE + 1, '10:00', 60,
   'Initial consultation for corporate fleet maintenance contract.', 'pending', 'CONF7G8H', 0, 'web'),

  (v_tenant_id, 'John Smith', '+14695550101', 'john.smith@email.com',
   'Tire Rotation', CURRENT_DATE + 1, '15:00', 45,
   'Rotate tires and check alignment.', 'confirmed', 'CONF9I0J', 4500, 'call'),

  -- Upcoming appointments
  (v_tenant_id, 'David Brown', '+14695550106', NULL,
   'Full Service', CURRENT_DATE + 3, '09:00', 90,
   'Oil change, brake check, fluid top-off. CONFIRM DAY BEFORE - previous no-shows.', 'pending', 'CONFK1L2', 15000, 'call')
ON CONFLICT (confirmation_code) DO NOTHING;

-- ============================================================================
-- CALLS (Recent Call History)
-- ============================================================================
INSERT INTO calls (
  tenant_id, vapi_call_id, caller_phone, caller_name, direction, status,
  started_at, ended_at, duration_seconds, ended_reason, outcome_type, outcome_success,
  transcript, summary, sentiment_score, intents_detected
) VALUES
  -- Successful booking call
  (v_tenant_id, 'call_' || gen_random_uuid()::text, '+14695550101', 'John Smith', 'inbound', 'completed',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '4 minutes', 240,
   'customer-ended', 'booking', true,
   'AI: Hello and thank you for calling Stellar Auto Service! This is Luna, your AI assistant. How can I help you today?
Customer: Hi, I need to schedule an oil change for my truck.
AI: Id be happy to help you schedule an oil change. May I have your name please?
Customer: Its John Smith.
AI: Welcome back, Mr. Smith! I see youre one of our valued customers. When would you like to come in?
Customer: Do you have anything available tomorrow morning?
AI: Let me check... Yes, we have 9 AM available tomorrow. Would that work for you?
Customer: Perfect, book that please.
AI: Great! Ive scheduled your oil change for tomorrow at 9 AM. Youll receive a confirmation text shortly. Is there anything else I can help you with?
Customer: Nope, thats all. Thanks!
AI: Thank you for calling Stellar Auto Service. Have a great day!',
   'Customer John Smith called to schedule an oil change. Appointment booked for the following day at 9 AM. Customer is a returning VIP customer.',
   0.85, ARRAY['booking', 'oil_change', 'returning_customer']),

  -- Inquiry call
  (v_tenant_id, 'call_' || gen_random_uuid()::text, '+14695550103', 'Robert Johnson', 'inbound', 'completed',
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '3 minutes', 180,
   'customer-ended', 'inquiry', true,
   'AI: Hello and thank you for calling Stellar Auto Service! This is Luna, your AI assistant. How can I help you today?
Customer: Yeah, my brakes are making a weird noise. How much would it cost to get them looked at?
AI: I understand, brake noises can be concerning. Wed be happy to inspect your brakes. Our brake inspection is complimentary, and if any work is needed, well provide you with a detailed quote before proceeding. May I have your name?
Customer: Robert Johnson.
AI: Thank you, Mr. Johnson. Would you like to schedule an inspection? We have availability this week.
Customer: Let me think about it and call back. What are your hours?
AI: Of course! Were open Monday through Friday 8 AM to 6 PM, and Saturday 9 AM to 3 PM. Feel free to call back anytime.
Customer: Alright, thanks.
AI: Thank you for calling Stellar Auto Service. We hope to hear from you soon!',
   'New customer Robert Johnson inquired about brake noise and inspection costs. Informed about free brake inspection. Customer said he would call back. Follow-up recommended.',
   0.55, ARRAY['inquiry', 'brake_service', 'pricing_question']),

  -- Escalation call
  (v_tenant_id, 'call_' || gen_random_uuid()::text, '+14695550199', 'Unknown Caller', 'inbound', 'completed',
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '2 minutes', 120,
   'assistant-transferred', 'escalation', true,
   'AI: Hello and thank you for calling Stellar Auto Service! This is Luna, your AI assistant. How can I help you today?
Customer: I need to speak to a manager right now. My car was supposed to be ready yesterday!
AI: I apologize for any inconvenience. Id be happy to connect you with our service manager right away. May I have your name so I can let them know whos calling?
Customer: Its Mike Peters. This is ridiculous.
AI: I understand your frustration, Mr. Peters, and I sincerely apologize. Let me transfer you to our service manager immediately.
[Call transferred]',
   'Upset customer Mike Peters called demanding to speak with manager about delayed vehicle. Customer was transferred to service manager. High priority follow-up needed.',
   -0.65, ARRAY['escalation', 'complaint', 'delayed_service']),

  -- After-hours call
  (v_tenant_id, 'call_' || gen_random_uuid()::text, '+14695550188', 'Unknown Caller', 'inbound', 'completed',
   NOW() - INTERVAL '1 day' - INTERVAL '8 hours', NOW() - INTERVAL '1 day' - INTERVAL '8 hours' + INTERVAL '1 minute', 60,
   'customer-ended', 'inquiry', false,
   'AI: Thank you for calling Stellar Auto Service. We are currently closed. Our hours are Monday through Friday, 8 AM to 6 PM, and Saturday 9 AM to 3 PM. Please leave a message or call back during business hours.
Customer: Oh okay, Ill call tomorrow. [hangs up]',
   'After-hours call. Caller hung up after hearing hours message. No callback information collected.',
   0.0, ARRAY['after_hours'])
ON CONFLICT (vapi_call_id) DO NOTHING;

-- ============================================================================
-- NOTIFICATION TEMPLATES
-- ============================================================================
PERFORM seed_notification_templates(v_tenant_id);

-- ============================================================================
-- SAMPLE NOTIFICATIONS
-- ============================================================================
INSERT INTO notifications (
  tenant_id, channel, notification_type, status, recipient, recipient_name,
  subject, body, scheduled_at, sent_at, delivered_at
) VALUES
  (v_tenant_id, 'sms', 'booking_confirmation', 'delivered', '+14695550101', 'John Smith',
   NULL, 'Hi John, your Oil Change is confirmed for tomorrow at 9:00 AM. Confirmation: CONF8A2B. Reply CANCEL to cancel.',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

  (v_tenant_id, 'sms', 'booking_reminder_24h', 'delivered', '+14695550102', 'Maria Garcia',
   NULL, 'Reminder: Your Brake Inspection is tomorrow at 10:30 AM. Confirmation: CONF3C4D. Reply CANCEL to cancel.',
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

  (v_tenant_id, 'email', 'booking_confirmation', 'delivered', 'alex.martinez@techcorp.com', 'Alex Martinez',
   'Booking Confirmed - CONF7G8H', 'Hi Alex, Your Fleet Consultation has been confirmed for ' || (CURRENT_DATE + 1)::text || ' at 10:00 AM.',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

  (v_tenant_id, 'sms', 'booking_reminder_24h', 'pending', '+14695550107', 'Alex Martinez',
   NULL, 'Reminder: Your Fleet Consultation is tomorrow at 10:00 AM. See you soon!',
   NOW() + INTERVAL '1 hour', NULL, NULL)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CONTACT NOTES
-- ============================================================================
INSERT INTO contact_notes (tenant_id, contact_id, note_type, content, created_by_name, is_pinned)
SELECT
  v_tenant_id,
  c.id,
  'preference',
  'Customer prefers appointments with Mike Rodriguez. Always uses synthetic oil.',
  'Sarah Chen',
  true
FROM contacts c WHERE c.phone_normalized = '+14695550101' AND c.tenant_id = v_tenant_id
ON CONFLICT DO NOTHING;

INSERT INTO contact_notes (tenant_id, contact_id, note_type, content, created_by_name, is_pinned)
SELECT
  v_tenant_id,
  c.id,
  'follow_up',
  'Customer inquired about brake noise. Send follow-up quote within 24 hours.',
  'Luna AI',
  false
FROM contacts c WHERE c.phone_normalized = '+14695550103' AND c.tenant_id = v_tenant_id
ON CONFLICT DO NOTHING;

INSERT INTO contact_notes (tenant_id, contact_id, note_type, content, created_by_name, is_pinned)
SELECT
  v_tenant_id,
  c.id,
  'internal',
  'IMPORTANT: Customer has missed 2 appointments. Always confirm day-before by phone.',
  'Service Manager',
  true
FROM contacts c WHERE c.phone_normalized = '+14695550106' AND c.tenant_id = v_tenant_id
ON CONFLICT DO NOTHING;

END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
SELECT 'Tenant created:' as status, business_name, phone_number, agent_name FROM tenants WHERE phone_number = '+14693685602';
SELECT 'Resources:' as status, COUNT(*) as count FROM resources;
SELECT 'Contacts:' as status, COUNT(*) as count FROM contacts;
SELECT 'Bookings:' as status, COUNT(*) as count FROM bookings;
SELECT 'Availability slots:' as status, COUNT(*) as count FROM availability_slots;
SELECT 'Calls:' as status, COUNT(*) as count FROM calls;
SELECT 'Notifications:' as status, COUNT(*) as count FROM notifications;
