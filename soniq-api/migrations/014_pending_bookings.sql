-- Migration 014: Pending Bookings Table
-- Creates table for assisted mode booking requests that need manual confirmation

-- ============================================================================
-- PENDING BOOKINGS TABLE
-- Stores booking requests when direct calendar booking fails or is unavailable
-- ============================================================================
CREATE TABLE IF NOT EXISTS pending_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign keys
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,

  -- Customer information
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,

  -- Requested appointment details
  requested_date DATE,
  requested_time TIME,
  service TEXT,
  notes TEXT,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pending_bookings_tenant ON pending_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pending_bookings_status ON pending_bookings(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_bookings_created ON pending_bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_bookings_call ON pending_bookings(call_id);

-- RLS policies
ALTER TABLE pending_bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view pending bookings for tenants they belong to
CREATE POLICY "Users can view tenant pending bookings" ON pending_bookings
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can create pending bookings for tenants they belong to
CREATE POLICY "Users can create tenant pending bookings" ON pending_bookings
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update pending bookings for tenants they belong to
CREATE POLICY "Users can update tenant pending bookings" ON pending_bookings
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

-- Grant service role full access
GRANT ALL ON pending_bookings TO service_role;
