-- Migration 011: Auto-create tenant on user signup
-- Creates a tenant and links the user as owner when they sign up

-- ============================================================================
-- FUNCTION: Handle new user signup
-- Creates a tenant and tenant_member entry automatically
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
  company_name TEXT;
  user_name TEXT;
BEGIN
  -- Extract metadata from the new user
  company_name := COALESCE(
    NEW.raw_user_meta_data->>'company',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Create a new tenant for this user
  -- Note: industry, phone_number, greeting_standard will be set during onboarding
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
    'pending_' || NEW.id::TEXT,  -- Temporary unique placeholder
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Run on new user creation
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- GRANT: Allow the function to insert into our tables
-- ============================================================================
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT ON public.tenants TO supabase_auth_admin;
GRANT INSERT ON public.tenant_members TO supabase_auth_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;
