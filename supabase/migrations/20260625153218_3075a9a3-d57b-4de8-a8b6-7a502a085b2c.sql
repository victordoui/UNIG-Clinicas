
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.operational_demand_status AS ENUM (
  'rascunho','registrada','em_analise','em_planejamento',
  'aguardando_aprovacao','aguardando_orcamento','aguardando_compra',
  'aguardando_equipe','aguardando_fornecedor','em_execucao',
  'pausada','concluida','cancelada'
);

CREATE TYPE public.operational_demand_priority AS ENUM ('baixa','media','alta','urgente');

CREATE TYPE public.operational_demand_type AS ENUM (
  'projeto_operacional','demanda_administrativa','melhoria_unidade',
  'reforma_adequacao','manutencao_planejada','apoio_evento',
  'implantacao_processo','organizacao_ambiente','compra_operacao',
  'ajuste_estrutural','solicitacao_estrategica','outro'
);

-- ============================================================
-- HELPER: timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION public.od_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ============================================================
-- 1. operational_demands
-- ============================================================
CREATE TABLE public.operational_demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  nome text NOT NULL,
  tipo public.operational_demand_type NOT NULL DEFAULT 'projeto_operacional',
  unidade text NOT NULL,
  campus_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  area text,
  gestor_responsavel uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  prioridade public.operational_demand_priority NOT NULL DEFAULT 'media',
  objetivo text NOT NULL,
  descricao text,
  resultado_esperado text,
  status public.operational_demand_status NOT NULL DEFAULT 'rascunho',
  proximas_etapas text,
  prazo_estimado date,
  resumo_final text,
  motivo_pausa text,
  justificativa_cancelamento text,
  concluida_em timestamptz,
  arquivada boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_demands TO authenticated;
GRANT ALL ON public.operational_demands TO service_role;
ALTER TABLE public.operational_demands ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_op_demands_org ON public.operational_demands(organization_id);
CREATE INDEX idx_op_demands_gestor ON public.operational_demands(gestor_responsavel);
CREATE INDEX idx_op_demands_status ON public.operational_demands(status);
CREATE INDEX idx_op_demands_prazo ON public.operational_demands(prazo_estimado);

CREATE TRIGGER trg_op_demands_updated_at
  BEFORE UPDATE ON public.operational_demands
  FOR EACH ROW EXECUTE FUNCTION public.od_set_updated_at();

-- Helper: papel atual do usuário na organização
CREATE OR REPLACE FUNCTION public.od_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.organization_members
  WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.od_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('organization_admin','administrador','coordenador_operacoes','gerente_geral','super_admin')
  ) OR public.is_super_admin();
$$;

-- RLS: demandas
CREATE POLICY "od_select" ON public.operational_demands FOR SELECT TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND (
    public.od_is_admin()
    OR gestor_responsavel = auth.uid()
    OR created_by = auth.uid()
  )
);

CREATE POLICY "od_insert" ON public.operational_demands FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND (
    public.od_is_admin()
    OR public.od_user_role() = 'gestor'
  )
);

CREATE POLICY "od_update" ON public.operational_demands FOR UPDATE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND (
    public.od_is_admin()
    OR gestor_responsavel = auth.uid()
    OR created_by = auth.uid()
  )
);

CREATE POLICY "od_delete" ON public.operational_demands FOR DELETE TO authenticated
USING (organization_id = public.get_user_organization_id() AND public.od_is_admin());

-- ============================================================
-- 2. operational_demand_updates
-- ============================================================
CREATE TABLE public.operational_demand_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.operational_demands(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  texto text NOT NULL,
  percentual_andamento integer CHECK (percentual_andamento BETWEEN 0 AND 100),
  autor uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_demand_updates TO authenticated;
GRANT ALL ON public.operational_demand_updates TO service_role;
ALTER TABLE public.operational_demand_updates ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_od_updates_demand ON public.operational_demand_updates(demand_id);

CREATE POLICY "odu_select" ON public.operational_demand_updates FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.operational_demands d WHERE d.id = demand_id));
CREATE POLICY "odu_insert" ON public.operational_demand_updates FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.operational_demands d WHERE d.id = demand_id));
CREATE POLICY "odu_update" ON public.operational_demand_updates FOR UPDATE TO authenticated
USING (autor = auth.uid() OR public.od_is_admin());
CREATE POLICY "odu_delete" ON public.operational_demand_updates FOR DELETE TO authenticated
USING (autor = auth.uid() OR public.od_is_admin());

-- ============================================================
-- 3. operational_demand_dependencies
-- ============================================================
CREATE TABLE public.operational_demand_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.operational_demands(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  tipo text NOT NULL DEFAULT 'interna',
  status text NOT NULL DEFAULT 'pendente',
  responsavel text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_demand_dependencies TO authenticated;
GRANT ALL ON public.operational_demand_dependencies TO service_role;
ALTER TABLE public.operational_demand_dependencies ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_od_dep_demand ON public.operational_demand_dependencies(demand_id);
CREATE TRIGGER trg_od_dep_updated_at BEFORE UPDATE ON public.operational_demand_dependencies
  FOR EACH ROW EXECUTE FUNCTION public.od_set_updated_at();

CREATE POLICY "odd_all" ON public.operational_demand_dependencies FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.operational_demands d WHERE d.id = demand_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.operational_demands d WHERE d.id = demand_id));

-- ============================================================
-- 4. operational_demand_attachments
-- ============================================================
CREATE TABLE public.operational_demand_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.operational_demands(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_size bigint,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_demand_attachments TO authenticated;
GRANT ALL ON public.operational_demand_attachments TO service_role;
ALTER TABLE public.operational_demand_attachments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_od_att_demand ON public.operational_demand_attachments(demand_id);

CREATE POLICY "oda_all" ON public.operational_demand_attachments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.operational_demands d WHERE d.id = demand_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.operational_demands d WHERE d.id = demand_id));

-- ============================================================
-- 5. operational_demand_comments
-- ============================================================
CREATE TABLE public.operational_demand_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.operational_demands(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  comentario text NOT NULL,
  autor uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_demand_comments TO authenticated;
GRANT ALL ON public.operational_demand_comments TO service_role;
ALTER TABLE public.operational_demand_comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_od_com_demand ON public.operational_demand_comments(demand_id);

CREATE POLICY "odc_select" ON public.operational_demand_comments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.operational_demands d WHERE d.id = demand_id));
CREATE POLICY "odc_insert" ON public.operational_demand_comments FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.operational_demands d WHERE d.id = demand_id));
CREATE POLICY "odc_update" ON public.operational_demand_comments FOR UPDATE TO authenticated
USING (autor = auth.uid() OR public.od_is_admin());
CREATE POLICY "odc_delete" ON public.operational_demand_comments FOR DELETE TO authenticated
USING (autor = auth.uid() OR public.od_is_admin());

-- ============================================================
-- 6. operational_demand_activity_log
-- ============================================================
CREATE TABLE public.operational_demand_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.operational_demands(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  evento text NOT NULL,
  payload jsonb,
  autor uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.operational_demand_activity_log TO authenticated;
GRANT ALL ON public.operational_demand_activity_log TO service_role;
ALTER TABLE public.operational_demand_activity_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_od_log_demand ON public.operational_demand_activity_log(demand_id);

CREATE POLICY "odl_select" ON public.operational_demand_activity_log FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.operational_demands d WHERE d.id = demand_id));
CREATE POLICY "odl_insert" ON public.operational_demand_activity_log FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.operational_demands d WHERE d.id = demand_id));

-- ============================================================
-- 7. operational_demand_links (CI / Purchase Request)
-- ============================================================
CREATE TABLE public.operational_demand_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.operational_demands(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  link_type text NOT NULL CHECK (link_type IN ('ci_request','purchase_request')),
  target_id uuid NOT NULL,
  label text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.operational_demand_links TO authenticated;
GRANT ALL ON public.operational_demand_links TO service_role;
ALTER TABLE public.operational_demand_links ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_od_link_demand ON public.operational_demand_links(demand_id);

CREATE POLICY "odln_all" ON public.operational_demand_links FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.operational_demands d WHERE d.id = demand_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.operational_demands d WHERE d.id = demand_id));

-- ============================================================
-- TRIGGER: numeração + validações de status + log
-- ============================================================
CREATE OR REPLACE FUNCTION public.od_before_insert()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE next_n integer; yyyy text;
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    yyyy := to_char(now(), 'YYYY');
    SELECT COALESCE(MAX(NULLIF(regexp_replace(code, '^OD-' || yyyy || '-', ''), '')::int), 0) + 1
      INTO next_n
      FROM public.operational_demands
      WHERE organization_id = NEW.organization_id AND code LIKE 'OD-' || yyyy || '-%';
    NEW.code := 'OD-' || yyyy || '-' || lpad(next_n::text, 4, '0');
  END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_od_before_insert
  BEFORE INSERT ON public.operational_demands
  FOR EACH ROW EXECUTE FUNCTION public.od_before_insert();

CREATE OR REPLACE FUNCTION public.od_validate_and_log()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Validações por status
  IF NEW.status = 'concluida' AND (NEW.resumo_final IS NULL OR length(trim(NEW.resumo_final)) = 0) THEN
    RAISE EXCEPTION 'Para concluir uma demanda é necessário informar o resumo final.';
  END IF;
  IF NEW.status = 'cancelada' AND (NEW.justificativa_cancelamento IS NULL OR length(trim(NEW.justificativa_cancelamento)) = 0) THEN
    RAISE EXCEPTION 'Para cancelar uma demanda é necessário informar a justificativa.';
  END IF;
  IF NEW.status = 'pausada' AND (NEW.motivo_pausa IS NULL OR length(trim(NEW.motivo_pausa)) = 0) THEN
    RAISE EXCEPTION 'Para pausar uma demanda é necessário informar o motivo.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status <> OLD.status THEN
      IF NEW.status = 'concluida' AND NEW.concluida_em IS NULL THEN NEW.concluida_em := now(); END IF;
      INSERT INTO public.operational_demand_activity_log(demand_id, organization_id, evento, payload, autor)
      VALUES (NEW.id, NEW.organization_id, 'status_changed',
              jsonb_build_object('from', OLD.status, 'to', NEW.status), auth.uid());
    END IF;
    IF COALESCE(NEW.prazo_estimado::text,'') <> COALESCE(OLD.prazo_estimado::text,'') THEN
      INSERT INTO public.operational_demand_activity_log(demand_id, organization_id, evento, payload, autor)
      VALUES (NEW.id, NEW.organization_id, 'prazo_changed',
              jsonb_build_object('from', OLD.prazo_estimado, 'to', NEW.prazo_estimado), auth.uid());
    END IF;
    IF NEW.gestor_responsavel <> OLD.gestor_responsavel THEN
      INSERT INTO public.operational_demand_activity_log(demand_id, organization_id, evento, payload, autor)
      VALUES (NEW.id, NEW.organization_id, 'gestor_changed',
              jsonb_build_object('from', OLD.gestor_responsavel, 'to', NEW.gestor_responsavel), auth.uid());
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.operational_demand_activity_log(demand_id, organization_id, evento, payload, autor)
    VALUES (NEW.id, NEW.organization_id, 'created',
            jsonb_build_object('status', NEW.status), auth.uid());
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_od_validate_status_before
  BEFORE INSERT OR UPDATE ON public.operational_demands
  FOR EACH ROW EXECUTE FUNCTION public.od_validate_and_log();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.operational_demands;
ALTER PUBLICATION supabase_realtime ADD TABLE public.operational_demand_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.operational_demand_activity_log;
