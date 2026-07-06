-- Create enum for application roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'org_admin', 'manager', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Migrate existing super admins to user_roles table
INSERT INTO public.user_roles (user_id, role, granted_at)
SELECT id, 'super_admin'::app_role, created_at
FROM public.profiles
WHERE is_super_admin = true
ON CONFLICT (user_id, role) DO NOTHING;

-- Add RLS policy to prevent is_super_admin insertion via regular inserts
CREATE POLICY "Prevent super admin field in inserts"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin = false OR is_super_admin IS NULL);

-- RLS policies for user_roles table
CREATE POLICY "Super admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Only super admins can grant roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Only super admins can revoke roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- Update is_super_admin function to use user_roles table
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT has_role(auth.uid(), 'super_admin');
$$;

-- Update check_is_super_admin function
CREATE OR REPLACE FUNCTION public.check_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT has_role(auth.uid(), 'super_admin');
$$;