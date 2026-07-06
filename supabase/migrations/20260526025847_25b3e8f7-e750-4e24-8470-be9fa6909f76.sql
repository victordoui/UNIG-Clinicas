
CREATE OR REPLACE FUNCTION public.submit_ci(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_id uuid;
  v_protocol text;
  v_priority public.ci_priority;
  v_desc text;
  v_created_by uuid;
BEGIN
  v_org := COALESCE(
    (payload->>'organization_id')::uuid,
    public.get_user_organization_id(),
    (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
  );
  IF v_org IS NULL THEN RAISE EXCEPTION 'No organization configured'; END IF;

  v_priority := COALESCE((payload->>'priority')::public.ci_priority, 'media');
  v_desc := COALESCE(payload->>'description','');

  IF v_priority = 'media' AND (
    v_desc ~* '\m(mec|visita|urgência|urgencia|auditoria)\M'
    OR COALESCE(payload->>'subject','') ~* '\m(mec|visita|urgência|urgencia|auditoria)\M'
  ) THEN
    v_priority := 'alta';
  END IF;

  -- Garante vínculo com o solicitante: usa o payload, caindo para auth.uid()
  v_created_by := COALESCE(NULLIF(payload->>'created_by','')::uuid, auth.uid());

  INSERT INTO public.ci_requests (
    organization_id, channel,
    requester_name, requester_registration, requester_role, requester_sector, requester_whatsapp, requester_email,
    source_sector, destination_sector, request_type,
    subject, description, generated_description, priority,
    created_by
  ) VALUES (
    v_org,
    COALESCE((payload->>'channel')::public.ci_channel, 'formulario'),
    payload->>'requester_name',
    payload->>'requester_registration',
    payload->>'requester_role',
    payload->>'requester_sector',
    payload->>'requester_whatsapp',
    payload->>'requester_email',
    payload->>'source_sector',
    payload->>'destination_sector',
    payload->>'request_type',
    payload->>'subject',
    v_desc,
    payload->>'generated_description',
    v_priority,
    v_created_by
  ) RETURNING id, protocol INTO v_id, v_protocol;

  RETURN jsonb_build_object('id', v_id, 'protocol', v_protocol);
END $function$;

-- Backfill: associa CIs antigas sem created_by ao perfil pelo e-mail do solicitante
UPDATE public.ci_requests ci
SET created_by = p.id
FROM public.profiles p
WHERE ci.created_by IS NULL
  AND ci.requester_email IS NOT NULL
  AND lower(p.email) = lower(ci.requester_email);
