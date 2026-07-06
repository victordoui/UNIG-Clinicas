-- Security Fix Migration: Phase 1 - Critical Fixes

-- 1. First, let's add the audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.security_audit_log
FOR SELECT USING (
  (SELECT role::TEXT FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON public.security_audit_log
FOR INSERT WITH CHECK (true);

-- 2. Create secure role update function
CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id UUID, new_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Validate the new_role parameter
  IF new_role NOT IN ('admin', 'gerente', 'usuario') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  -- Get the current user's role securely
  SELECT role::TEXT INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  
  -- Only admins can update roles
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Only administrators can update user roles';
  END IF;
  
  -- Prevent admins from demoting themselves (at least one admin must remain)
  IF target_user_id = auth.uid() AND new_role != 'admin' THEN
    -- Check if there are other admins
    IF (SELECT COUNT(*) FROM public.profiles WHERE role::TEXT = 'admin' AND id != target_user_id) < 1 THEN
      RAISE EXCEPTION 'Cannot demote the last administrator';
    END IF;
  END IF;
  
  -- Update the role
  UPDATE public.profiles SET role = new_role::user_role, updated_at = now() WHERE id = target_user_id;
  
  -- Log the role change for audit purposes
  INSERT INTO public.alerts (type, title, message, severity, created_by)
  VALUES (
    'role_change',
    'User Role Updated',
    'User role changed to ' || new_role,
    'info',
    auth.uid()
  );
  
  RETURN TRUE;
END;
$$;

-- 3. Harden Database Functions with Secure Search Path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE 
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 4. Generate secure session ID function
CREATE OR REPLACE FUNCTION public.generate_secure_session_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Generate cryptographically secure random session ID
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- 5. Security audit logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, resource_type, resource_id, details
  ) VALUES (
    auth.uid(), p_action, p_resource_type, p_resource_id, p_details
  );
END;
$$;