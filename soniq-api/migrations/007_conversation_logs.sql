-- Conversation Logs for Training/Fine-tuning
-- Stores structured conversation data for LLM training

CREATE TABLE IF NOT EXISTS conversation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,

  -- Conversation metadata
  industry TEXT,
  scenario_type TEXT, -- booking, inquiry, support, escalation, general
  language TEXT DEFAULT 'en',

  -- The actual training data
  messages JSONB NOT NULL DEFAULT '[]',
  -- Format: [{role: "system"|"user"|"assistant"|"tool", content: string, timestamp: ISO, tool_call?: {...}}]

  -- Quality indicators for filtering training data
  quality_score DECIMAL(3,2), -- 0.00 to 1.00
  is_complete BOOLEAN DEFAULT false, -- Did conversation end naturally?
  has_tool_calls BOOLEAN DEFAULT false,
  has_escalation BOOLEAN DEFAULT false,
  outcome_success BOOLEAN,

  -- Statistics
  turn_count INTEGER DEFAULT 0,
  user_turns INTEGER DEFAULT 0,
  assistant_turns INTEGER DEFAULT 0,
  tool_calls_count INTEGER DEFAULT 0,
  total_tokens_estimate INTEGER DEFAULT 0,
  duration_seconds INTEGER,

  -- For data curation
  reviewed BOOLEAN DEFAULT false,
  flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,

  -- Export tracking
  exported_at TIMESTAMPTZ,
  export_format TEXT, -- jsonl, sharegpt, alpaca

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_conversation_logs_tenant ON conversation_logs(tenant_id);
CREATE INDEX idx_conversation_logs_call ON conversation_logs(call_id);
CREATE INDEX idx_conversation_logs_session ON conversation_logs(session_id);
CREATE INDEX idx_conversation_logs_scenario ON conversation_logs(scenario_type);
CREATE INDEX idx_conversation_logs_quality ON conversation_logs(quality_score DESC);
CREATE INDEX idx_conversation_logs_created ON conversation_logs(created_at DESC);
CREATE INDEX idx_conversation_logs_reviewed ON conversation_logs(reviewed) WHERE reviewed = false;
CREATE INDEX idx_conversation_logs_flagged ON conversation_logs(flagged) WHERE flagged = true;

-- GIN index for JSONB messages search
CREATE INDEX idx_conversation_logs_messages ON conversation_logs USING GIN (messages);
CREATE INDEX idx_conversation_logs_tags ON conversation_logs USING GIN (tags);

-- Enable RLS
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Tenants can view own logs" ON conversation_logs
  FOR SELECT USING (auth.uid()::text = tenant_id::text OR current_setting('app.service_role', true) = 'true');

CREATE POLICY "Service role can manage all" ON conversation_logs
  FOR ALL USING (current_setting('app.service_role', true) = 'true');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_conversation_logs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversation_logs_updated
  BEFORE UPDATE ON conversation_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_logs_timestamp();

-- View for training data export
CREATE OR REPLACE VIEW training_data_export AS
SELECT
  id,
  tenant_id,
  industry,
  scenario_type,
  messages,
  quality_score,
  is_complete,
  has_tool_calls,
  outcome_success,
  turn_count,
  tags,
  created_at
FROM conversation_logs
WHERE
  reviewed = true
  AND flagged = false
  AND is_complete = true
  AND quality_score >= 0.7;

COMMENT ON TABLE conversation_logs IS 'Stores conversation data for LLM fine-tuning and training';
COMMENT ON VIEW training_data_export IS 'Pre-filtered view of high-quality training data';
