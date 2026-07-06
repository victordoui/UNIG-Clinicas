-- Security Fix Migration: Address Critical Vulnerabilities (Fixed)

-- 1. Fix Role-Based Privilege Escalation Vulnerability
-- Remove the dangerous policy that allows users to update their own role
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a secure role update function that only admins can call
-- Using TEXT instead of the enum type for compatibility
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

-- Create new secure profile update policy (excluding role changes)
CREATE POLICY "Users can update own profile except role" ON public.profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  -- Ensure role cannot be changed through direct updates
  (OLD.role = NEW.role OR NEW.role IS NULL)
);

-- 2. Harden Database Functions with Secure Search Path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE 
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

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

-- 3. Secure Session Management - Replace predictable session IDs
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

-- 4. Add audit logging for sensitive operations
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
  public.get_current_user_role()::TEXT = 'admin'
);

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON public.security_audit_log
FOR INSERT WITH CHECK (true);

-- 5. Add session cleanup function with proper security
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

-- 6. Update RLS policies for more restrictive product management
DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;

-- More restrictive product policies
CREATE POLICY "All users can view products" ON public.products
FOR SELECT USING (true);

CREATE POLICY "Gerentes and admins can insert products" ON public.products
FOR INSERT WITH CHECK (
  public.get_current_user_role()::TEXT IN ('admin', 'gerente')
);

CREATE POLICY "Gerentes and admins can update products" ON public.products
FOR UPDATE USING (
  public.get_current_user_role()::TEXT IN ('admin', 'gerente')
);

CREATE POLICY "Only admins can delete products" ON public.products
FOR DELETE USING (
  public.get_current_user_role()::TEXT = 'admin'
);

-- 7. Add function to audit sensitive operations
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