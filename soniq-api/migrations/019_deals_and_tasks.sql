-- Soniq CRM - Deals Pipeline & Tasks
-- Adds sales pipeline tracking and task management
-- Date: 2026-03-01

-- ============================================================================
-- DEALS TABLE
-- Sales pipeline - tracks opportunities from first contact to close
-- ============================================================================
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Deal info
  name TEXT NOT NULL,
  description TEXT,
  company TEXT,

  -- Pipeline
  stage TEXT NOT NULL DEFAULT 'new'
    CHECK (stage IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  sort_index SMALLINT DEFAULT 0,

  -- Value
  amount_cents INTEGER DEFAULT 0,
  expected_close DATE,

  -- Relations
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,

  -- Source tracking
  source TEXT DEFAULT 'manual' CHECK (source IN ('call', 'web', 'manual', 'import')),
  created_by TEXT,

  -- Soft delete
  archived_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline queries: list deals by stage for Kanban
CREATE INDEX idx_deals_tenant_stage ON deals(tenant_id, stage) WHERE archived_at IS NULL;
-- Contact detail view: deals for a contact
CREATE INDEX idx_deals_tenant_contact ON deals(tenant_id, contact_id);

-- ============================================================================
-- TASKS TABLE
-- Follow-ups, reminders, and action items linked to contacts/deals
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Task info
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'follow_up'
    CHECK (type IN ('follow_up', 'call_back', 'email', 'meeting', 'review', 'custom')),
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Scheduling
  due_date DATE NOT NULL,
  due_time TIME,
  done_at TIMESTAMPTZ,

  -- Relations
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,

  -- Attribution
  assigned_to TEXT,
  created_by TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'auto', 'voice_agent')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pending tasks by due date (most common query)
CREATE INDEX idx_tasks_tenant_pending ON tasks(tenant_id, due_date) WHERE done_at IS NULL;
-- Contact detail view: tasks for a contact
CREATE INDEX idx_tasks_tenant_contact ON tasks(tenant_id, contact_id);
-- Deal detail view: tasks for a deal
CREATE INDEX idx_tasks_tenant_deal ON tasks(tenant_id, deal_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Service role gets full access (API uses service_role key)
CREATE POLICY service_role_deals ON deals FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_tasks ON tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
