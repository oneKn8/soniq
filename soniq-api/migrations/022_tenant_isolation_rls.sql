-- Migration 022: Real tenant isolation via Row Level Security
-- ============================================================================
-- Today, tenant isolation is enforced only by the application appending
-- "WHERE tenant_id = $x" to queries. This migration adds a database-enforced
-- floor: a dedicated NOLOGIN role (app_api, NOT superuser, NOT BYPASSRLS) that
-- can only ever see/modify rows whose tenant_id matches the per-transaction GUC
-- app.tenant_id. The application routes tenant-scoped queries through this role
-- (SET LOCAL ROLE app_api; SET LOCAL app.tenant_id = '<uuid>'), so a bug that
-- forgets a WHERE clause can no longer leak across tenants.
--
-- The owning/service connection (table owner, superuser, or a BYPASSRLS role)
-- is deliberately unaffected: table owners bypass RLS unless FORCE ROW LEVEL
-- SECURITY is set (we do NOT set it), so cross-tenant system/admin queries keep
-- working as before.
--
-- Every base table in schema public that has a tenant_id column is enrolled,
-- enumerated dynamically so no current or future tenant-scoped table is missed.
-- Idempotent (DROP POLICY IF EXISTS + CREATE; ENABLE RLS is a no-op if already on).
-- ============================================================================

-- 1. The application role. NOLOGIN: it is assumed via SET ROLE from the pooled
--    owner connection, never connected to directly. No BYPASSRLS, not superuser.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_api') THEN
    CREATE ROLE app_api NOLOGIN NOINHERIT;
  END IF;
END $$;

-- Schema usage so the role can reach the objects.
GRANT USAGE ON SCHEMA public TO app_api;

-- 2. Allow the current (owner) role to SET ROLE app_api. Superusers can already
--    do this; for a non-superuser owner (e.g. the Supabase/self-host DB owner
--    the app pool connects as) we grant membership so tenantQuery() can switch.
DO $$
BEGIN
  IF NOT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user)
     AND NOT pg_has_role(current_user, 'app_api', 'MEMBER') THEN
    EXECUTE format('GRANT app_api TO %I', current_user);
  END IF;
END $$;

-- 3. Enroll every tenant-scoped table: enable RLS, install the isolation policy,
--    and grant CRUD + sequence usage to app_api.
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema
     AND tb.table_name  = c.table_name
     AND tb.table_type  = 'BASE TABLE'
    WHERE c.table_schema = 'public'
      AND c.column_name  = 'tenant_id'
    ORDER BY c.table_name
  LOOP
    -- Enable RLS (no FORCE: owner/superuser still bypass).
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Isolation policy for app_api across ALL commands. NULLIF guards against an
    -- unset/empty GUC (yields NULL -> zero rows, a safe closed default) instead
    -- of raising on an invalid uuid cast.
    EXECUTE format('DROP POLICY IF EXISTS app_api_tenant_isolation ON public.%I', t);
    EXECUTE format($f$
      CREATE POLICY app_api_tenant_isolation ON public.%I
        FOR ALL
        TO app_api
        USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    $f$, t);

    -- CRUD privileges (RLS still filters which rows are visible/writable).
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO app_api', t);
  END LOOP;
END $$;

-- Sequence usage for any serial/identity defaults on the enrolled tables.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_api;
