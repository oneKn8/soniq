-- Voicemails Table Migration
-- Stores voicemail recordings when agent is unavailable

-- Create voicemails table
CREATE TABLE IF NOT EXISTS voicemails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    call_sid VARCHAR(100) NOT NULL,
    caller_phone VARCHAR(20) NOT NULL,
    caller_name VARCHAR(255),
    recording_url TEXT,
    recording_sid VARCHAR(100),
    duration_seconds INTEGER,
    transcript TEXT,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('after_hours', 'max_retries', 'no_agent_available', 'caller_requested', 'call_failed')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'callback_scheduled', 'resolved')),
    notes TEXT,
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMPTZ,
    callback_scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_voicemails_tenant_id ON voicemails(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voicemails_status ON voicemails(status);
CREATE INDEX IF NOT EXISTS idx_voicemails_caller_phone ON voicemails(caller_phone);
CREATE INDEX IF NOT EXISTS idx_voicemails_created_at ON voicemails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voicemails_call_sid ON voicemails(call_sid);

-- Enable RLS
ALTER TABLE voicemails ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenants can view own voicemails"
    ON voicemails FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Tenants can insert own voicemails"
    ON voicemails FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Tenants can update own voicemails"
    ON voicemails FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Updated at trigger
CREATE TRIGGER update_voicemails_updated_at
    BEFORE UPDATE ON voicemails
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE voicemails IS 'Stores voicemail recordings when AI agent cannot handle calls';
