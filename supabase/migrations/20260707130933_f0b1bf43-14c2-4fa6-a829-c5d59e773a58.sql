
-- Assign a role to a user (admin only)
CREATE OR REPLACE FUNCTION public.admin_assign_role(_user_id uuid, _role app_role, _unit_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'administrador')) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  INSERT INTO public.user_roles (user_id, role, unit_id, is_active, assigned_by)
  VALUES (_user_id, _role, _unit_id, true, auth.uid())
  ON CONFLICT (user_id, role) DO UPDATE
    SET is_active = true, unit_id = EXCLUDED.unit_id, assigned_by = auth.uid()
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;

-- Revoke a role assignment (admin only)
CREATE OR REPLACE FUNCTION public.admin_revoke_role(_user_role_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'administrador')) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  UPDATE public.user_roles SET is_active = false WHERE id = _user_role_id;
END; $$;

-- Force password reset on next login (admin only)
CREATE OR REPLACE FUNCTION public.admin_set_password_reset(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'administrador')) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  UPDATE public.profiles SET password_change_required = true WHERE id = _user_id;
END; $$;

-- Upsert a system setting (admin only)
CREATE OR REPLACE FUNCTION public.admin_upsert_setting(_key text, _value jsonb, _description text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'administrador')) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  INSERT INTO public.system_settings (key, value, description)
  VALUES (_key, _value, _description)
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        description = COALESCE(EXCLUDED.description, public.system_settings.description),
        updated_at = now();
END; $$;
