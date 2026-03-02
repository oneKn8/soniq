-- Migration 016: SIP Trunk Support
-- Adds SIP-related columns to phone_configurations for businesses with VOIP/PBX systems

-- Add SIP columns to phone_configurations
ALTER TABLE phone_configurations ADD COLUMN IF NOT EXISTS sip_uri TEXT;
ALTER TABLE phone_configurations ADD COLUMN IF NOT EXISTS sip_username TEXT;

-- Update setup_type check constraint to include 'sip'
ALTER TABLE phone_configurations DROP CONSTRAINT IF EXISTS phone_configurations_setup_type_check;
ALTER TABLE phone_configurations ADD CONSTRAINT phone_configurations_setup_type_check
  CHECK (setup_type IN ('new', 'port', 'forward', 'sip'));

-- Index for SIP URI lookups (used during incoming SIP calls)
CREATE INDEX IF NOT EXISTS idx_phone_configurations_sip_uri
  ON phone_configurations(sip_uri)
  WHERE sip_uri IS NOT NULL AND setup_type = 'sip';
