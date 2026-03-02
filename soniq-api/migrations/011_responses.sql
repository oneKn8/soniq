-- Add responses JSONB column to tenants for custom AI response templates
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS responses JSONB;

COMMENT ON COLUMN tenants.responses IS 'Custom response templates for specific situations (notAvailable, transferring, bookingConfirmed, etc.)';
