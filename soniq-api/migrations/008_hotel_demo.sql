-- Soniq Voice AI - Hotel Demo Data
-- Run this in Supabase SQL Editor for hotel demo
-- Demo business: Grand Plaza Hotel

-- ============================================================================
-- STEP 0: CLEAN UP OLD HOTEL TENANT DATA
-- ============================================================================
-- Delete any existing tenant using the hotel demo UUID
DELETE FROM calls WHERE tenant_id = 'deadbeef-cafe-4000-a000-000000000002';
DELETE FROM bookings WHERE tenant_id = 'deadbeef-cafe-4000-a000-000000000002';
DELETE FROM contacts WHERE tenant_id = 'deadbeef-cafe-4000-a000-000000000002';
DELETE FROM resources WHERE tenant_id = 'deadbeef-cafe-4000-a000-000000000002';
DELETE FROM availability_slots WHERE tenant_id = 'deadbeef-cafe-4000-a000-000000000002';
DELETE FROM notifications WHERE tenant_id = 'deadbeef-cafe-4000-a000-000000000002';
DELETE FROM notification_templates WHERE tenant_id = 'deadbeef-cafe-4000-a000-000000000002';
DELETE FROM callback_queue WHERE tenant_id = 'deadbeef-cafe-4000-a000-000000000002';
DELETE FROM tenants WHERE id = 'deadbeef-cafe-4000-a000-000000000002';

-- ============================================================================
-- STEP 1: CREATE HOTEL TENANT
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
  'deadbeef-cafe-4000-a000-000000000002',
  'Grand Plaza Hotel',
  'hotel',
  '+14693685603',  -- Hotel demo phone number
  'Sophie',
  '{"tone": "professional", "verbosity": "balanced", "empathy": "high", "humor": false}',
  '{"provider": "cartesia", "voice_id": "a0e99841-438c-4a64-b679-ae501e7d6091", "voice_name": "Professional Female", "speaking_rate": 1.0, "pitch": 1.0}',
  'Thank you for calling Grand Plaza Hotel. This is Sophie. How may I assist you today?',
  'Thank you for calling Grand Plaza Hotel. Our front desk is available 24 hours. For reservations, you can book online at grandplazahotel.com or leave a message and we''ll call you back.',
  'Welcome back to Grand Plaza Hotel! How may I help you today?',
  'America/Chicago',
  '{"schedule": [{"day": "sunday", "open": "00:00", "close": "23:59"}, {"day": "monday", "open": "00:00", "close": "23:59"}, {"day": "tuesday", "open": "00:00", "close": "23:59"}, {"day": "wednesday", "open": "00:00", "close": "23:59"}, {"day": "thursday", "open": "00:00", "close": "23:59"}, {"day": "friday", "open": "00:00", "close": "23:59"}, {"day": "saturday", "open": "00:00", "close": "23:59"}], "holidays": []}',
  true,
  '+14695551234',
  ARRAY['manager', 'complaint', 'emergency', 'medical', 'security', 'sue', 'lawyer', 'police'],
  '{"sms_confirmations": true, "email_notifications": true, "live_transfer": true, "voicemail_fallback": true, "sentiment_analysis": true, "recording_enabled": true, "transcription_enabled": true, "reservation_enabled": true, "wake_up_calls": true, "concierge": true}',
  true,
  'professional'
) ON CONFLICT (id) DO UPDATE SET
  business_name = EXCLUDED.business_name,
  industry = EXCLUDED.industry,
  phone_number = EXCLUDED.phone_number,
  agent_name = EXCLUDED.agent_name,
  agent_personality = EXCLUDED.agent_personality,
  voice_config = EXCLUDED.voice_config,
  greeting_standard = EXCLUDED.greeting_standard,
  greeting_after_hours = EXCLUDED.greeting_after_hours,
  greeting_returning = EXCLUDED.greeting_returning,
  timezone = EXCLUDED.timezone,
  operating_hours = EXCLUDED.operating_hours,
  escalation_enabled = EXCLUDED.escalation_enabled,
  escalation_phone = EXCLUDED.escalation_phone,
  escalation_triggers = EXCLUDED.escalation_triggers,
  features = EXCLUDED.features,
  is_active = true,
  subscription_tier = EXCLUDED.subscription_tier;

-- ============================================================================
-- STEP 2: CREATE SAMPLE GUESTS (Hotel Customers)
-- ============================================================================
INSERT INTO contacts (tenant_id, first_name, last_name, name, phone, phone_normalized, email, status, tags, custom_fields, engagement_score, total_calls, total_bookings, source)
VALUES
  ('deadbeef-cafe-4000-a000-000000000002', 'Robert', 'Chen', 'Robert Chen', '(469) 555-2001', '+14695552001', 'robert.chen@business.com', 'vip', ARRAY['corporate', 'platinum-member'], '{"company": "Chen Enterprises", "preferred_room": "Executive Suite", "membership": "Platinum", "special_requests": "Late checkout, extra pillows"}', 98, 35, 28, 'call'),
  ('deadbeef-cafe-4000-a000-000000000002', 'Amanda', 'Torres', 'Amanda Torres', '(469) 555-2002', '+14695552002', 'a.torres@email.com', 'active', ARRAY['leisure', 'anniversary-package'], '{"room_preference": "King Suite", "anniversary_date": "2026-02-14"}', 75, 8, 6, 'web'),
  ('deadbeef-cafe-4000-a000-000000000002', 'James', 'Wilson', 'James Wilson', '(469) 555-2003', '+14695552003', 'jwilson@corp.com', 'active', ARRAY['business-travel'], '{"company": "Wilson & Associates", "frequent_guest": true, "preferred_floor": "high"}', 82, 20, 18, 'call'),
  ('deadbeef-cafe-4000-a000-000000000002', 'Maria', 'Santos', 'Maria Santos', '(469) 555-2004', '+14695552004', 'maria.santos@email.com', 'active', ARRAY['family', 'pool-access'], '{"family_size": 4, "kids_ages": [8, 12], "dietary": "gluten-free breakfast"}', 65, 5, 4, 'manual'),
  ('deadbeef-cafe-4000-a000-000000000002', 'David', 'Kim', 'David Kim', '(469) 555-2005', '+14695552005', 'dkim@startup.io', 'active', ARRAY['first-time'], '{}', 20, 1, 0, 'call')
ON CONFLICT (tenant_id, phone_normalized) DO NOTHING;

-- ============================================================================
-- STEP 3: CREATE RESOURCES (Rooms & Amenities)
-- ============================================================================
INSERT INTO resources (tenant_id, name, type, description, is_active, metadata)
VALUES
  ('deadbeef-cafe-4000-a000-000000000002', 'Standard King Room', 'room', 'King bed, city view, 350 sq ft', true, '{"rate": 179, "capacity": 2, "floor": "3-8", "amenities": ["wifi", "minibar", "tv", "coffee"]}'),
  ('deadbeef-cafe-4000-a000-000000000002', 'Standard Double Room', 'room', 'Two queen beds, 400 sq ft', true, '{"rate": 199, "capacity": 4, "floor": "3-8", "amenities": ["wifi", "minibar", "tv", "coffee"]}'),
  ('deadbeef-cafe-4000-a000-000000000002', 'Deluxe King Suite', 'room', 'King bed, separate living area, 550 sq ft', true, '{"rate": 279, "capacity": 2, "floor": "9-12", "amenities": ["wifi", "minibar", "tv", "coffee", "robes", "premium-view"]}'),
  ('deadbeef-cafe-4000-a000-000000000002', 'Executive Suite', 'room', 'King bed, office, lounge access, 750 sq ft', true, '{"rate": 399, "capacity": 2, "floor": "15-18", "amenities": ["wifi", "minibar", "tv", "coffee", "robes", "lounge-access", "late-checkout"]}'),
  ('deadbeef-cafe-4000-a000-000000000002', 'Presidential Suite', 'room', 'Two bedrooms, full kitchen, butler service, 1500 sq ft', true, '{"rate": 899, "capacity": 4, "floor": "20", "amenities": ["wifi", "minibar", "tv", "kitchen", "butler", "robes", "vip-lounge"]}'),
  ('deadbeef-cafe-4000-a000-000000000002', 'Pool', 'service', 'Rooftop pool, open 6am-10pm', true, '{"hours": "6:00-22:00", "capacity": 50}'),
  ('deadbeef-cafe-4000-a000-000000000002', 'Spa', 'service', 'Full service spa, appointment required', true, '{"hours": "9:00-21:00", "services": ["massage", "facial", "sauna"]}'),
  ('deadbeef-cafe-4000-a000-000000000002', 'Restaurant', 'service', 'The Grand Bistro - Fine dining', true, '{"hours": "6:30-22:00", "dress_code": "smart casual"}'),
  ('deadbeef-cafe-4000-a000-000000000002', 'Conference Room A', 'room', 'Boardroom style, 20 capacity', true, '{"rate_per_hour": 150, "capacity": 20, "av_equipment": true}'),
  ('deadbeef-cafe-4000-a000-000000000002', 'Conference Room B', 'room', 'Theater style, 50 capacity', true, '{"rate_per_hour": 300, "capacity": 50, "av_equipment": true}')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 4: CREATE SAMPLE RESERVATIONS
-- ============================================================================
INSERT INTO bookings (tenant_id, customer_name, customer_phone, customer_email, booking_type, booking_date, booking_time, duration_minutes, status, confirmation_code, notes, amount_cents)
VALUES
  ('deadbeef-cafe-4000-a000-000000000002', 'Robert Chen', '+14695552001', 'robert.chen@business.com', 'reservation', CURRENT_DATE + 3, '15:00', 2880, 'confirmed', 'GPH-10001', 'Executive Suite, 2 nights. Late checkout requested. Corporate rate applied.', 71820),
  ('deadbeef-cafe-4000-a000-000000000002', 'Amanda Torres', '+14695552002', 'a.torres@email.com', 'reservation', '2026-02-14', '14:00', 1440, 'confirmed', 'GPH-10002', 'Deluxe King Suite, 1 night. Anniversary package - champagne & roses. Dinner reservation at 7pm.', 34900),
  ('deadbeef-cafe-4000-a000-000000000002', 'James Wilson', '+14695552003', 'jwilson@corp.com', 'reservation', CURRENT_DATE + 7, '15:00', 4320, 'pending', 'GPH-10003', 'Standard King, 3 nights. Business travel. High floor requested.', 53700),
  ('deadbeef-cafe-4000-a000-000000000002', 'Maria Santos', '+14695552004', 'maria.santos@email.com', 'reservation', CURRENT_DATE + 14, '16:00', 2880, 'confirmed', 'GPH-10004', 'Standard Double, 2 nights. Family with 2 kids. Pool access, gluten-free breakfast options.', 39800),
  ('deadbeef-cafe-4000-a000-000000000002', 'David Kim', '+14695552005', 'dkim@startup.io', 'inquiry', CURRENT_DATE, '10:00', 60, 'pending', 'GPH-INQ-001', 'Inquiring about conference room availability for startup event, 30 people, next month.', 0)
ON CONFLICT (confirmation_code) DO NOTHING;

-- ============================================================================
-- STEP 5: CREATE SAMPLE CALLS (Hotel-related)
-- ============================================================================
INSERT INTO calls (tenant_id, vapi_call_id, caller_phone, caller_name, direction, status, started_at, ended_at, duration_seconds, outcome_type, outcome_success, transcript, summary, sentiment_score, intents_detected)
VALUES
  ('deadbeef-cafe-4000-a000-000000000002', 'hotel_call_001_' || gen_random_uuid(), '+14695552001', 'Robert Chen', 'inbound', 'completed', NOW() - interval '2 hours', NOW() - interval '2 hours' + interval '3 minutes', 180, 'booking', true,
   'Guest: Hi, I''d like to book a room for next week.\nSophie: Of course, Mr. Chen! I see you''re a Platinum member. Thank you for your loyalty. What dates are you looking at?\nGuest: Arriving Wednesday, staying two nights.\nSophie: I have your preferred Executive Suite available at our corporate rate. Would that work?\nGuest: Perfect. Can you arrange late checkout on Friday?\nSophie: Absolutely, I''ve noted late checkout for you. Your confirmation number is GPH-10001. Is there anything else I can help with?\nGuest: That''s all, thank you.\nSophie: Thank you for choosing Grand Plaza Hotel. We look forward to seeing you Wednesday.',
   'VIP guest Robert Chen booked Executive Suite for 2 nights with late checkout. Platinum member, corporate rate applied.', 0.95, ARRAY['booking', 'reservation', 'loyalty-member']),

  ('deadbeef-cafe-4000-a000-000000000002', 'hotel_call_002_' || gen_random_uuid(), '+14695552002', 'Amanda Torres', 'inbound', 'completed', NOW() - interval '1 day', NOW() - interval '1 day' + interval '4 minutes', 240, 'booking', true,
   'Guest: Hello, I''m planning a surprise anniversary trip for my husband. Do you have any special packages?\nSophie: How lovely! Congratulations! We have a wonderful anniversary package that includes a Deluxe Suite, champagne and roses in the room, and a dinner reservation at our restaurant. When is your anniversary?\nGuest: February 14th.\nSophie: Valentine''s Day - how romantic! I have a beautiful Deluxe King Suite available. The package is $349 and includes everything I mentioned. Shall I book it?\nGuest: Yes please!\nSophie: Perfect. I''ve booked you for February 14th. Your confirmation is GPH-10002. I''ll make sure the champagne and roses are ready when you check in at 2 PM.',
   'Anniversary package booked for Valentine''s Day. Deluxe Suite with champagne, roses, dinner reservation.', 0.98, ARRAY['booking', 'special-occasion', 'package']),

  ('deadbeef-cafe-4000-a000-000000000002', 'hotel_call_003_' || gen_random_uuid(), '+14695559999', 'Unknown', 'inbound', 'completed', NOW() - interval '30 minutes', NOW() - interval '30 minutes' + interval '90 seconds', 90, 'inquiry', true,
   'Caller: What time is checkout?\nSophie: Standard checkout is at 11 AM. If you need a late checkout, we can often accommodate that - just let the front desk know.\nCaller: And do you have a pool?\nSophie: Yes, we have a beautiful rooftop pool open from 6 AM to 10 PM. It''s complimentary for all guests.\nCaller: Great, thanks.',
   'General inquiry about checkout time and pool amenities.', 0.75, ARRAY['inquiry', 'amenities']),

  ('deadbeef-cafe-4000-a000-000000000002', 'hotel_call_004_' || gen_random_uuid(), '+14695552003', 'James Wilson', 'inbound', 'completed', NOW() - interval '4 hours', NOW() - interval '4 hours' + interval '2 minutes', 120, 'booking', true,
   'Guest: Hi, I need to book a room for a business trip next week. Three nights starting Monday.\nSophie: Of course, Mr. Wilson. I see you stay with us frequently. Would you like your usual Standard King on a high floor?\nGuest: Yes, that would be great.\nSophie: I have room 1507 available - 15th floor corner room with extra workspace. Your rate is $179 per night.\nGuest: Perfect.\nSophie: You''re all set. Confirmation number is GPH-10003. Check-in is at 3 PM. Anything else?\nGuest: No, that''s it. Thanks!',
   'Repeat business traveler booked 3-night stay. High floor preference noted.', 0.88, ARRAY['booking', 'business-travel', 'repeat-guest'])
ON CONFLICT (vapi_call_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Hotel Demo Data Loaded Successfully' as status;
SELECT 'Tenants' as table_name, COUNT(*) as count FROM tenants WHERE id = 'deadbeef-cafe-4000-a000-000000000002'
UNION ALL
SELECT 'Guests (Contacts)', COUNT(*) FROM contacts WHERE tenant_id = 'deadbeef-cafe-4000-a000-000000000002'
UNION ALL
SELECT 'Rooms & Amenities', COUNT(*) FROM resources WHERE tenant_id = 'deadbeef-cafe-4000-a000-000000000002'
UNION ALL
SELECT 'Reservations', COUNT(*) FROM bookings WHERE tenant_id = 'deadbeef-cafe-4000-a000-000000000002'
UNION ALL
SELECT 'Calls', COUNT(*) FROM calls WHERE tenant_id = 'deadbeef-cafe-4000-a000-000000000002'
ORDER BY table_name;
