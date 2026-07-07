
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
  INSERT INTO public.user_roles (user_id, role, unit_id, is_active)
  VALUES (_user_id, _role, _unit_id, true)
  ON CONFLICT (user_id, role) DO UPDATE
    SET is_active = true, unit_id = EXCLUDED.unit_id, updated_at = now()
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;
