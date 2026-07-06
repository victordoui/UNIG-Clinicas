
ALTER TABLE public.ci_requests
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS assigned_to_secondary uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_reason text;

CREATE INDEX IF NOT EXISTS idx_ci_requests_assigned_to ON public.ci_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ci_requests_status ON public.ci_requests(status);

-- Helper: check if current user has any of given roles in the CI's organization
CREATE OR REPLACE FUNCTION public._ci_user_can_approve(_ci_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ci_requests c
    JOIN public.organization_members m
      ON m.organization_id = c.organization_id AND m.user_id = auth.uid()
    WHERE c.id = _ci_id
      AND m.is_active = true
      AND m.role IN ('admin','gerente')
  );
$$;

CREATE OR REPLACE FUNCTION public._ci_user_can_distribute(_ci_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ci_requests c
    JOIN public.organization_members m
      ON m.organization_id = c.organization_id AND m.user_id = auth.uid()
    WHERE c.id = _ci_id
      AND m.is_active = true
      AND m.role IN ('admin','gerente')
  );
$$;

-- Approve CI
CREATE OR REPLACE FUNCTION public.ci_approve(_id uuid, _comentario text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_from text;
BEGIN
  IF NOT public._ci_user_can_approve(_id) THEN
    RAISE EXCEPTION 'Sem permissão para aprovar esta CI';
  END IF;
  SELECT organization_id, status::text INTO v_org, v_from FROM public.ci_requests WHERE id = _id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'CI não encontrada'; END IF;

  UPDATE public.ci_requests
     SET status = 'aprovada', approved_by = auth.uid(), approved_at = now(), updated_at = now()
   WHERE id = _id;

  INSERT INTO public.ci_status_history (ci_id, organization_id, event_type, from_status, to_status, actor_id, payload)
  VALUES (_id, v_org, 'aprovacao', v_from, 'aprovada', auth.uid(),
          jsonb_build_object('comentario', _comentario));
END;
$$;

-- Reject CI
CREATE OR REPLACE FUNCTION public.ci_reject(_id uuid, _motivo text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_from text;
BEGIN
  IF NOT public._ci_user_can_approve(_id) THEN
    RAISE EXCEPTION 'Sem permissão para reprovar esta CI';
  END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) = 0 THEN
    RAISE EXCEPTION 'Motivo obrigatório';
  END IF;
  SELECT organization_id, status::text INTO v_org, v_from FROM public.ci_requests WHERE id = _id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'CI não encontrada'; END IF;

  UPDATE public.ci_requests
     SET status = 'reprovada', rejected_reason = _motivo, updated_at = now()
   WHERE id = _id;

  INSERT INTO public.ci_status_history (ci_id, organization_id, event_type, from_status, to_status, actor_id, payload)
  VALUES (_id, v_org, 'reprovacao', v_from, 'reprovada', auth.uid(),
          jsonb_build_object('motivo', _motivo));
END;
$$;

-- Assign buyer(s) and move to em_cotacao
CREATE OR REPLACE FUNCTION public.ci_assign_buyer(_id uuid, _buyer_id uuid, _secondary uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_from text;
BEGIN
  IF NOT public._ci_user_can_distribute(_id) THEN
    RAISE EXCEPTION 'Sem permissão para distribuir esta CI';
  END IF;
  IF _buyer_id IS NULL THEN RAISE EXCEPTION 'Comprador obrigatório'; END IF;
  SELECT organization_id, status::text INTO v_org, v_from FROM public.ci_requests WHERE id = _id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'CI não encontrada'; END IF;

  UPDATE public.ci_requests
     SET assigned_to = _buyer_id,
         assigned_to_secondary = _secondary,
         status = CASE WHEN status::text IN ('aprovada','recebida','em_analise') THEN 'em_cotacao'::ci_status ELSE status END,
         updated_at = now()
   WHERE id = _id;

  INSERT INTO public.ci_status_history (ci_id, organization_id, event_type, from_status, to_status, actor_id, payload)
  VALUES (_id, v_org, 'distribuicao', v_from, 'em_cotacao', auth.uid(),
          jsonb_build_object('assigned_to', _buyer_id, 'assigned_to_secondary', _secondary));
END;
$$;
