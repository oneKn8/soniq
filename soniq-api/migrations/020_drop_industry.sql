-- Migration 020: Drop tenants.industry
-- ============================================================================
-- The product moved to a single universal agent; the per-tenant "industry"
-- vertical is no longer read by the application. Drop the column.
--
-- Dependencies on tenants.industry:
--   * No index, constraint, view, or default references it (verified via
--     information_schema / pg_indexes on the applied schema).
--   * public.handle_new_user() (the auth.users on-signup trigger, last defined
--     in 012) INSERTs a hardcoded 'pending_setup' into tenants.industry. Because
--     plpgsql bodies are not dependency-tracked, DROP COLUMN succeeds but would
--     leave that function inserting into a now-missing column. Worse, 012 wraps
--     the insert in an EXCEPTION WHEN OTHERS handler that only RAISE WARNINGs,
--     so a signup would silently create NO tenant. We therefore recreate
--     handle_new_user() here without the industry column.
--
-- Idempotent.
-- ============================================================================

ALTER TABLE tenants DROP COLUMN IF EXISTS industry;

-- Recreate the signup handler without the industry column (otherwise new-user
-- signups would silently fail to provision a tenant, per note above).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
  company_name TEXT;
BEGIN
  company_name := COALESCE(
    NEW.raw_user_meta_data->>'company',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.tenants (
    business_name,
    contact_email,
    phone_number,
    greeting_standard,
    is_active,
    setup_completed
  ) VALUES (
    company_name,
    NEW.email,
    'pending_' || NEW.id::TEXT,
    'Hello, thank you for calling. How may I help you today?',
    TRUE,
    FALSE
  )
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.tenant_members (
    tenant_id,
    user_id,
    role,
    is_active,
    accepted_at
  ) VALUES (
    new_tenant_id,
    NEW.id,
    'owner',
    TRUE,
    NOW()
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  -- Keep the function owned by a superuser/owner so SECURITY DEFINER bypasses RLS
  -- (mirrors 012). Skip if the postgres role is not present (e.g. managed setups
  -- with a different owner name).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
  END IF;
END $$;
