CREATE TYPE public.approval_step_type AS ENUM ('unico','paralelo','qualquer_um');
CREATE TYPE public.approval_request_status AS ENUM ('pendente','aprovado','rejeitado','cancelado','escalonado');
CREATE TYPE public.approval_step_status AS ENUM ('aguardando','pendente','aprovado','rejeitado','escalonado','pulado');

CREATE OR REPLACE FUNCTION public.is_admin_or_gerente()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.get_current_user_role() IN ('admin','gerente'); $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.get_current_user_role() = 'admin'; $$;

-- Workflows
CREATE TABLE public.approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  referencia_tipo TEXT NOT NULL CHECK (referencia_tipo IN ('purchase_request','purchase_order')),
  valor_min NUMERIC(14,2) DEFAULT 0,
  valor_max NUMERIC(14,2),
  categoria TEXT,
  cost_center_id UUID,
  prioridade INTEGER NOT NULL DEFAULT 100,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apwf_select" ON public.approval_workflows FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY "apwf_admin" ON public.approval_workflows FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.is_admin())
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.is_admin());
CREATE TRIGGER trg_apwf_uat BEFORE UPDATE ON public.approval_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Workflow steps
CREATE TABLE public.approval_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  nome TEXT NOT NULL,
  tipo public.approval_step_type NOT NULL DEFAULT 'unico',
  aprovador_user_id UUID,
  aprovador_papel TEXT,
  valor_min NUMERIC(14,2) DEFAULT 0,
  sla_horas INTEGER DEFAULT 48,
  escalona_para UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.approval_workflow_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apwfs_select" ON public.approval_workflow_steps FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.approval_workflows w WHERE w.id = workflow_id AND w.organization_id = public.get_user_organization_id()));
CREATE POLICY "apwfs_admin" ON public.approval_workflow_steps FOR ALL TO authenticated
  USING (public.is_admin() AND EXISTS (SELECT 1 FROM public.approval_workflows w WHERE w.id = workflow_id AND w.organization_id = public.get_user_organization_id()))
  WITH CHECK (public.is_admin() AND EXISTS (SELECT 1 FROM public.approval_workflows w WHERE w.id = workflow_id AND w.organization_id = public.get_user_organization_id()));
CREATE INDEX idx_apwfs_workflow ON public.approval_workflow_steps(workflow_id, ordem);

-- Delegations
CREATE TABLE public.approval_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  origem_user_id UUID NOT NULL,
  destino_user_id UUID NOT NULL,
  vigencia_inicio DATE NOT NULL,
  vigencia_fim DATE NOT NULL,
  motivo TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (vigencia_fim >= vigencia_inicio)
);
ALTER TABLE public.approval_delegations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apdeleg_select" ON public.approval_delegations FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id()
    AND (origem_user_id = auth.uid() OR destino_user_id = auth.uid() OR public.is_admin()));
CREATE POLICY "apdeleg_insert" ON public.approval_delegations FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id()
    AND (origem_user_id = auth.uid() OR public.is_admin()));
CREATE POLICY "apdeleg_update" ON public.approval_delegations FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id()
    AND (origem_user_id = auth.uid() OR public.is_admin()));
CREATE POLICY "apdeleg_delete" ON public.approval_delegations FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id()
    AND (origem_user_id = auth.uid() OR public.is_admin()));
CREATE TRIGGER trg_apdeleg_uat BEFORE UPDATE ON public.approval_delegations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Requests
CREATE TABLE public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  workflow_id UUID REFERENCES public.approval_workflows(id),
  workflow_snapshot JSONB,
  referencia_tipo TEXT NOT NULL CHECK (referencia_tipo IN ('purchase_request','purchase_order')),
  referencia_id UUID NOT NULL,
  valor NUMERIC(14,2),
  status public.approval_request_status NOT NULL DEFAULT 'pendente',
  etapa_atual INTEGER NOT NULL DEFAULT 1,
  solicitante_user_id UUID,
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_apreq_ref ON public.approval_requests(referencia_tipo, referencia_id);
CREATE INDEX idx_apreq_status ON public.approval_requests(organization_id, status);
CREATE TRIGGER trg_apreq_uat BEFORE UPDATE ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Request steps
CREATE TABLE public.approval_request_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  nome TEXT NOT NULL,
  tipo public.approval_step_type NOT NULL DEFAULT 'unico',
  aprovador_user_id UUID,
  aprovador_papel TEXT,
  status public.approval_step_status NOT NULL DEFAULT 'aguardando',
  decidido_por UUID,
  decidido_em TIMESTAMPTZ,
  comentario TEXT,
  prazo_em TIMESTAMPTZ,
  escalona_para UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.approval_request_steps ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_apreqs_request ON public.approval_request_steps(request_id, ordem);
CREATE INDEX idx_apreqs_aprov ON public.approval_request_steps(aprovador_user_id, status);
CREATE TRIGGER trg_apreqs_uat BEFORE UPDATE ON public.approval_request_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.user_can_decide_step(_step_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.approval_request_steps s
    LEFT JOIN public.approval_delegations d
      ON d.destino_user_id = _user_id AND d.ativo
     AND CURRENT_DATE BETWEEN d.vigencia_inicio AND d.vigencia_fim
     AND d.origem_user_id = s.aprovador_user_id
    WHERE s.id = _step_id AND s.status = 'pendente'
      AND (
        s.aprovador_user_id = _user_id
        OR d.id IS NOT NULL
        OR (s.aprovador_papel IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.user_id = _user_id AND om.is_active AND om.role::text = s.aprovador_papel
        ))
      )
  );
$$;

CREATE POLICY "apreq_select" ON public.approval_requests FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id() AND (
      public.is_admin_or_gerente()
      OR solicitante_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.approval_request_steps s
        WHERE s.request_id = approval_requests.id
          AND (s.aprovador_user_id = auth.uid() OR s.decidido_por = auth.uid()
               OR (s.aprovador_papel IS NOT NULL AND EXISTS (
                 SELECT 1 FROM public.organization_members om
                 WHERE om.user_id = auth.uid() AND om.is_active AND om.role::text = s.aprovador_papel
               )))
      )
    )
  );
CREATE POLICY "apreq_insert" ON public.approval_requests FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "apreq_update" ON public.approval_requests FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.is_admin_or_gerente());

CREATE POLICY "apreqs_select" ON public.approval_request_steps FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.approval_requests r WHERE r.id = request_id AND r.organization_id = public.get_user_organization_id()));
CREATE POLICY "apreqs_update" ON public.approval_request_steps FOR UPDATE TO authenticated
  USING (public.user_can_decide_step(id, auth.uid()) OR public.is_admin());

CREATE OR REPLACE FUNCTION public.start_approval_request(
  _referencia_tipo TEXT, _referencia_id UUID,
  _valor NUMERIC DEFAULT NULL, _categoria TEXT DEFAULT NULL, _cost_center_id UUID DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _org UUID := public.get_user_organization_id();
  _wf RECORD; _req_id UUID; _step RECORD; _aprov UUID;
BEGIN
  SELECT * INTO _wf FROM public.approval_workflows
  WHERE organization_id = _org AND ativo AND referencia_tipo = _referencia_tipo
    AND COALESCE(_valor,0) >= COALESCE(valor_min,0)
    AND (valor_max IS NULL OR COALESCE(_valor,0) <= valor_max)
    AND (categoria IS NULL OR categoria = _categoria)
    AND (cost_center_id IS NULL OR cost_center_id = _cost_center_id)
  ORDER BY prioridade ASC, created_at ASC LIMIT 1;
  IF _wf.id IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.approval_requests (
    organization_id, workflow_id, referencia_tipo, referencia_id, valor,
    solicitante_user_id, workflow_snapshot
  ) VALUES (
    _org, _wf.id, _referencia_tipo, _referencia_id, _valor, auth.uid(),
    (SELECT jsonb_build_object('workflow', row_to_json(_wf),
            'steps', COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.ordem), '[]'::jsonb))
     FROM public.approval_workflow_steps s WHERE s.workflow_id = _wf.id)
  ) RETURNING id INTO _req_id;

  FOR _step IN SELECT * FROM public.approval_workflow_steps WHERE workflow_id = _wf.id ORDER BY ordem ASC
  LOOP
    _aprov := _step.aprovador_user_id;
    IF _aprov IS NOT NULL THEN
      SELECT destino_user_id INTO _aprov FROM public.approval_delegations
      WHERE origem_user_id = _step.aprovador_user_id AND ativo
        AND CURRENT_DATE BETWEEN vigencia_inicio AND vigencia_fim
      ORDER BY created_at DESC LIMIT 1;
      IF _aprov IS NULL THEN _aprov := _step.aprovador_user_id; END IF;
    END IF;

    INSERT INTO public.approval_request_steps (
      request_id, ordem, nome, tipo, aprovador_user_id, aprovador_papel,
      status, prazo_em, escalona_para
    ) VALUES (
      _req_id, _step.ordem, _step.nome, _step.tipo, _aprov, _step.aprovador_papel,
      CASE WHEN _step.ordem = 1 THEN 'pendente'::approval_step_status ELSE 'aguardando'::approval_step_status END,
      CASE WHEN _step.ordem = 1 THEN now() + (COALESCE(_step.sla_horas,48) || ' hours')::interval ELSE NULL END,
      _step.escalona_para
    );
  END LOOP;
  RETURN _req_id;
END; $$;

CREATE OR REPLACE FUNCTION public.decide_approval_step(
  _step_id UUID, _decisao TEXT, _comentario TEXT DEFAULT NULL
) RETURNS public.approval_request_status
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _step RECORD; _req RECORD; _next_ordem INTEGER; _all_done BOOLEAN;
BEGIN
  IF _decisao NOT IN ('aprovado','rejeitado') THEN RAISE EXCEPTION 'Decisão inválida'; END IF;
  IF _decisao = 'rejeitado' AND (_comentario IS NULL OR length(trim(_comentario)) < 3) THEN
    RAISE EXCEPTION 'Comentário obrigatório para rejeição';
  END IF;
  SELECT * INTO _step FROM public.approval_request_steps WHERE id = _step_id FOR UPDATE;
  IF _step.id IS NULL THEN RAISE EXCEPTION 'Etapa não encontrada'; END IF;
  IF _step.status <> 'pendente' THEN RAISE EXCEPTION 'Etapa não está pendente'; END IF;
  IF NOT public.user_can_decide_step(_step_id, auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para decidir esta etapa';
  END IF;

  UPDATE public.approval_request_steps
  SET status = _decisao::approval_step_status, decidido_por = auth.uid(),
      decidido_em = now(), comentario = _comentario
  WHERE id = _step_id;

  SELECT * INTO _req FROM public.approval_requests WHERE id = _step.request_id FOR UPDATE;

  IF _decisao = 'rejeitado' THEN
    UPDATE public.approval_requests SET status = 'rejeitado', concluido_em = now() WHERE id = _req.id;
    RETURN 'rejeitado'::approval_request_status;
  END IF;

  SELECT bool_and(status IN ('aprovado','pulado')) INTO _all_done
  FROM public.approval_request_steps WHERE request_id = _req.id AND ordem = _step.ordem;
  IF NOT _all_done THEN RETURN 'pendente'::approval_request_status; END IF;

  SELECT MIN(ordem) INTO _next_ordem FROM public.approval_request_steps
  WHERE request_id = _req.id AND ordem > _step.ordem AND status = 'aguardando';

  IF _next_ordem IS NULL THEN
    UPDATE public.approval_requests SET status = 'aprovado', concluido_em = now(), etapa_atual = _step.ordem WHERE id = _req.id;
    RETURN 'aprovado'::approval_request_status;
  END IF;

  UPDATE public.approval_request_steps s
  SET status = 'pendente'::approval_step_status, prazo_em = now() + interval '48 hours'
  WHERE s.request_id = _req.id AND s.ordem = _next_ordem;

  UPDATE public.approval_requests SET etapa_atual = _next_ordem WHERE id = _req.id;
  RETURN 'pendente'::approval_request_status;
END; $$;