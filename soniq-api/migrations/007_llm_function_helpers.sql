-- LLM Function Calling Optimization
-- PostgreSQL functions to improve LLM tool execution performance
-- Run this in Supabase SQL Editor

-- ============================================================================
-- FUNCTION CALL ANALYTICS TABLE
-- Track LLM function call patterns for optimization
-- ============================================================================
CREATE TABLE IF NOT EXISTS llm_function_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- References
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  call_sid TEXT, -- SignalWire/Vapi call ID

  -- Function details
  function_name TEXT NOT NULL,
  arguments JSONB NOT NULL DEFAULT '{}',
  result JSONB,

  -- Execution
  success BOOLEAN NOT NULL,
  error_message TEXT,
  execution_ms INTEGER, -- Execution time in milliseconds

  -- LLM context
  model_used TEXT,
  intent_score INTEGER,
  user_message TEXT,

  -- Metadata
  retry_count INTEGER DEFAULT 0
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_llm_calls_tenant ON llm_function_calls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_llm_calls_function ON llm_function_calls(function_name);
CREATE INDEX IF NOT EXISTS idx_llm_calls_created ON llm_function_calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_calls_success ON llm_function_calls(success, function_name);

-- ============================================================================
-- GET AVAILABLE SLOTS
-- Optimized SQL function for availability checking
-- Returns available slots for a given tenant and date
-- ============================================================================
CREATE OR REPLACE FUNCTION get_available_slots(
  p_tenant_id UUID,
  p_date DATE,
  p_start_hour INTEGER DEFAULT 9,
  p_end_hour INTEGER DEFAULT 17
)
RETURNS TABLE (
  slot_time TIME,
  slot_formatted TEXT,
  is_available BOOLEAN
) AS $$
DECLARE
  v_hour INTEGER;
  v_time TIME;
BEGIN
  FOR v_hour IN p_start_hour..p_end_hour LOOP
    v_time := make_time(v_hour, 0, 0);

    RETURN QUERY
    SELECT
      v_time,
      CASE
        WHEN v_hour < 12 THEN v_hour::TEXT || ' AM'
        WHEN v_hour = 12 THEN '12 PM'
        ELSE (v_hour - 12)::TEXT || ' PM'
      END,
      NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.tenant_id = p_tenant_id
          AND b.booking_date = p_date
          AND b.booking_time = v_time
          AND b.status NOT IN ('cancelled')
      );
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- VALIDATE ORDER DATA
-- Validates order data before insertion, returns validation errors
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_order_data(
  p_customer_name TEXT,
  p_order_type TEXT,
  p_items TEXT,
  p_delivery_address TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_field TEXT,
  error_message TEXT
) AS $$
BEGIN
  -- Check customer name
  IF p_customer_name IS NULL OR TRIM(p_customer_name) = ''
     OR LOWER(p_customer_name) IN ('unknown', 'not provided', 'n/a', 'none') THEN
    RETURN QUERY SELECT FALSE, 'customer_name'::TEXT, 'Customer name is required'::TEXT;
    RETURN;
  END IF;

  -- Check order type
  IF p_order_type IS NULL OR p_order_type NOT IN ('pickup', 'delivery') THEN
    RETURN QUERY SELECT FALSE, 'order_type'::TEXT, 'Order type must be pickup or delivery'::TEXT;
    RETURN;
  END IF;

  -- Check items
  IF p_items IS NULL OR TRIM(p_items) = '' THEN
    RETURN QUERY SELECT FALSE, 'items'::TEXT, 'Order items are required'::TEXT;
    RETURN;
  END IF;

  -- Check delivery address for delivery orders
  IF p_order_type = 'delivery' AND
     (p_delivery_address IS NULL OR TRIM(p_delivery_address) = ''
      OR LOWER(p_delivery_address) IN ('unknown', 'not provided', 'n/a', 'none')) THEN
    RETURN QUERY SELECT FALSE, 'delivery_address'::TEXT, 'Delivery address is required for delivery orders'::TEXT;
    RETURN;
  END IF;

  -- All validations passed
  RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- LOG FUNCTION CALL
-- Helper to log LLM function calls for analytics
-- ============================================================================
CREATE OR REPLACE FUNCTION log_function_call(
  p_tenant_id UUID,
  p_call_sid TEXT,
  p_function_name TEXT,
  p_arguments JSONB,
  p_result JSONB,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL,
  p_execution_ms INTEGER DEFAULT NULL,
  p_model_used TEXT DEFAULT NULL,
  p_intent_score INTEGER DEFAULT NULL,
  p_user_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO llm_function_calls (
    tenant_id, call_sid, function_name, arguments, result,
    success, error_message, execution_ms, model_used,
    intent_score, user_message
  ) VALUES (
    p_tenant_id, p_call_sid, p_function_name, p_arguments, p_result,
    p_success, p_error_message, p_execution_ms, p_model_used,
    p_intent_score, p_user_message
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GET FUNCTION CALL STATS
-- Analytics for function calling performance
-- ============================================================================
CREATE OR REPLACE FUNCTION get_function_call_stats(
  p_tenant_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  function_name TEXT,
  total_calls BIGINT,
  success_count BIGINT,
  failure_count BIGINT,
  success_rate NUMERIC,
  avg_execution_ms NUMERIC,
  p95_execution_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fc.function_name,
    COUNT(*)::BIGINT as total_calls,
    COUNT(*) FILTER (WHERE fc.success)::BIGINT as success_count,
    COUNT(*) FILTER (WHERE NOT fc.success)::BIGINT as failure_count,
    ROUND(COUNT(*) FILTER (WHERE fc.success)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as success_rate,
    ROUND(AVG(fc.execution_ms)::NUMERIC, 2) as avg_execution_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY fc.execution_ms)::NUMERIC as p95_execution_ms
  FROM llm_function_calls fc
  WHERE (p_tenant_id IS NULL OR fc.tenant_id = p_tenant_id)
    AND fc.created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY fc.function_name
  ORDER BY total_calls DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- GET RECENT BOOKINGS FOR CONTEXT
-- Returns recent bookings for a customer (useful for conversation context)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_customer_context(
  p_tenant_id UUID,
  p_phone TEXT
)
RETURNS TABLE (
  recent_bookings JSONB,
  total_bookings INTEGER,
  last_visit DATE,
  is_returning_customer BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH customer_bookings AS (
    SELECT
      b.id,
      b.booking_type,
      b.booking_date,
      b.booking_time,
      b.status,
      b.notes
    FROM bookings b
    WHERE b.tenant_id = p_tenant_id
      AND b.customer_phone = p_phone
    ORDER BY b.created_at DESC
    LIMIT 5
  )
  SELECT
    COALESCE(jsonb_agg(row_to_json(cb)), '[]'::jsonb) as recent_bookings,
    (SELECT COUNT(*)::INTEGER FROM bookings WHERE tenant_id = p_tenant_id AND customer_phone = p_phone) as total_bookings,
    (SELECT MAX(booking_date) FROM bookings WHERE tenant_id = p_tenant_id AND customer_phone = p_phone) as last_visit,
    EXISTS(SELECT 1 FROM bookings WHERE tenant_id = p_tenant_id AND customer_phone = p_phone) as is_returning_customer
  FROM customer_bookings cb;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON FUNCTION get_available_slots IS 'Returns available time slots for booking. Used by check_availability tool.';
COMMENT ON FUNCTION validate_order_data IS 'Validates order data before LLM calls create_order. Prevents invalid tool calls.';
COMMENT ON FUNCTION log_function_call IS 'Logs LLM function calls for analytics and debugging.';
COMMENT ON FUNCTION get_function_call_stats IS 'Returns aggregated stats on function calling performance.';
COMMENT ON FUNCTION get_customer_context IS 'Returns customer history for personalized conversation context.';
COMMENT ON TABLE llm_function_calls IS 'Tracks all LLM function/tool calls for analytics and optimization.';
