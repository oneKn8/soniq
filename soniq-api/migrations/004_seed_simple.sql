-- Soniq Voice AI - Comprehensive Test Data (Simple SQL)
-- Run this in Supabase SQL Editor
-- No PL/pgSQL blocks - just plain SQL statements

-- ============================================================================
-- STEP 1: CREATE TENANT
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
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Stellar Auto Service',
  'automotive',
  '+14693685602',
  'Luna',
  '{"tone": "friendly", "verbosity": "concise", "empathy": "high", "humor": false}',
  '{"provider": "cartesia", "voice_id": "a0e99841-438c-4a64-b679-ae501e7d6091", "voice_name": "Professional Female", "speaking_rate": 1.0, "pitch": 1.0}',
  'Hi! Thanks for calling Stellar Auto Service. This is Luna, your AI assistant. How can I help you today?',
  'Thanks for calling Stellar Auto Service. We are currently closed. Our hours are Monday through Saturday, 8 AM to 6 PM. Please leave a message or call back during business hours.',
  'Welcome back to Stellar Auto Service! Great to hear from you again. How can I help you today?',
  'America/Chicago',
  '{"schedule": [{"day": "monday", "open": "08:00", "close": "18:00"}, {"day": "tuesday", "open": "08:00", "close": "18:00"}, {"day": "wednesday", "open": "08:00", "close": "18:00"}, {"day": "thursday", "open": "08:00", "close": "18:00"}, {"day": "friday", "open": "08:00", "close": "18:00"}, {"day": "saturday", "open": "09:00", "close": "14:00"}], "holidays": ["2026-01-01", "2026-07-04", "2026-12-25"]}',
  true,
  '+14695551000',
  ARRAY['speak to human', 'manager', 'supervisor', 'complaint', 'lawyer', 'attorney'],
  '{"sms_confirmations": true, "email_notifications": true, "live_transfer": true, "voicemail_fallback": true, "sentiment_analysis": true, "recording_enabled": true, "transcription_enabled": true}',
  true,
  'professional'
) ON CONFLICT (phone_number) DO UPDATE SET
  business_name = EXCLUDED.business_name,
  agent_name = EXCLUDED.agent_name,
  is_active = true;

-- ============================================================================
-- STEP 2: CREATE CONTACTS (CRM)
-- ============================================================================
INSERT INTO contacts (tenant_id, first_name, last_name, name, phone, phone_normalized, email, status, tags, custom_fields, engagement_score, total_calls, total_bookings, source)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Michael', 'Thompson', 'Michael Thompson', '(469) 555-0101', '+14695550101', 'michael.thompson@email.com', 'vip', ARRAY['fleet-owner', 'commercial'], '{"preferred_time": "morning", "special_notes": "Owns 5 commercial vehicles"}', 95, 24, 18, 'call'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sarah', 'Martinez', 'Sarah Martinez', '(469) 555-0102', '+14695550102', 'sarah.m@email.com', 'active', ARRAY['loyal-customer'], '{"preferred_time": "afternoon"}', 78, 12, 8, 'call'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'James', 'Wilson', 'James Wilson', '(469) 555-0103', '+14695550103', 'jwilson@business.com', 'active', ARRAY['new-lead', 'referral'], '{"referred_by": "Michael Thompson"}', 25, 1, 0, 'call'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Emily', 'Chen', 'Emily Chen', '(469) 555-0104', '+14695550104', 'emily.chen@corp.com', 'active', ARRAY['business-account'], '{"company": "Chen Industries", "fleet_size": 3}', 65, 8, 6, 'call'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Robert', 'Johnson', 'Robert Johnson', '(469) 555-0105', '+14695550105', NULL, 'inactive', ARRAY['inactive'], '{}', 15, 3, 1, 'call'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Amanda', 'Davis', 'Amanda Davis', '(469) 555-0106', '+14695550106', 'amanda.d@email.com', 'active', ARRAY['no-show-history'], '{"no_show_count": 2}', 40, 5, 2, 'call'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'David', 'Brown', 'David Brown', '(469) 555-0107', '+14695550107', 'dbrown@email.com', 'active', ARRAY['prospect', 'website-lead'], '{"source": "website inquiry"}', 10, 0, 0, 'web')
ON CONFLICT (tenant_id, phone_normalized) DO NOTHING;

-- ============================================================================
-- STEP 3: CREATE RESOURCES (Staff & Equipment)
-- ============================================================================
INSERT INTO resources (tenant_id, name, type, description, is_active, metadata)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Mike Rodriguez', 'staff', 'Senior Technician - ASE Certified Master Tech', true, '{"specialties": ["engine", "transmission", "diagnostics"], "years_experience": 15, "certifications": ["ASE Master", "Toyota Certified"]}'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sarah Chen', 'staff', 'Service Advisor', true, '{"role": "service_advisor", "languages": ["English", "Mandarin"], "years_experience": 5}'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Tony Martinez', 'staff', 'Technician - Brakes & Suspension Specialist', true, '{"specialties": ["brakes", "suspension", "alignment"], "years_experience": 8, "certifications": ["ASE Brakes", "Hunter Alignment"]}'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Bay 1', 'service_bay', 'Full-service bay with lift', true, '{"equipment": ["2-post lift", "tire machine", "balancer"], "capacity": "standard"}'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Bay 2', 'service_bay', 'Quick service bay', true, '{"equipment": ["quick-lube pit", "fluid dispensers"], "capacity": "oil-change"}'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Diagnostic Station', 'equipment', 'Advanced diagnostics workstation', true, '{"equipment": ["OBD scanner", "oscilloscope", "smoke machine"], "specialization": "diagnostics"}')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 4: CREATE AVAILABILITY SLOTS (Next 7 days)
-- ============================================================================
INSERT INTO availability_slots (tenant_id, resource_id, slot_date, start_time, end_time, slot_type, is_available)
SELECT
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  r.id,
  d.slot_date,
  t.start_time,
  t.end_time,
  'appointment',
  true
FROM resources r
CROSS JOIN (
  SELECT CURRENT_DATE + i AS slot_date FROM generate_series(1, 7) i
) d
CROSS JOIN (
  VALUES
    ('09:00'::time, '10:00'::time),
    ('10:00'::time, '11:00'::time),
    ('11:00'::time, '12:00'::time),
    ('13:00'::time, '14:00'::time),
    ('14:00'::time, '15:00'::time),
    ('15:00'::time, '16:00'::time),
    ('16:00'::time, '17:00'::time)
) t(start_time, end_time)
WHERE r.tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND r.type = 'staff'
  AND r.is_active = true
  AND EXTRACT(DOW FROM d.slot_date) BETWEEN 1 AND 6
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 5: CREATE SAMPLE BOOKINGS
-- ============================================================================
INSERT INTO bookings (tenant_id, customer_name, customer_phone, customer_email, booking_type, booking_date, booking_time, duration_minutes, status, confirmation_code, notes, amount_cents)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Michael Thompson', '+14695550101', 'michael.thompson@email.com', 'oil_change', CURRENT_DATE + 1, '09:00', 30, 'confirmed', 'SA-2026-001', 'Fleet vehicle #1 - Ford F-150', 5999),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Michael Thompson', '+14695550101', 'michael.thompson@email.com', 'oil_change', CURRENT_DATE + 1, '09:30', 30, 'confirmed', 'SA-2026-002', 'Fleet vehicle #2 - Ford F-150', 5999),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sarah Martinez', '+14695550102', 'sarah.m@email.com', 'brake_service', CURRENT_DATE + 2, '10:00', 120, 'confirmed', 'SA-2026-003', 'Front brake pads replacement', 24999),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Emily Chen', '+14695550104', 'emily.chen@corp.com', 'inspection', CURRENT_DATE + 2, '14:00', 60, 'pending', 'SA-2026-004', 'State inspection - company vehicle', 2999),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Amanda Davis', '+14695550106', 'amanda.d@email.com', 'tire_rotation', CURRENT_DATE + 3, '11:00', 30, 'confirmed', 'SA-2026-005', 'Tire rotation and balance', 4999),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'James Wilson', '+14695550103', 'jwilson@business.com', 'diagnostic', CURRENT_DATE + 3, '15:00', 60, 'pending', 'SA-2026-006', 'Check engine light diagnosis', 9999)
ON CONFLICT (confirmation_code) DO NOTHING;

-- ============================================================================
-- STEP 6: CREATE SAMPLE CALLS
-- ============================================================================
INSERT INTO calls (tenant_id, vapi_call_id, caller_phone, caller_name, direction, status, started_at, ended_at, duration_seconds, outcome_type, outcome_success, transcript, summary, sentiment_score, intents_detected)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'call_001_' || gen_random_uuid(), '+14695550101', 'Michael Thompson', 'inbound', 'completed', NOW() - interval '2 hours', NOW() - interval '2 hours' + interval '3 minutes', 180, 'booking', true, 'Customer: Hi, I need to schedule oil changes for two of my fleet vehicles.\nLuna: Of course! I can help you with that. When would you like to bring them in?\nCustomer: Tomorrow morning if possible.\nLuna: I have 9 AM and 9:30 AM available. Would those work?\nCustomer: Perfect, book both.\nLuna: Done! Confirmation codes SA-2026-001 and SA-2026-002.', 'VIP customer Michael Thompson scheduled back-to-back oil changes for fleet vehicles.', 0.85, ARRAY['booking', 'fleet_service']),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'call_002_' || gen_random_uuid(), '+14695550102', 'Sarah Martinez', 'inbound', 'completed', NOW() - interval '1 day', NOW() - interval '1 day' + interval '4 minutes', 240, 'booking', true, 'Customer: My brakes are making a squeaking noise.\nLuna: I understand that can be concerning. When did you first notice the noise?\nCustomer: About a week ago, getting worse.\nLuna: Let me get you scheduled for a brake inspection. How about day after tomorrow at 10 AM?\nCustomer: That works.\nLuna: Your confirmation code is SA-2026-003.', 'Regular customer reported brake noise, scheduled for brake service.', 0.72, ARRAY['booking', 'brake_concern']),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'call_003_' || gen_random_uuid(), '+14695550103', 'James Wilson', 'inbound', 'completed', NOW() - interval '3 hours', NOW() - interval '3 hours' + interval '2 minutes', 120, 'inquiry', true, 'Customer: Hi, I was referred by Michael Thompson. My check engine light came on.\nLuna: Welcome! Michael is one of our best customers. When did the light come on?\nCustomer: This morning. The car seems to run fine though.\nLuna: That is good to hear. I can schedule a diagnostic for you. We have availability in a few days.\nCustomer: Sure, let me know when.', 'New customer referral from VIP. Check engine light concern, scheduled diagnostic.', 0.68, ARRAY['inquiry', 'referral', 'diagnostic']),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'call_004_' || gen_random_uuid(), '+14695550199', 'Unknown Caller', 'inbound', 'completed', NOW() - interval '5 hours', NOW() - interval '5 hours' + interval '1 minute', 45, 'escalation', false, 'Customer: I want to speak to a manager right now!\nLuna: I understand you would like to speak with someone. May I ask what this is regarding?\nCustomer: I had work done and my car is still not fixed!\nLuna: I am sorry to hear that. Let me transfer you to our service manager right away.', 'Angry customer demanding manager. Transferred to escalation.', 0.15, ARRAY['escalation', 'complaint'])
ON CONFLICT (vapi_call_id) DO NOTHING;

-- ============================================================================
-- STEP 7: CREATE NOTIFICATION TEMPLATES
-- ============================================================================
INSERT INTO notification_templates (tenant_id, name, type, channel, subject, body, variables, is_active)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Booking Confirmation', 'booking_confirmation', 'sms', NULL, 'Hi {{customer_name}}! Your appointment at Stellar Auto Service is confirmed for {{date}} at {{time}}. Confirmation: {{confirmation_code}}. Reply HELP for assistance.', ARRAY['customer_name', 'date', 'time', 'confirmation_code'], true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Appointment Reminder 24h', 'reminder', 'sms', NULL, 'Reminder: Your appointment at Stellar Auto Service is tomorrow, {{date}} at {{time}}. Confirmation: {{confirmation_code}}. Need to reschedule? Call us!', ARRAY['date', 'time', 'confirmation_code'], true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Missed Call Follow-up', 'missed_call', 'sms', NULL, 'Hi {{customer_name}}, we missed your call to Stellar Auto Service. How can we help? Reply to this message or call us back at {{business_phone}}.', ARRAY['customer_name', 'business_phone'], true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Service Complete', 'service_complete', 'sms', NULL, 'Your vehicle is ready for pickup at Stellar Auto Service! Total: ${{amount}}. Thank you for choosing us. We would love your feedback!', ARRAY['amount'], true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Review Request', 'review_request', 'email', 'How was your experience at Stellar Auto Service?', 'Hi {{customer_name}},\n\nThank you for visiting Stellar Auto Service! We hope your experience was excellent.\n\nWould you take a moment to share your feedback? Your review helps us serve you better.\n\n{{review_link}}\n\nThank you!\nThe Stellar Auto Service Team', ARRAY['customer_name', 'review_link'], true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 8: CREATE SAMPLE NOTIFICATIONS
-- ============================================================================
INSERT INTO notifications (tenant_id, contact_id, type, channel, status, scheduled_for, content)
SELECT
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  c.id,
  'reminder',
  'sms',
  'pending',
  (CURRENT_DATE + 1)::timestamp + interval '8 hours',
  'Reminder: Your appointment at Stellar Auto Service is tomorrow at 9:00 AM. Confirmation: SA-2026-001.'
FROM contacts c
WHERE c.phone_normalized = '+14695550101'
  AND c.tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 9: CREATE CALLBACK QUEUE ENTRIES
-- ============================================================================
INSERT INTO callback_queue (tenant_id, phone_number, reason, priority, status)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '+14695550107', 'Website inquiry - requested callback about tire services', 'medium', 'pending'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '+14695550199', 'Escalated call - customer complaint follow-up required', 'high', 'pending')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
SELECT 'Tenants' as table_name, COUNT(*) as count FROM tenants WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
UNION ALL
SELECT 'Contacts', COUNT(*) FROM contacts WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
UNION ALL
SELECT 'Resources', COUNT(*) FROM resources WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
UNION ALL
SELECT 'Bookings', COUNT(*) FROM bookings WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
UNION ALL
SELECT 'Calls', COUNT(*) FROM calls WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
UNION ALL
SELECT 'Availability Slots', COUNT(*) FROM availability_slots WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
UNION ALL
SELECT 'Notification Templates', COUNT(*) FROM notification_templates WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
ORDER BY table_name;
