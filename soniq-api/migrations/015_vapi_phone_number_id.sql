-- Add vapi_phone_number_id to tenants for direct lookup from Vapi webhooks
-- This allows us to look up tenants by the Vapi phone number ID instead of relying on env vars

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vapi_phone_number_id TEXT;

-- Index for fast lookup by Vapi phone number ID
CREATE INDEX IF NOT EXISTS idx_tenants_vapi_phone_id ON tenants(vapi_phone_number_id) WHERE vapi_phone_number_id IS NOT NULL;

-- Update Grand Plaza Hotel with the known Vapi phone number ID
UPDATE tenants
SET vapi_phone_number_id = 'c9008ac0-5b29-487d-a5ae-235a93da10af'
WHERE phone_number = '+19452319647';
