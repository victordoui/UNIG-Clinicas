CREATE OR REPLACE FUNCTION public.ci_lookup(p_protocol text, p_registration text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ci public.ci_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_ci FROM public.ci_requests WHERE protocol = p_protocol;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
  IF p_registration IS NOT NULL AND v_ci.requester_registration IS NOT NULL
     AND v_ci.requester_registration <> p_registration THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  RETURN jsonb_build_object(
    'found', true,
    'id', v_ci.id,
    'protocol', v_ci.protocol,
    'subject', v_ci.subject,
    'status', v_ci.status,
    'priority', v_ci.priority,
    'channel', v_ci.channel,
    'created_at', v_ci.created_at,
    'updated_at', v_ci.updated_at,
    'requester_name', v_ci.requester_name,
    'requester_role', v_ci.requester_role,
    'requester_sector', v_ci.requester_sector,
    'source_sector', v_ci.source_sector,
    'destination_sector', v_ci.destination_sector,
    'request_type', v_ci.request_type,
    'description', v_ci.description,
    'generated_description', v_ci.generated_description,
    'history', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'event', event_type, 'from', from_status, 'to', to_status, 'at', created_at
      ) ORDER BY created_at), '[]'::jsonb)
      FROM public.ci_status_history WHERE ci_id = v_ci.id
    )
  );
END $$;