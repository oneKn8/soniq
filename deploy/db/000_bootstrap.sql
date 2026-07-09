-- Soniq self-host / local compatibility bootstrap
-- ============================================================================
-- Purpose: make the existing soniq-api/migrations/*.sql (written for Supabase)
-- apply cleanly on a vanilla Postgres 16 / self-hosted stack.
--
-- The migrations rely on Supabase-provided objects that a stock Postgres does
-- NOT ship with:
--   * the "uuid-ossp" extension (uuid_generate_v4)
--   * an "auth" schema, an "auth.users" table, and an auth.uid() function
--   * the roles anon, authenticated, service_role, supabase_auth_admin
--
-- This file creates minimal, standalone equivalents so those references resolve.
--
-- IDEMPOTENT: safe to run repeatedly.
-- HARMLESS ON REAL SUPABASE: every object is guarded so that when the real
-- Supabase-managed version already exists, this script leaves it untouched
-- (no CREATE OR REPLACE over auth.uid(), no clobbering of auth.users, roles
-- created only if absent). Intended for self-host / local; a no-op on Supabase.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 2. Roles (Supabase predefines these; create only if missing)
--    NOLOGIN group roles, matching Supabase semantics closely enough for the
--    migrations' GRANT / CREATE POLICY ... TO <role> statements to resolve.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    -- service_role bypasses RLS on Supabase; mirror that so the service
    -- connection behaves the same way self-hosted.
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END $$;

DO $$
BEGIN
  -- supabase_auth_admin is the role GoTrue (the auth service) runs as, and
  -- migrations 011/012 GRANT to it so the on-signup trigger can insert tenants.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin NOLOGIN NOINHERIT;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. auth schema
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS auth;

-- Let the auth-admin role use the schema (Supabase already arranges this).
GRANT USAGE ON SCHEMA auth TO supabase_auth_admin, service_role, authenticated, anon;

-- ----------------------------------------------------------------------------
-- 4. Minimal auth.users
--    Only the columns the migrations actually reference:
--      id, email, raw_user_meta_data (see handle_new_user in 011/012),
--      plus created_at for parity. On real Supabase this table already exists
--      with a far richer shape, so IF NOT EXISTS makes this a no-op there.
--    On self-host with GoTrue, GoTrue creates/owns the real auth.users before
--    the app connects, so this is only a fallback for a DB-only / local run.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth.users (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email              TEXT UNIQUE,
  raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. auth.uid()
--    Reads the JWT "sub" claim that the app / PostgREST places into the GUC
--    request.jwt.claim.sub. Returns NULL when unauthenticated instead of
--    erroring on a bad cast.
--
--    Guarded so we NEVER replace Supabase's own auth.uid(): only created when
--    no function named auth.uid already exists.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION auth.uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      AS $body$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $body$;
    $fn$;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role, supabase_auth_admin;

-- ----------------------------------------------------------------------------
-- 6. Trigger helper: update_updated_at_column()
--    Migration 005_voicemails.sql attaches a BEFORE UPDATE trigger that calls
--    public.update_updated_at_column(), but no migration in the repo defines
--    it (on the origin Supabase project it existed ad-hoc). Define it here as a
--    self-host/local compat shim so 005 applies. Body is the trivial, standard
--    "stamp updated_at = now()" and matches the sibling update_updated_at()
--    from 001, so CREATE OR REPLACE is harmless everywhere.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
