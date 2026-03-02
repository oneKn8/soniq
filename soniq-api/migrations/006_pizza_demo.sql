-- Soniq Voice AI - Pizza Restaurant Demo Data
-- Run this in Supabase SQL Editor for pizza demo
-- Demo business: Tony's Pizza

-- ============================================================================
-- STEP 0: CLEAN UP OLD TENANT DATA ON THIS PHONE NUMBER
-- ============================================================================
-- Delete any existing tenant using this phone number to avoid conflicts
DELETE FROM calls WHERE tenant_id IN (SELECT id FROM tenants WHERE phone_number = '+14693685602');
DELETE FROM bookings WHERE tenant_id IN (SELECT id FROM tenants WHERE phone_number = '+14693685602');
DELETE FROM contacts WHERE tenant_id IN (SELECT id FROM tenants WHERE phone_number = '+14693685602');
DELETE FROM resources WHERE tenant_id IN (SELECT id FROM tenants WHERE phone_number = '+14693685602');
DELETE FROM availability_slots WHERE tenant_id IN (SELECT id FROM tenants WHERE phone_number = '+14693685602');
DELETE FROM notifications WHERE tenant_id IN (SELECT id FROM tenants WHERE phone_number = '+14693685602');
DELETE FROM notification_templates WHERE tenant_id IN (SELECT id FROM tenants WHERE phone_number = '+14693685602');
DELETE FROM callback_queue WHERE tenant_id IN (SELECT id FROM tenants WHERE phone_number = '+14693685602');
DELETE FROM tenants WHERE phone_number = '+14693685602';

-- Generate a new UUID for the pizza demo tenant
-- Using a fixed UUID for easy reference: deadbeef-cafe-4000-a000-000000000001

-- ============================================================================
-- STEP 1: CREATE PIZZA RESTAURANT TENANT
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
  'deadbeef-cafe-4000-a000-000000000001',
  'Tony''s Pizza',
  'pizza',
  '+14693685602',
  'Maria',
  '{"tone": "friendly", "verbosity": "concise", "empathy": "high", "humor": false}',
  '{"provider": "cartesia", "voice_id": "a0e99841-438c-4a64-b679-ae501e7d6091", "voice_name": "Professional Female", "speaking_rate": 1.0, "pitch": 1.0}',
  'Thanks for calling Tony''s Pizza! This is Maria. Are you calling to place an order?',
  'Thanks for calling Tony''s Pizza. We''re currently closed. We open at 11 AM for lunch. Please call back during business hours or visit us online at tonyspizza.com.',
  'Hey, welcome back to Tony''s Pizza! What can I get for you today?',
  'America/Chicago',
  '{"schedule": [{"day": "sunday", "open": "12:00", "close": "21:00"}, {"day": "monday", "open": "11:00", "close": "22:00"}, {"day": "tuesday", "open": "11:00", "close": "22:00"}, {"day": "wednesday", "open": "11:00", "close": "22:00"}, {"day": "thursday", "open": "11:00", "close": "22:00"}, {"day": "friday", "open": "11:00", "close": "23:00"}, {"day": "saturday", "open": "11:00", "close": "23:00"}], "holidays": ["2026-01-01", "2026-07-04", "2026-11-26", "2026-12-25"]}',
  true,
  '+14695551234',
  ARRAY['speak to manager', 'manager', 'owner', 'complaint', 'wrong order', 'food poisoning', 'refund'],
  '{"sms_confirmations": true, "email_notifications": false, "live_transfer": true, "voicemail_fallback": true, "sentiment_analysis": true, "recording_enabled": true, "transcription_enabled": true, "delivery_enabled": true, "pickup_enabled": true}',
  true,
  'professional'
) ON CONFLICT (phone_number) DO UPDATE SET
  id = EXCLUDED.id,
  business_name = EXCLUDED.business_name,
  industry = EXCLUDED.industry,
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
-- STEP 2: CREATE SAMPLE CONTACTS (Pizza Customers)
-- ============================================================================
INSERT INTO contacts (tenant_id, first_name, last_name, name, phone, phone_normalized, email, status, tags, custom_fields, engagement_score, total_calls, total_bookings, source)
VALUES
  ('deadbeef-cafe-4000-a000-000000000001', 'John', 'Smith', 'John Smith', '(469) 555-1001', '+14695551001', 'john.smith@email.com', 'vip', ARRAY['regular', 'family-orders'], '{"favorite_pizza": "Pepperoni", "usual_order": "Large pepperoni, garlic knots", "delivery_address": "123 Main St"}', 95, 45, 40, 'call'),
  ('deadbeef-cafe-4000-a000-000000000001', 'Lisa', 'Johnson', 'Lisa Johnson', '(469) 555-1002', '+14695551002', 'lisa.j@email.com', 'active', ARRAY['lunch-regular'], '{"favorite_pizza": "Margherita", "dietary": "vegetarian"}', 78, 25, 22, 'call'),
  ('deadbeef-cafe-4000-a000-000000000001', 'Mike', 'Williams', 'Mike Williams', '(469) 555-1003', '+14695551003', 'mwilliams@corp.com', 'active', ARRAY['corporate-orders'], '{"company": "Williams Corp", "typical_order_size": "5-10 pizzas"}', 85, 15, 15, 'call'),
  ('deadbeef-cafe-4000-a000-000000000001', 'Sarah', 'Davis', 'Sarah Davis', '(469) 555-1004', '+14695551004', 'sarah.d@email.com', 'active', ARRAY['gluten-free'], '{"dietary": "gluten-free", "favorite": "GF Cheese Pizza"}', 60, 10, 8, 'call'),
  ('deadbeef-cafe-4000-a000-000000000001', 'Tom', 'Garcia', 'Tom Garcia', '(469) 555-1005', '+14695551005', NULL, 'active', ARRAY['new-customer'], '{}', 15, 2, 1, 'call')
ON CONFLICT (tenant_id, phone_normalized) DO NOTHING;

-- ============================================================================
-- STEP 3: CREATE RESOURCES (Kitchen Staff & Delivery)
-- ============================================================================
INSERT INTO resources (tenant_id, name, type, description, is_active, metadata)
VALUES
  ('deadbeef-cafe-4000-a000-000000000001', 'Kitchen Station 1', 'equipment', 'Main pizza oven - 4 pizza capacity', true, '{"capacity": 4, "type": "pizza_oven"}'),
  ('deadbeef-cafe-4000-a000-000000000001', 'Kitchen Station 2', 'equipment', 'Secondary oven - 2 pizza capacity', true, '{"capacity": 2, "type": "pizza_oven"}'),
  ('deadbeef-cafe-4000-a000-000000000001', 'Marco', 'staff', 'Head Pizza Chef', true, '{"role": "chef", "specialties": ["traditional", "wood-fired"]}'),
  ('deadbeef-cafe-4000-a000-000000000001', 'Alex', 'staff', 'Delivery Driver - Zone A', true, '{"role": "driver", "zone": "A", "vehicle": "car"}'),
  ('deadbeef-cafe-4000-a000-000000000001', 'Jordan', 'staff', 'Delivery Driver - Zone B', true, '{"role": "driver", "zone": "B", "vehicle": "car"}')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 4: CREATE SAMPLE ORDERS (Using bookings table)
-- ============================================================================
INSERT INTO bookings (tenant_id, customer_name, customer_phone, customer_email, booking_type, booking_date, booking_time, duration_minutes, status, confirmation_code, notes, amount_cents)
VALUES
  ('deadbeef-cafe-4000-a000-000000000001', 'John Smith', '+14695551001', 'john.smith@email.com', 'delivery', CURRENT_DATE, '18:30', 45, 'confirmed', 'TP-001', 'Large Pepperoni, Large Supreme, Garlic Knots x2. Delivery to 123 Main St.', 4599),
  ('deadbeef-cafe-4000-a000-000000000001', 'Lisa Johnson', '+14695551002', 'lisa.j@email.com', 'pickup', CURRENT_DATE, '12:15', 20, 'confirmed', 'TP-002', 'Medium Margherita, Side Salad. PICKUP.', 1899),
  ('deadbeef-cafe-4000-a000-000000000001', 'Mike Williams', '+14695551003', 'mwilliams@corp.com', 'delivery', CURRENT_DATE + 1, '12:00', 60, 'pending', 'TP-003', 'CORPORATE ORDER: 5x Large Cheese, 3x Large Pepperoni, 2x Large Veggie. Delivery to 500 Business Park Dr.', 12999),
  ('deadbeef-cafe-4000-a000-000000000001', 'Sarah Davis', '+14695551004', 'sarah.d@email.com', 'pickup', CURRENT_DATE, '19:00', 25, 'confirmed', 'TP-004', 'Medium Gluten-Free Cheese Pizza. PICKUP.', 1699)
ON CONFLICT (confirmation_code) DO NOTHING;

-- ============================================================================
-- STEP 5: CREATE SAMPLE CALLS (Pizza-related)
-- ============================================================================
INSERT INTO calls (tenant_id, vapi_call_id, caller_phone, caller_name, direction, status, started_at, ended_at, duration_seconds, outcome_type, outcome_success, transcript, summary, sentiment_score, intents_detected)
VALUES
  ('deadbeef-cafe-4000-a000-000000000001', 'pizza_call_001_' || gen_random_uuid(), '+14695551001', 'John Smith', 'inbound', 'completed', NOW() - interval '1 hour', NOW() - interval '1 hour' + interval '2 minutes', 120, 'booking', true, 'Customer: Hey, I want to order two large pizzas for delivery.\nMaria: Of course! What would you like on them?\nCustomer: One pepperoni and one supreme.\nMaria: Great choices! Anything else? We have fresh garlic knots today.\nCustomer: Yeah, add two orders of garlic knots.\nMaria: Perfect. Your total is $45.99 and it''ll be ready in about 35-40 minutes. Confirmation number is TP-001.', 'Regular customer John Smith placed delivery order for 2 large pizzas and garlic knots.', 0.92, ARRAY['order', 'delivery']),
  ('deadbeef-cafe-4000-a000-000000000001', 'pizza_call_002_' || gen_random_uuid(), '+14695551002', 'Lisa Johnson', 'inbound', 'completed', NOW() - interval '3 hours', NOW() - interval '3 hours' + interval '90 seconds', 90, 'booking', true, 'Customer: Hi, can I get a medium Margherita for pickup?\nMaria: Absolutely! When would you like to pick it up?\nCustomer: Is 15 minutes possible?\nMaria: We can have it ready in about 20 minutes. Is that okay?\nCustomer: Perfect.\nMaria: Great, that''s $18.99. Your confirmation is TP-002.', 'Lunch pickup order for vegetarian customer.', 0.88, ARRAY['order', 'pickup']),
  ('deadbeef-cafe-4000-a000-000000000001', 'pizza_call_003_' || gen_random_uuid(), '+14695559999', 'Unknown Caller', 'inbound', 'completed', NOW() - interval '30 minutes', NOW() - interval '30 minutes' + interval '45 seconds', 45, 'inquiry', true, 'Customer: What time do you close tonight?\nMaria: We''re open until 10 PM tonight, and until 11 on Fridays and Saturdays.\nCustomer: Do you have gluten free options?\nMaria: Yes we do! We have gluten-free crust available for any of our pizzas.\nCustomer: Thanks, I''ll call back later to order.', 'Inquiry about hours and gluten-free options.', 0.75, ARRAY['inquiry', 'hours', 'dietary']),
  ('deadbeef-cafe-4000-a000-000000000001', 'pizza_call_004_' || gen_random_uuid(), '+14695551005', 'Tom Garcia', 'inbound', 'completed', NOW() - interval '2 hours', NOW() - interval '2 hours' + interval '3 minutes', 180, 'booking', true, 'Customer: Hi, first time ordering. What''s good?\nMaria: Welcome! Our most popular is the Pepperoni, but our Meat Lovers and BBQ Chicken are also customer favorites. What kind of toppings do you usually like?\nCustomer: I like meat.\nMaria: Then I''d recommend the Meat Lovers - it has pepperoni, sausage, bacon, and ham. What size?\nCustomer: Large please, for delivery.\nMaria: Got it! What''s your address?\nCustomer: 456 Oak Street.\nMaria: Perfect, that''ll be about 40 minutes. Total is $22.99.', 'New customer, recommended Meat Lovers pizza based on preferences.', 0.85, ARRAY['order', 'delivery', 'recommendation'])
ON CONFLICT (vapi_call_id) DO NOTHING;

-- ============================================================================
-- STEP 6: NOTIFICATION TEMPLATES (Skipped - table schema varies)
-- ============================================================================
-- Notification templates will use defaults from the system

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Pizza Demo Data Loaded Successfully' as status;
SELECT 'Tenants' as table_name, COUNT(*) as count FROM tenants WHERE id = 'deadbeef-cafe-4000-a000-000000000001'
UNION ALL
SELECT 'Contacts', COUNT(*) FROM contacts WHERE tenant_id = 'deadbeef-cafe-4000-a000-000000000001'
UNION ALL
SELECT 'Resources', COUNT(*) FROM resources WHERE tenant_id = 'deadbeef-cafe-4000-a000-000000000001'
UNION ALL
SELECT 'Orders (Bookings)', COUNT(*) FROM bookings WHERE tenant_id = 'deadbeef-cafe-4000-a000-000000000001'
UNION ALL
SELECT 'Calls', COUNT(*) FROM calls WHERE tenant_id = 'deadbeef-cafe-4000-a000-000000000001'
ORDER BY table_name;
