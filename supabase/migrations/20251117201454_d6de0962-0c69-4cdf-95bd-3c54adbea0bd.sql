-- ============================================
-- Security Hardening: Anonymous Access Denial & Function Search Path
-- ============================================

-- 1. Add RESTRICTIVE policies to deny anonymous access to sensitive tables
-- This provides defense-in-depth against policy misconfigurations

CREATE POLICY "Deny anonymous access to active_sessions"
ON public.active_sessions
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to security_audit_log"
ON public.security_audit_log
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to organization_members"
ON public.organization_members
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to user_approvals"
ON public.user_approvals
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to user_bans"
ON public.user_bans
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to alert_suppressions"
ON public.alert_suppressions
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 2. Fix function search_path for security definer functions
-- This prevents malicious schema manipulation attacks

-- Update has_role function (if it exists)
-- Note: Creating it with proper search_path if doesn't exist
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = true 
      THEN 'admin'
    WHEN EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND is_active = true 
        AND role = 'organization_admin'
    ) THEN 'admin'
    WHEN EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND is_active = true 
        AND role = 'manager'
    ) THEN 'gerente'
    ELSE 'usuario'
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT organization_id 
  FROM public.organization_members 
  WHERE user_id = auth.uid() 
    AND is_active = true 
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = org_id
      AND role = 'organization_admin'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.check_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.get_organization_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role 
  FROM public.organization_members 
  WHERE user_id = auth.uid() 
    AND is_active = true 
  LIMIT 1;
$$;

-- 3. Comment on security improvements
COMMENT ON POLICY "Deny anonymous access to active_sessions" ON public.active_sessions IS 
  'RESTRICTIVE policy provides defense-in-depth by explicitly denying anonymous access';

COMMENT ON POLICY "Deny anonymous access to security_audit_log" ON public.security_audit_log IS 
  'RESTRICTIVE policy prevents anonymous users from accessing security logs under any circumstance';

-- Security audit log entry
DO $$
BEGIN
  INSERT INTO public.security_audit_log (action, details)
  VALUES (
    'security_hardening_migration',
    jsonb_build_object(
      'timestamp', now(),
      'changes', jsonb_build_array(
        'Added RESTRICTIVE anonymous denial policies',
        'Fixed search_path for security definer functions',
        'Enhanced defense-in-depth protection'
      )
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- If audit log fails, don't fail the migration
  NULL;
END $$;