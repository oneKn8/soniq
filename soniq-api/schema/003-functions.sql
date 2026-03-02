-- Soniq Database Functions
-- RPC functions used by the application

-- ============================================================================
-- AVAILABILITY SLOT FUNCTIONS
-- ============================================================================

-- Increment slot booked count
CREATE OR REPLACE FUNCTION increment_slot_booked(p_slot_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE availability_slots
  SET booked_count = booked_count + 1,
      updated_at = now()
  WHERE id = p_slot_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement slot booked count
CREATE OR REPLACE FUNCTION decrement_slot_booked(p_slot_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE availability_slots
  SET booked_count = GREATEST(0, booked_count - 1),
      updated_at = now()
  WHERE id = p_slot_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONTACT METRIC FUNCTIONS
-- ============================================================================

-- Increment a contact metric field
CREATE OR REPLACE FUNCTION increment_contact_metric(
  p_contact_id UUID,
  p_field TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS void AS $$
BEGIN
  EXECUTE format(
    'UPDATE contacts SET %I = COALESCE(%I, 0) + $1, updated_at = now() WHERE id = $2',
    p_field, p_field
  ) USING p_amount, p_contact_id;
END;
$$ LANGUAGE plpgsql;

-- Bulk add tag to multiple contacts
CREATE OR REPLACE FUNCTION bulk_add_tag(
  p_tenant_id UUID,
  p_contact_ids UUID[],
  p_tag TEXT
)
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE contacts
  SET tags = CASE
    WHEN p_tag = ANY(tags) THEN tags
    ELSE array_append(tags, p_tag)
  END,
  updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND id = ANY(p_contact_ids)
    AND NOT (p_tag = ANY(tags));

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Bulk remove tag from multiple contacts
CREATE OR REPLACE FUNCTION bulk_remove_tag(
  p_tenant_id UUID,
  p_contact_ids UUID[],
  p_tag TEXT
)
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE contacts
  SET tags = array_remove(tags, p_tag),
      updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND id = ANY(p_contact_ids)
    AND p_tag = ANY(tags);

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CALL STATISTICS
-- ============================================================================

-- Update contact metrics after a call
CREATE OR REPLACE FUNCTION update_contact_after_call()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contact_id IS NOT NULL THEN
    UPDATE contacts
    SET total_calls = total_calls + 1,
        last_call_at = NEW.started_at,
        last_contact_at = NEW.started_at,
        updated_at = now()
    WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for call insert
DROP TRIGGER IF EXISTS trg_update_contact_after_call ON calls;
CREATE TRIGGER trg_update_contact_after_call
  AFTER INSERT ON calls
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_after_call();

-- ============================================================================
-- BOOKING STATISTICS
-- ============================================================================

-- Update contact metrics after a booking
CREATE OR REPLACE FUNCTION update_contact_after_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contact_id IS NOT NULL THEN
    UPDATE contacts
    SET total_bookings = total_bookings + 1,
        last_booking_at = NEW.created_at,
        last_contact_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for booking insert
DROP TRIGGER IF EXISTS trg_update_contact_after_booking ON bookings;
CREATE TRIGGER trg_update_contact_after_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_after_booking();

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants;
CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_contacts_updated_at ON contacts;
CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_calls_updated_at ON calls;
CREATE TRIGGER trg_calls_updated_at
  BEFORE UPDATE ON calls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_resources_updated_at ON resources;
CREATE TRIGGER trg_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_availability_slots_updated_at ON availability_slots;
CREATE TRIGGER trg_availability_slots_updated_at
  BEFORE UPDATE ON availability_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_availability_templates_updated_at ON availability_templates;
CREATE TRIGGER trg_availability_templates_updated_at
  BEFORE UPDATE ON availability_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON notifications;
CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_conversation_logs_updated_at ON conversation_logs;
CREATE TRIGGER trg_conversation_logs_updated_at
  BEFORE UPDATE ON conversation_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DASHBOARD STATISTICS
-- ============================================================================

-- Get dashboard stats for a tenant
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_tenant_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_calls BIGINT,
  total_bookings BIGINT,
  confirmed_bookings BIGINT,
  cancelled_bookings BIGINT,
  total_contacts BIGINT,
  new_contacts BIGINT,
  avg_call_duration NUMERIC,
  booking_success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM calls WHERE tenant_id = p_tenant_id AND created_at::date BETWEEN p_start_date AND p_end_date),
    (SELECT COUNT(*) FROM bookings WHERE tenant_id = p_tenant_id AND created_at::date BETWEEN p_start_date AND p_end_date),
    (SELECT COUNT(*) FROM bookings WHERE tenant_id = p_tenant_id AND status = 'confirmed' AND created_at::date BETWEEN p_start_date AND p_end_date),
    (SELECT COUNT(*) FROM bookings WHERE tenant_id = p_tenant_id AND status = 'cancelled' AND created_at::date BETWEEN p_start_date AND p_end_date),
    (SELECT COUNT(*) FROM contacts WHERE tenant_id = p_tenant_id),
    (SELECT COUNT(*) FROM contacts WHERE tenant_id = p_tenant_id AND created_at::date BETWEEN p_start_date AND p_end_date),
    (SELECT COALESCE(AVG(duration_seconds), 0) FROM calls WHERE tenant_id = p_tenant_id AND duration_seconds IS NOT NULL AND created_at::date BETWEEN p_start_date AND p_end_date),
    (SELECT CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE (COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed'))::NUMERIC / COUNT(*)::NUMERIC * 100)
    END FROM bookings WHERE tenant_id = p_tenant_id AND created_at::date BETWEEN p_start_date AND p_end_date);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Contact summary view
CREATE OR REPLACE VIEW contact_summary AS
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
CREATE OR REPLACE VIEW upcoming_bookings AS
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
