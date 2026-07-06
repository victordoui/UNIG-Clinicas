-- Security Fix Migration: Phase 2 - RLS Policy Fixes

-- 1. Drop the existing dangerous profile update policy if it exists
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 2. Create a new secure profile update policy that prevents role changes
CREATE POLICY "Users can update own profile except role" ON public.profiles
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
);

-- 3. Add a trigger to prevent direct role updates via normal updates
CREATE OR REPLACE FUNCTION public.prevent_direct_role_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is being changed and it's not through the secure function
  IF OLD.role != NEW.role THEN
    -- Check if this is being called from our secure function
    -- by checking if the current transaction was initiated by an admin
    IF (SELECT role::TEXT FROM public.profiles WHERE id = auth.uid()) != 'admin' THEN
      RAISE EXCEPTION 'Direct role updates are not allowed. Use the secure role update function.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 4. Apply the trigger to the profiles table
DROP TRIGGER IF EXISTS prevent_direct_role_update_trigger ON public.profiles;
CREATE TRIGGER prevent_direct_role_update_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_direct_role_update();

-- 5. Update the cleanup function with proper security
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    -- Clean up sessions older than 1 hour
    DELETE FROM public.active_sessions 
    WHERE last_activity < now() - interval '1 hour';
    
    -- Log cleanup action
    INSERT INTO public.security_audit_log (action, resource_type, details)
    VALUES ('session_cleanup', 'active_sessions', jsonb_build_object('cleaned_at', now()));
END;
$$;

-- 6. Harden remaining functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'usuario'
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;