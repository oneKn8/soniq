-- Migration 017: Add metadata column to calls + dashboard performance indexes
-- Fixes: dashboard /api/dashboard/metrics 500 error (missing metadata column)
-- Fixes: 400ms+ COUNT queries on calls and bookings tables

-- Add metadata JSONB column for storing call metrics (latency, etc.)
ALTER TABLE calls ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- GIN index for JSONB queries on metadata (only index non-null rows)
CREATE INDEX IF NOT EXISTS idx_calls_metadata ON calls USING gin(metadata) WHERE metadata IS NOT NULL;

-- Composite indexes for dashboard COUNT queries: COUNT(*) WHERE tenant_id = $1 AND created_at >= $2
CREATE INDEX IF NOT EXISTS idx_calls_tenant_created ON calls(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_created ON bookings(tenant_id, created_at);
