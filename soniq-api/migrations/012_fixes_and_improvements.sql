-- Migration 012: Fixes and Improvements
-- Consolidates fixes for issues found in migrations 001-011
-- Run this in Supabase SQL Editor

-- ============================================================================
-- PART 1: Add missing columns to tenants table
-- ============================================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN tenants.contact_email IS 'Primary contact email for the tenant';
COMMENT ON COLUMN tenants.setup_completed IS 'Whether onboarding setup is complete';

-- ============================================================================
-- PART 2: Fix voicemails trigger (references wrong function name)
-- Only runs if voicemails table exists
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voicemails') THEN
    DROP TRIGGER IF EXISTS update_voicemails_updated_at ON voicemails;
    CREATE TRIGGER update_voicemails_updated_at
        BEFORE UPDATE ON voicemails
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ============================================================================
-- PART 3: Add composite index for RLS performance
-- ============================================================================

DROP INDEX IF EXISTS idx_tenant_members_user_tenant_active;
CREATE INDEX idx_tenant_members_user_tenant_active
    ON tenant_members(user_id, tenant_id)
    WHERE is_active = TRUE;

-- ============================================================================
-- PART 4: Fix handle_new_user to bypass RLS properly
-- The function needs to set the owner to postgres and grant execute
-- ============================================================================

-- Recreate with explicit search_path for security
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
  company_name TEXT;
BEGIN
  -- Extract metadata from the new user
  company_name := COALESCE(
    NEW.raw_user_meta_data->>'company',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Create a new tenant for this user
  INSERT INTO public.tenants (
    business_name,
    contact_email,
    industry,
    phone_number,
    greeting_standard,
    is_active,
    setup_completed
  ) VALUES (
    company_name,
    NEW.email,
    'pending_setup',
    'pending_' || NEW.id::TEXT,
    'Hello, thank you for calling. How may I help you today?',
    TRUE,
    FALSE
  )
  RETURNING id INTO new_tenant_id;

  -- Link the user to the tenant as owner
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
    -- Log error but don't fail user creation
    RAISE WARNING 'handle_new_user failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure function is owned by postgres (bypasses RLS)
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- ============================================================================
-- PART 5: Standardize RLS policies - Add service_role bypass for all tables
-- ============================================================================

-- Helper: Drop policy if exists (Supabase doesn't have IF EXISTS for policies)
DO $$
BEGIN
  -- Tenants
  DROP POLICY IF EXISTS service_role_all_tenants ON tenants;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY service_role_all_tenants ON tenants
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Tenant Members
DO $$ BEGIN DROP POLICY IF EXISTS service_role_all_tenant_members ON tenant_members; EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY service_role_all_tenant_members ON tenant_members
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Calls
DO $$ BEGIN DROP POLICY IF EXISTS service_role_all_calls ON calls; EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY service_role_all_calls ON calls
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Bookings
DO $$ BEGIN DROP POLICY IF EXISTS service_role_all_bookings ON bookings; EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY service_role_all_bookings ON bookings
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Voicemails (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voicemails') THEN
    BEGIN DROP POLICY IF EXISTS service_role_all_voicemails ON voicemails; EXCEPTION WHEN undefined_object THEN NULL; END;
    CREATE POLICY service_role_all_voicemails ON voicemails FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Conversation Logs (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_logs') THEN
    BEGIN DROP POLICY IF EXISTS service_role_all_conversation_logs ON conversation_logs; EXCEPTION WHEN undefined_object THEN NULL; END;
    CREATE POLICY service_role_all_conversation_logs ON conversation_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- PART 6: Fix voicemails RLS to use tenant_members pattern (only if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voicemails') THEN
    -- Drop old session-based policies
    BEGIN DROP POLICY IF EXISTS "Tenants can view own voicemails" ON voicemails; EXCEPTION WHEN undefined_object THEN NULL; END;
    BEGIN DROP POLICY IF EXISTS "Tenants can insert own voicemails" ON voicemails; EXCEPTION WHEN undefined_object THEN NULL; END;
    BEGIN DROP POLICY IF EXISTS "Tenants can update own voicemails" ON voicemails; EXCEPTION WHEN undefined_object THEN NULL; END;
    BEGIN DROP POLICY IF EXISTS voicemails_tenant_access ON voicemails; EXCEPTION WHEN undefined_object THEN NULL; END;

    -- Add tenant_members-based policies
    CREATE POLICY voicemails_tenant_access ON voicemails
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM tenant_members tm
          WHERE tm.tenant_id = voicemails.tenant_id
            AND tm.user_id = auth.uid()
            AND tm.is_active = TRUE
        )
      );
  END IF;
END $$;

-- ============================================================================
-- PART 7: Fix conversation_logs RLS to use tenant_members pattern (only if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_logs') THEN
    BEGIN DROP POLICY IF EXISTS "Tenants can view own logs" ON conversation_logs; EXCEPTION WHEN undefined_object THEN NULL; END;
    BEGIN DROP POLICY IF EXISTS "Service role can manage all" ON conversation_logs; EXCEPTION WHEN undefined_object THEN NULL; END;
    BEGIN DROP POLICY IF EXISTS conversation_logs_tenant_access ON conversation_logs; EXCEPTION WHEN undefined_object THEN NULL; END;

    CREATE POLICY conversation_logs_tenant_access ON conversation_logs
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM tenant_members tm
          WHERE tm.tenant_id = conversation_logs.tenant_id
            AND tm.user_id = auth.uid()
            AND tm.is_active = TRUE
        )
      );
  END IF;
END $$;

-- ============================================================================
-- PART 8: Add user-facing RLS policies for CRM tables (only if they exist)
-- ============================================================================

DO $$
DECLARE
  policy_sql TEXT;
BEGIN
  -- Contact Notes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_notes') THEN
    BEGIN DROP POLICY IF EXISTS contact_notes_tenant_access ON contact_notes; EXCEPTION WHEN undefined_object THEN NULL; END;
    CREATE POLICY contact_notes_tenant_access ON contact_notes FOR ALL
      USING (EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = contact_notes.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = TRUE));
  END IF;

  -- Contact Activity
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_activity') THEN
    BEGIN DROP POLICY IF EXISTS contact_activity_tenant_access ON contact_activity; EXCEPTION WHEN undefined_object THEN NULL; END;
    CREATE POLICY contact_activity_tenant_access ON contact_activity FOR ALL
      USING (EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = contact_activity.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = TRUE));
  END IF;

  -- Resources
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resources') THEN
    BEGIN DROP POLICY IF EXISTS resources_tenant_access ON resources; EXCEPTION WHEN undefined_object THEN NULL; END;
    CREATE POLICY resources_tenant_access ON resources FOR ALL
      USING (EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = resources.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = TRUE));
  END IF;

  -- Availability Templates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'availability_templates') THEN
    BEGIN DROP POLICY IF EXISTS availability_templates_tenant_access ON availability_templates; EXCEPTION WHEN undefined_object THEN NULL; END;
    CREATE POLICY availability_templates_tenant_access ON availability_templates FOR ALL
      USING (EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = availability_templates.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = TRUE));
  END IF;

  -- Availability Slots
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'availability_slots') THEN
    BEGIN DROP POLICY IF EXISTS availability_slots_tenant_access ON availability_slots; EXCEPTION WHEN undefined_object THEN NULL; END;
    CREATE POLICY availability_slots_tenant_access ON availability_slots FOR ALL
      USING (EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = availability_slots.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = TRUE));
  END IF;

  -- Notifications
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    BEGIN DROP POLICY IF EXISTS notifications_tenant_access ON notifications; EXCEPTION WHEN undefined_object THEN NULL; END;
    CREATE POLICY notifications_tenant_access ON notifications FOR ALL
      USING (EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = notifications.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = TRUE));
  END IF;

  -- Notification Templates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_templates') THEN
    BEGIN DROP POLICY IF EXISTS notification_templates_tenant_access ON notification_templates; EXCEPTION WHEN undefined_object THEN NULL; END;
    CREATE POLICY notification_templates_tenant_access ON notification_templates FOR ALL
      USING (EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = notification_templates.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = TRUE));
  END IF;

  -- Notification Preferences
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
    BEGIN DROP POLICY IF EXISTS notification_preferences_tenant_access ON notification_preferences; EXCEPTION WHEN undefined_object THEN NULL; END;
    CREATE POLICY notification_preferences_tenant_access ON notification_preferences FOR ALL
      USING (EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = notification_preferences.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = TRUE));
  END IF;

  -- Audit Logs (read-only for users)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    BEGIN DROP POLICY IF EXISTS audit_logs_tenant_select ON audit_logs; EXCEPTION WHEN undefined_object THEN NULL; END;
    CREATE POLICY audit_logs_tenant_select ON audit_logs FOR SELECT
      USING (EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = audit_logs.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = TRUE));
  END IF;
END $$;

-- ============================================================================
-- PART 9: Grant permissions for auth trigger
-- ============================================================================

-- Ensure supabase_auth_admin can execute the trigger function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- Grant sequence usage (for UUID generation if needed)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT ON public.tenants TO supabase_auth_admin;
GRANT INSERT ON public.tenant_members TO supabase_auth_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;

-- ============================================================================
-- PART 10: Seed notification templates for new tenants automatically
-- Only if seed_notification_templates function exists (from 002_crm_schema.sql)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'seed_notification_templates') THEN
    -- Add trigger to seed templates when tenant is created
    CREATE OR REPLACE FUNCTION public.seed_tenant_defaults()
    RETURNS TRIGGER AS $func$
    BEGIN
      PERFORM seed_notification_templates(NEW.id);
      RETURN NEW;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'seed_tenant_defaults failed: %', SQLERRM;
        RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

    DROP TRIGGER IF EXISTS trigger_seed_tenant_defaults ON tenants;
    CREATE TRIGGER trigger_seed_tenant_defaults
      AFTER INSERT ON tenants
      FOR EACH ROW
      EXECUTE FUNCTION public.seed_tenant_defaults();
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION: Test the signup flow
-- ============================================================================

-- You can test manually with:
-- SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates tenant and membership when user signs up';

-- Comment on seed_tenant_defaults only if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'seed_tenant_defaults') THEN
    COMMENT ON FUNCTION public.seed_tenant_defaults() IS 'Seeds default data for new tenants';
  END IF;
END $$;
