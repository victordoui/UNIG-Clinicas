
-- Approval chain table
CREATE TABLE public.purchase_request_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  ordem int NOT NULL,
  papel_aprovador text NOT NULL CHECK (papel_aprovador IN ('compras','gestor_aprovador','administrador')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','reprovada','pulada')),
  aprovador_id uuid,
  comentario text,
  decidido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pra_request ON public.purchase_request_approvals(request_id, ordem);

ALTER TABLE public.purchase_request_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view approvals" ON public.purchase_request_approvals
  FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

-- No direct INSERT/UPDATE/DELETE policies — only via security definer functions

CREATE TRIGGER trg_pra_updated BEFORE UPDATE ON public.purchase_request_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- History/timeline table
CREATE TABLE public.purchase_request_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  actor_id uuid,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prh_request ON public.purchase_request_history(request_id, created_at DESC);

ALTER TABLE public.purchase_request_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view history" ON public.purchase_request_history
  FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

-- Generate approval chain based on approval_thresholds
CREATE OR REPLACE FUNCTION public.generate_approval_chain(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.purchase_requests%ROWTYPE;
  v_threshold RECORD;
  v_ordem int := 1;
  v_value numeric;
  v_count int := 0;
BEGIN
  SELECT * INTO v_request FROM public.purchase_requests WHERE id = _request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;

  -- Clear any previous chain
  DELETE FROM public.purchase_request_approvals WHERE request_id = _request_id;

  v_value := COALESCE(v_request.valor_estimado, 0);

  FOR v_threshold IN
    SELECT papel_aprovador, ordem
    FROM public.approval_thresholds
    WHERE organization_id = v_request.organization_id
      AND v_value >= valor_min
      AND (valor_max IS NULL OR v_value <= valor_max)
    ORDER BY ordem ASC
  LOOP
    INSERT INTO public.purchase_request_approvals (
      request_id, organization_id, ordem, papel_aprovador, status
    ) VALUES (
      _request_id, v_request.organization_id, v_ordem, v_threshold.papel_aprovador, 'pendente'
    );
    v_ordem := v_ordem + 1;
    v_count := v_count + 1;
  END LOOP;

  -- Fallback: if no thresholds match, require administrador
  IF v_count = 0 THEN
    INSERT INTO public.purchase_request_approvals (
      request_id, organization_id, ordem, papel_aprovador, status
    ) VALUES (
      _request_id, v_request.organization_id, 1, 'administrador', 'pendente'
    );
  END IF;
END;
$$;

-- Decide on the current pending approval step
CREATE OR REPLACE FUNCTION public.decide_approval(
  _request_id uuid,
  _decision text,
  _comentario text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_step public.purchase_request_approvals%ROWTYPE;
  v_request public.purchase_requests%ROWTYPE;
  v_user_unig text;
  v_remaining int;
  v_new_status purchase_status;
BEGIN
  IF _decision NOT IN ('aprovada','reprovada') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;

  SELECT * INTO v_request FROM public.purchase_requests WHERE id = _request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_request.organization_id <> get_user_organization_id() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_step
  FROM public.purchase_request_approvals
  WHERE request_id = _request_id AND status = 'pendente'
  ORDER BY ordem ASC LIMIT 1;

  IF NOT FOUND THEN RAISE EXCEPTION 'No pending approval step'; END IF;

  v_user_unig := get_user_unig_role();

  -- super_admin and administrador can act on any role; others must match
  IF v_user_unig NOT IN ('super_admin','administrador') AND v_user_unig <> v_step.papel_aprovador THEN
    RAISE EXCEPTION 'You do not have permission to decide this step';
  END IF;

  UPDATE public.purchase_request_approvals
  SET status = _decision,
      aprovador_id = auth.uid(),
      comentario = _comentario,
      decidido_em = now()
  WHERE id = v_step.id;

  IF _decision = 'reprovada' THEN
    v_new_status := 'reprovada'::purchase_status;
    UPDATE public.purchase_requests SET status = v_new_status, updated_at = now() WHERE id = _request_id;

    INSERT INTO public.purchase_request_history (request_id, organization_id, actor_id, event_type, from_status, to_status, payload)
    VALUES (_request_id, v_request.organization_id, auth.uid(), 'reprovada', v_request.status::text, v_new_status::text,
            jsonb_build_object('step_id', v_step.id, 'papel', v_step.papel_aprovador, 'comentario', _comentario));
  ELSE
    SELECT count(*) INTO v_remaining
    FROM public.purchase_request_approvals
    WHERE request_id = _request_id AND status = 'pendente';

    IF v_remaining = 0 THEN
      v_new_status := 'aprovada'::purchase_status;
      UPDATE public.purchase_requests SET status = v_new_status, updated_at = now() WHERE id = _request_id;

      INSERT INTO public.purchase_request_history (request_id, organization_id, actor_id, event_type, from_status, to_status, payload)
      VALUES (_request_id, v_request.organization_id, auth.uid(), 'aprovada', v_request.status::text, v_new_status::text,
              jsonb_build_object('step_id', v_step.id, 'papel', v_step.papel_aprovador, 'comentario', _comentario));
    ELSE
      INSERT INTO public.purchase_request_history (request_id, organization_id, actor_id, event_type, from_status, to_status, payload)
      VALUES (_request_id, v_request.organization_id, auth.uid(), 'etapa_aprovada', v_request.status::text, v_request.status::text,
              jsonb_build_object('step_id', v_step.id, 'papel', v_step.papel_aprovador, 'comentario', _comentario));
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'remaining', COALESCE(v_remaining, 0));
END;
$$;

-- Submit request for approval (status -> aguardando_aprovacao + generate chain)
CREATE OR REPLACE FUNCTION public.submit_purchase_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.purchase_requests%ROWTYPE;
  v_unig text;
BEGIN
  SELECT * INTO v_request FROM public.purchase_requests WHERE id = _request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_request.organization_id <> get_user_organization_id() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_unig := get_user_unig_role();
  IF v_request.solicitante_id <> auth.uid()
     AND v_unig NOT IN ('super_admin','administrador','compras') THEN
    RAISE EXCEPTION 'Not allowed to submit this request';
  END IF;

  IF v_request.status NOT IN ('nova'::purchase_status, 'em_analise'::purchase_status) THEN
    RAISE EXCEPTION 'Request is not in a submittable state';
  END IF;

  PERFORM public.generate_approval_chain(_request_id);

  UPDATE public.purchase_requests
  SET status = 'aguardando_aprovacao'::purchase_status, updated_at = now()
  WHERE id = _request_id;

  INSERT INTO public.purchase_request_history (request_id, organization_id, actor_id, event_type, from_status, to_status)
  VALUES (_request_id, v_request.organization_id, auth.uid(), 'enviada_aprovacao', v_request.status::text, 'aguardando_aprovacao');
END;
$$;

-- Trigger to log status changes
CREATE OR REPLACE FUNCTION public.log_purchase_request_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.purchase_request_history (request_id, organization_id, actor_id, event_type, to_status)
    VALUES (NEW.id, NEW.organization_id, NEW.solicitante_id, 'criada', NEW.status::text);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.purchase_request_history (request_id, organization_id, actor_id, event_type, from_status, to_status)
      VALUES (NEW.id, NEW.organization_id, auth.uid(), 'status_alterado', OLD.status::text, NEW.status::text);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_purchase_request_log
AFTER INSERT OR UPDATE ON public.purchase_requests
FOR EACH ROW EXECUTE FUNCTION public.log_purchase_request_change();
