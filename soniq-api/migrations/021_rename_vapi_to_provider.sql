-- Migration 021: Rename provider-agnostic columns (drop the "vapi" branding)
-- ============================================================================
-- Soniq is no longer Vapi-specific. Rename the two provider-identifier columns
-- and the indexes/constraints named after them.
--
-- Real columns verified via information_schema before writing:
--   calls.vapi_call_id            (text, NOT NULL, UNIQUE) -> provider_call_id
--   tenants.vapi_phone_number_id  (text)                   -> provider_phone_id
-- Named objects verified via pg_indexes / pg_constraint:
--   index      idx_calls_vapi_id          -> idx_calls_provider_call_id
--   index      idx_tenants_vapi_phone_id  -> idx_tenants_provider_phone_id
--   constraint calls_vapi_call_id_key     -> calls_provider_call_id_key
--
-- Postgres does NOT auto-rename dependent indexes/constraints on RENAME COLUMN,
-- so each is renamed explicitly. All steps guarded for idempotency.
-- ============================================================================

-- Column: calls.vapi_call_id -> provider_call_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='calls' AND column_name='vapi_call_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='calls' AND column_name='provider_call_id'
  ) THEN
    ALTER TABLE calls RENAME COLUMN vapi_call_id TO provider_call_id;
  END IF;
END $$;

-- Column: tenants.vapi_phone_number_id -> provider_phone_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tenants' AND column_name='vapi_phone_number_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tenants' AND column_name='provider_phone_id'
  ) THEN
    ALTER TABLE tenants RENAME COLUMN vapi_phone_number_id TO provider_phone_id;
  END IF;
END $$;

-- Index: idx_calls_vapi_id -> idx_calls_provider_call_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_calls_vapi_id')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_calls_provider_call_id') THEN
    ALTER INDEX idx_calls_vapi_id RENAME TO idx_calls_provider_call_id;
  END IF;
END $$;

-- Index: idx_tenants_vapi_phone_id -> idx_tenants_provider_phone_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_tenants_vapi_phone_id')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_tenants_provider_phone_id') THEN
    ALTER INDEX idx_tenants_vapi_phone_id RENAME TO idx_tenants_provider_phone_id;
  END IF;
END $$;

-- Unique constraint: calls_vapi_call_id_key -> calls_provider_call_id_key
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='calls_vapi_call_id_key')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='calls_provider_call_id_key') THEN
    ALTER TABLE calls RENAME CONSTRAINT calls_vapi_call_id_key TO calls_provider_call_id_key;
  END IF;
END $$;
