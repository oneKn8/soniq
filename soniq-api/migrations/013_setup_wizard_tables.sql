-- Migration 013: Setup Wizard Tables
-- Creates tables needed for the form-based client onboarding wizard

-- ============================================================================
-- PORT REQUESTS TABLE
-- Number porting requests (must come before phone_configurations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS port_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign keys
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Porting details
  phone_number TEXT NOT NULL,
  current_carrier TEXT NOT NULL,
  account_number TEXT, -- encrypted
  pin TEXT, -- encrypted
  authorized_name TEXT NOT NULL,

  -- LOA tracking
  loa_signed_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'pending', 'approved', 'rejected', 'completed')),
  rejection_reason TEXT,
  estimated_completion DATE,

  -- Timestamps
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- TENANT CAPABILITIES TABLE
-- Enabled features per tenant (reservations, appointments, faq, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_capabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign keys
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Capability details
  capability TEXT NOT NULL, -- e.g., 'reservations', 'appointments', 'faq'
  config JSONB DEFAULT '{}', -- capability-specific settings
  is_enabled BOOLEAN DEFAULT TRUE,

  -- Unique constraint
  UNIQUE(tenant_id, capability)
);

-- ============================================================================
-- TENANT INTEGRATIONS TABLE
-- OAuth connections (Google Calendar, Outlook, Calendly, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign keys
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Integration details
  provider TEXT NOT NULL, -- google_calendar, outlook, calendly, etc.
  access_token TEXT, -- encrypted
  refresh_token TEXT, -- encrypted
  token_expires_at TIMESTAMPTZ,
  scopes TEXT,
  external_account_id TEXT,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),

  -- Unique constraint
  UNIQUE(tenant_id, provider)
);

-- Updated at trigger
DROP TRIGGER IF EXISTS trigger_tenant_integrations_updated_at ON tenant_integrations;
CREATE TRIGGER trigger_tenant_integrations_updated_at
  BEFORE UPDATE ON tenant_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- TENANT PROMOTIONS TABLE
-- Active offers and promotions
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign keys
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Promotion details
  offer_text TEXT NOT NULL,
  mention_behavior TEXT DEFAULT 'relevant' CHECK (mention_behavior IN ('always', 'relevant', 'interested')),
  is_active BOOLEAN DEFAULT TRUE,

  -- Scheduling
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ
);

-- ============================================================================
-- PHONE CONFIGURATIONS TABLE
-- Phone setup (new number, port, forward)
-- ============================================================================
CREATE TABLE IF NOT EXISTS phone_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign keys
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  port_request_id UUID REFERENCES port_requests(id),

  -- Phone details
  phone_number TEXT,
  setup_type TEXT NOT NULL CHECK (setup_type IN ('new', 'port', 'forward')),
  provider TEXT DEFAULT 'signalwire',
  provider_sid TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'porting', 'porting_with_temp', 'failed')),

  -- A2P compliance
  a2p_brand_id TEXT,
  a2p_campaign_id TEXT,

  -- Verification
  verified_at TIMESTAMPTZ,

  -- Unique constraint
  UNIQUE(tenant_id)
);

-- ============================================================================
-- ESCALATION CONTACTS TABLE
-- Transfer contacts for human handoff
-- ============================================================================
CREATE TABLE IF NOT EXISTS escalation_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign keys
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Contact details
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT,

  -- Priority
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,

  -- Availability
  availability TEXT DEFAULT 'business_hours' CHECK (availability IN ('business_hours', 'always', 'custom')),
  availability_hours JSONB -- custom schedule if availability = 'custom'
);

-- ============================================================================
-- PENDING BOOKINGS TABLE
-- Assisted mode bookings (when no calendar integration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pending_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign keys
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,

  -- Customer details
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,

  -- Booking request
  requested_date DATE,
  requested_time TIME,
  service TEXT,
  notes TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled')),

  -- Confirmation
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ
);

-- ============================================================================
-- ALTER TENANTS TABLE
-- Add new columns for setup wizard
-- ============================================================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS setup_step TEXT DEFAULT 'business';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'suspended'));
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS location_address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS assisted_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS after_hours_behavior TEXT DEFAULT 'answer_closed';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS transfer_behavior JSONB DEFAULT '{"type": "warm", "no_answer": "message"}';

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tenant_capabilities_tenant ON tenant_capabilities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_integrations_tenant ON tenant_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_integrations_status ON tenant_integrations(status);
CREATE INDEX IF NOT EXISTS idx_tenant_promotions_tenant_active ON tenant_promotions(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_phone_configurations_tenant ON phone_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_phone_configurations_status ON phone_configurations(status);
CREATE INDEX IF NOT EXISTS idx_port_requests_tenant ON port_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_port_requests_status ON port_requests(status);
CREATE INDEX IF NOT EXISTS idx_escalation_contacts_tenant ON escalation_contacts(tenant_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_pending_bookings_tenant_status ON pending_bookings(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tenants_setup_step ON tenants(setup_step) WHERE setup_completed_at IS NULL;

-- ============================================================================
-- ROW LEVEL SECURITY - TENANT CAPABILITIES
-- ============================================================================
ALTER TABLE tenant_capabilities ENABLE ROW LEVEL SECURITY;

-- Select: User must be active member of tenant
DROP POLICY IF EXISTS tenant_capabilities_select_members ON tenant_capabilities;
CREATE POLICY tenant_capabilities_select_members ON tenant_capabilities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_capabilities.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = TRUE
    )
  );

-- Insert: User must be owner or admin
DROP POLICY IF EXISTS tenant_capabilities_insert_admin ON tenant_capabilities;
CREATE POLICY tenant_capabilities_insert_admin ON tenant_capabilities
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_capabilities.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = TRUE
    )
  );

-- Update: User must be owner or admin
DROP POLICY IF EXISTS tenant_capabilities_update_admin ON tenant_capabilities;
CREATE POLICY tenant_capabilities_update_admin ON tenant_capabilities
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_capabilities.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = TRUE
    )
  );

-- Delete: Owner only
DROP POLICY IF EXISTS tenant_capabilities_delete_owner ON tenant_capabilities;
CREATE POLICY tenant_capabilities_delete_owner ON tenant_capabilities
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_capabilities.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'owner'
        AND tm.is_active = TRUE
    )
  );

-- ============================================================================
-- ROW LEVEL SECURITY - TENANT INTEGRATIONS
-- ============================================================================
ALTER TABLE tenant_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_integrations_select_members ON tenant_integrations;
CREATE POLICY tenant_integrations_select_members ON tenant_integrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_integrations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS tenant_integrations_insert_admin ON tenant_integrations;
CREATE POLICY tenant_integrations_insert_admin ON tenant_integrations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_integrations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS tenant_integrations_update_admin ON tenant_integrations;
CREATE POLICY tenant_integrations_update_admin ON tenant_integrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_integrations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS tenant_integrations_delete_owner ON tenant_integrations;
CREATE POLICY tenant_integrations_delete_owner ON tenant_integrations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_integrations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'owner'
        AND tm.is_active = TRUE
    )
  );

-- ============================================================================
-- ROW LEVEL SECURITY - TENANT PROMOTIONS
-- ============================================================================
ALTER TABLE tenant_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_promotions_select_members ON tenant_promotions;
CREATE POLICY tenant_promotions_select_members ON tenant_promotions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_promotions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS tenant_promotions_insert_admin ON tenant_promotions;
CREATE POLICY tenant_promotions_insert_admin ON tenant_promotions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_promotions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS tenant_promotions_update_admin ON tenant_promotions;
CREATE POLICY tenant_promotions_update_admin ON tenant_promotions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_promotions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS tenant_promotions_delete_owner ON tenant_promotions;
CREATE POLICY tenant_promotions_delete_owner ON tenant_promotions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = tenant_promotions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'owner'
        AND tm.is_active = TRUE
    )
  );

-- ============================================================================
-- ROW LEVEL SECURITY - PHONE CONFIGURATIONS
-- ============================================================================
ALTER TABLE phone_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS phone_configurations_select_members ON phone_configurations;
CREATE POLICY phone_configurations_select_members ON phone_configurations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = phone_configurations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS phone_configurations_insert_admin ON phone_configurations;
CREATE POLICY phone_configurations_insert_admin ON phone_configurations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = phone_configurations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS phone_configurations_update_admin ON phone_configurations;
CREATE POLICY phone_configurations_update_admin ON phone_configurations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = phone_configurations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS phone_configurations_delete_owner ON phone_configurations;
CREATE POLICY phone_configurations_delete_owner ON phone_configurations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = phone_configurations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'owner'
        AND tm.is_active = TRUE
    )
  );

-- ============================================================================
-- ROW LEVEL SECURITY - PORT REQUESTS
-- ============================================================================
ALTER TABLE port_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS port_requests_select_members ON port_requests;
CREATE POLICY port_requests_select_members ON port_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = port_requests.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS port_requests_insert_admin ON port_requests;
CREATE POLICY port_requests_insert_admin ON port_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = port_requests.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS port_requests_update_admin ON port_requests;
CREATE POLICY port_requests_update_admin ON port_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = port_requests.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS port_requests_delete_owner ON port_requests;
CREATE POLICY port_requests_delete_owner ON port_requests
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = port_requests.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'owner'
        AND tm.is_active = TRUE
    )
  );

-- ============================================================================
-- ROW LEVEL SECURITY - ESCALATION CONTACTS
-- ============================================================================
ALTER TABLE escalation_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS escalation_contacts_select_members ON escalation_contacts;
CREATE POLICY escalation_contacts_select_members ON escalation_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = escalation_contacts.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS escalation_contacts_insert_admin ON escalation_contacts;
CREATE POLICY escalation_contacts_insert_admin ON escalation_contacts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = escalation_contacts.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS escalation_contacts_update_admin ON escalation_contacts;
CREATE POLICY escalation_contacts_update_admin ON escalation_contacts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = escalation_contacts.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS escalation_contacts_delete_owner ON escalation_contacts;
CREATE POLICY escalation_contacts_delete_owner ON escalation_contacts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = escalation_contacts.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'owner'
        AND tm.is_active = TRUE
    )
  );

-- ============================================================================
-- ROW LEVEL SECURITY - PENDING BOOKINGS
-- ============================================================================
ALTER TABLE pending_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pending_bookings_select_members ON pending_bookings;
CREATE POLICY pending_bookings_select_members ON pending_bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = pending_bookings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS pending_bookings_insert_admin ON pending_bookings;
CREATE POLICY pending_bookings_insert_admin ON pending_bookings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = pending_bookings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS pending_bookings_update_admin ON pending_bookings;
CREATE POLICY pending_bookings_update_admin ON pending_bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = pending_bookings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS pending_bookings_delete_owner ON pending_bookings;
CREATE POLICY pending_bookings_delete_owner ON pending_bookings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = pending_bookings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'owner'
        AND tm.is_active = TRUE
    )
  );
