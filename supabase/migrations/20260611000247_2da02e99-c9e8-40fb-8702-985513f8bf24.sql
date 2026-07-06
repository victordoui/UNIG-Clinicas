CREATE OR REPLACE FUNCTION public._ci_user_can_distribute(_ci_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.ci_requests c
    JOIN public.organization_members m
      ON m.organization_id = c.organization_id AND m.user_id = auth.uid()
    WHERE c.id = _ci_id
      AND m.is_active = true
      AND m.role IN ('admin','gerente','organization_admin','administrador','gestor_aprovador','manager','compras','coordenador_operacoes','gerente_geral')
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true);
$function$;