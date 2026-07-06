-- Create user bans table for managing temporary and permanent bans
CREATE TABLE public.user_bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  user_id UUID,
  ban_type TEXT NOT NULL CHECK (ban_type IN ('temporary', 'permanent')),
  ban_days INTEGER,
  banned_until TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  banned_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on user_bans table
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

-- Create policies for user_bans table
CREATE POLICY "Admins can manage user bans" ON public.user_bans
FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "All authenticated users can view active bans for email verification" ON public.user_bans
FOR SELECT USING (
  auth.uid() IS NOT NULL AND is_active = true
);

-- Create function to check if email is banned
CREATE OR REPLACE FUNCTION public.is_email_banned(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Check for active permanent bans
  IF EXISTS (
    SELECT 1 FROM public.user_bans 
    WHERE email = p_email 
    AND ban_type = 'permanent' 
    AND is_active = true
  ) THEN
    RETURN true;
  END IF;

  -- Check for active temporary bans that haven't expired
  IF EXISTS (
    SELECT 1 FROM public.user_bans 
    WHERE email = p_email 
    AND ban_type = 'temporary' 
    AND is_active = true
    AND banned_until > now()
  ) THEN
    RETURN true;
  END IF;

  -- Deactivate expired temporary bans
  UPDATE public.user_bans 
  SET is_active = false 
  WHERE email = p_email 
  AND ban_type = 'temporary' 
  AND is_active = true
  AND banned_until <= now();

  RETURN false;
END;
$$;

-- Create function to ban user
CREATE OR REPLACE FUNCTION public.ban_user(
  p_user_id uuid,
  p_email text,
  p_ban_type text,
  p_ban_days integer DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  current_user_role TEXT;
  banned_until_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check if current user is admin
  SELECT role::TEXT INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Only administrators can ban users';
  END IF;

  -- Validate ban_type
  IF p_ban_type NOT IN ('temporary', 'permanent') THEN
    RAISE EXCEPTION 'Invalid ban type: %', p_ban_type;
  END IF;

  -- For temporary bans, calculate banned_until date
  IF p_ban_type = 'temporary' THEN
    IF p_ban_days IS NULL OR p_ban_days < 0 OR p_ban_days > 999 THEN
      RAISE EXCEPTION 'Temporary bans require ban_days between 0 and 999';
    END IF;
    banned_until_date := now() + (p_ban_days || ' days')::interval;
  END IF;

  -- Deactivate any existing bans for this email
  UPDATE public.user_bans 
  SET is_active = false 
  WHERE email = p_email;

  -- Insert new ban record
  INSERT INTO public.user_bans (
    email, user_id, ban_type, ban_days, banned_until, reason, banned_by
  ) VALUES (
    p_email, p_user_id, p_ban_type, p_ban_days, banned_until_date, p_reason, auth.uid()
  );

  -- If user exists in profiles, remove them
  IF p_user_id IS NOT NULL THEN
    DELETE FROM public.profiles WHERE id = p_user_id;
  END IF;

  -- Log security event
  INSERT INTO public.security_audit_log (
    user_id, action, resource_type, resource_id, details
  ) VALUES (
    auth.uid(), 
    'user_ban', 
    'user_profile', 
    p_user_id::text,
    jsonb_build_object(
      'banned_email', p_email,
      'ban_type', p_ban_type,
      'ban_days', p_ban_days,
      'reason', p_reason
    )
  );

  RETURN true;
END;
$$;

-- Create function to remove user access (soft ban)
CREATE OR REPLACE FUNCTION public.remove_user_access(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  current_user_role TEXT;
  user_email TEXT;
BEGIN
  -- Check if current user is admin
  SELECT role::TEXT INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Only administrators can remove user access';
  END IF;

  -- Get user email for logging
  SELECT email INTO user_email FROM public.profiles WHERE id = p_user_id;

  -- Remove user from profiles table
  DELETE FROM public.profiles WHERE id = p_user_id;

  -- Log security event
  INSERT INTO public.security_audit_log (
    user_id, action, resource_type, resource_id, details
  ) VALUES (
    auth.uid(), 
    'user_access_removed', 
    'user_profile', 
    p_user_id::text,
    jsonb_build_object('removed_email', user_email)
  );

  RETURN true;
END;
$$;