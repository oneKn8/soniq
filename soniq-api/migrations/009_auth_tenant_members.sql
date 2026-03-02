-- Migration 009: Auth & Tenant Members
-- Links Supabase auth.users to tenants with roles

-- ============================================================================
-- TENANT MEMBERS TABLE
-- Links users to tenants with role-based access
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign keys
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role within the tenant
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'readonly')),

  -- Invitation tracking
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ DEFAULT NOW(),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Unique constraint: one membership per user per tenant
  UNIQUE(tenant_id, user_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON tenant_members(user_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members(tenant_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_tenant_members_role ON tenant_members(tenant_id, role);

-- Updated at trigger
DROP TRIGGER IF EXISTS trigger_tenant_members_updated_at ON tenant_members;
CREATE TRIGGER trigger_tenant_members_updated_at
  BEFORE UPDATE ON tenant_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on tenant_members
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own memberships
DROP POLICY IF EXISTS tenant_members_select_own ON tenant_members;
CREATE POLICY tenant_members_select_own ON tenant_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Owners/admins can manage memberships for their tenants
DROP POLICY IF EXISTS tenant_members_insert_admin ON tenant_members;
CREATE POLICY tenant_members_insert_admin ON tenant_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_members.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS tenant_members_update_admin ON tenant_members;
CREATE POLICY tenant_members_update_admin ON tenant_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_members.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS tenant_members_delete_admin ON tenant_members;
CREATE POLICY tenant_members_delete_admin ON tenant_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_members.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = TRUE
    )
  );

-- ============================================================================
-- ENABLE RLS ON EXISTING TABLES
-- ============================================================================

-- Enable RLS on tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Tenants: Users can only see tenants they're members of
DROP POLICY IF EXISTS tenants_select_members ON tenants;
CREATE POLICY tenants_select_members ON tenants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenants.id
        AND tm.user_id = auth.uid()
        AND tm.is_active = TRUE
    )
  );

-- Tenants: Only owners can update
DROP POLICY IF EXISTS tenants_update_owner ON tenants;
CREATE POLICY tenants_update_owner ON tenants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenants.id
        AND tm.user_id = auth.uid()
        AND tm.role = 'owner'
        AND tm.is_active = TRUE
    )
  );

-- Enable RLS on calls
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calls_tenant_access ON calls;
CREATE POLICY calls_tenant_access ON calls
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = calls.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = TRUE
    )
  );

-- Enable RLS on bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bookings_tenant_access ON bookings;
CREATE POLICY bookings_tenant_access ON bookings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = bookings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = TRUE
    )
  );

-- Enable RLS on contacts (from CRM schema)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contacts_tenant_access ON contacts;
CREATE POLICY contacts_tenant_access ON contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = contacts.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = TRUE
    )
  );

-- Enable RLS on sms_messages
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sms_messages_tenant_access ON sms_messages;
CREATE POLICY sms_messages_tenant_access ON sms_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = sms_messages.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = TRUE
    )
  );

-- Enable RLS on callback_queue
ALTER TABLE callback_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS callback_queue_tenant_access ON callback_queue;
CREATE POLICY callback_queue_tenant_access ON callback_queue
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = callback_queue.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = TRUE
    )
  );

-- ============================================================================
-- HELPER FUNCTION: Get user's tenants
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_tenants(p_user_id UUID)
RETURNS TABLE (
  tenant_id UUID,
  role TEXT,
  business_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tm.tenant_id,
    tm.role,
    t.business_name
  FROM tenant_members tm
  JOIN tenants t ON t.id = tm.tenant_id
  WHERE tm.user_id = p_user_id
    AND tm.is_active = TRUE
    AND t.is_active = TRUE
  ORDER BY tm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Check user has tenant access
-- ============================================================================
CREATE OR REPLACE FUNCTION user_has_tenant_access(p_user_id UUID, p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tenant_members
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Get user's role in tenant
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_tenant_role(p_user_id UUID, p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM tenant_members
  WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND is_active = TRUE;

  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
