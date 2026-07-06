
-- ============ executive_dashboards ============
CREATE TABLE public.executive_dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  compartilhado boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.executive_dashboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view dashboards"
  ON public.executive_dashboards FOR SELECT TO authenticated
  USING (is_super_admin() OR (organization_id = get_user_organization_id() AND (compartilhado = true OR created_by = auth.uid())));

CREATE POLICY "Members insert own dashboards"
  ON public.executive_dashboards FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid());

CREATE POLICY "Owners or staff update dashboards"
  ON public.executive_dashboards FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND (created_by = auth.uid() OR get_current_user_role() = ANY(ARRAY['admin','gerente'])));

CREATE POLICY "Owners or admin delete dashboards"
  ON public.executive_dashboards FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND (created_by = auth.uid() OR get_current_user_role() = 'admin'));

CREATE INDEX idx_exec_dashboards_org ON public.executive_dashboards(organization_id);

CREATE TRIGGER trg_exec_dashboards_updated
  BEFORE UPDATE ON public.executive_dashboards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ dashboard_widgets ============
CREATE TABLE public.dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES public.executive_dashboards(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('kpi','chart_line','chart_bar','chart_pie','table','heatmap')),
  titulo text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  posicao jsonb NOT NULL DEFAULT '{"x":0,"y":0,"w":4,"h":3}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view widgets"
  ON public.dashboard_widgets FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Org members insert widgets"
  ON public.dashboard_widgets FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id()
    AND EXISTS (SELECT 1 FROM public.executive_dashboards d WHERE d.id = dashboard_id AND (d.created_by = auth.uid() OR get_current_user_role() = ANY(ARRAY['admin','gerente']))));

CREATE POLICY "Org members update widgets"
  ON public.dashboard_widgets FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id()
    AND EXISTS (SELECT 1 FROM public.executive_dashboards d WHERE d.id = dashboard_id AND (d.created_by = auth.uid() OR get_current_user_role() = ANY(ARRAY['admin','gerente']))));

CREATE POLICY "Org members delete widgets"
  ON public.dashboard_widgets FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id()
    AND EXISTS (SELECT 1 FROM public.executive_dashboards d WHERE d.id = dashboard_id AND (d.created_by = auth.uid() OR get_current_user_role() = 'admin')));

CREATE INDEX idx_widgets_dashboard ON public.dashboard_widgets(dashboard_id);

CREATE TRIGGER trg_widgets_updated
  BEFORE UPDATE ON public.dashboard_widgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ saved_reports ============
CREATE TABLE public.saved_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('estoque','compras','financeiro','fornecedores','consumo')),
  filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  colunas jsonb NOT NULL DEFAULT '[]'::jsonb,
  agendamento jsonb,
  ultima_execucao timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view reports"
  ON public.saved_reports FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Members insert reports"
  ON public.saved_reports FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid());

CREATE POLICY "Owners or staff update reports"
  ON public.saved_reports FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND (created_by = auth.uid() OR get_current_user_role() = ANY(ARRAY['admin','gerente'])));

CREATE POLICY "Owners or admin delete reports"
  ON public.saved_reports FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND (created_by = auth.uid() OR get_current_user_role() = 'admin'));

CREATE INDEX idx_saved_reports_org ON public.saved_reports(organization_id);

CREATE TRIGGER trg_saved_reports_updated
  BEFORE UPDATE ON public.saved_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ai_insights ============
CREATE TABLE public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('anomalia','tendencia','oportunidade','risco')),
  titulo text NOT NULL,
  descricao text NOT NULL,
  severidade text NOT NULL DEFAULT 'media' CHECK (severidade IN ('baixa','media','alta')),
  entidade text CHECK (entidade IN ('produto','fornecedor','centro_custo')),
  entidade_id uuid,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','visto','acionado','descartado')),
  gerado_em timestamptz NOT NULL DEFAULT now(),
  decidido_por uuid,
  decidido_em timestamptz
);
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view insights"
  ON public.ai_insights FOR SELECT TO authenticated
  USING (is_super_admin() OR (organization_id = get_user_organization_id() AND get_current_user_role() = ANY(ARRAY['admin','gerente'])));

CREATE POLICY "Staff update insights"
  ON public.ai_insights FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = ANY(ARRAY['admin','gerente']));

CREATE POLICY "Admin delete insights"
  ON public.ai_insights FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

CREATE INDEX idx_ai_insights_org_status ON public.ai_insights(organization_id, status);

-- ============ comments_threads ============
CREATE TABLE public.comments_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  entidade_tipo text NOT NULL CHECK (entidade_tipo IN ('purchase_request','purchase_order','purchase_receipt')),
  entidade_id uuid NOT NULL,
  resolvido boolean NOT NULL DEFAULT false,
  resolvido_em timestamptz,
  resolvido_por uuid,
  criado_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.comments_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view threads"
  ON public.comments_threads FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Org members insert threads"
  ON public.comments_threads FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND criado_por = auth.uid());

CREATE POLICY "Author or staff update threads"
  ON public.comments_threads FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND (criado_por = auth.uid() OR get_current_user_role() = ANY(ARRAY['admin','gerente'])));

CREATE POLICY "Author or admin delete threads"
  ON public.comments_threads FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND (criado_por = auth.uid() OR get_current_user_role() = 'admin'));

CREATE INDEX idx_comments_threads_entidade ON public.comments_threads(entidade_tipo, entidade_id);

CREATE TRIGGER trg_threads_updated
  BEFORE UPDATE ON public.comments_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ comments ============
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.comments_threads(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  autor_id uuid NOT NULL,
  conteudo text NOT NULL,
  mencionados uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  editado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view comments"
  ON public.comments FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Org members insert comments"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND autor_id = auth.uid());

CREATE POLICY "Author update own comments"
  ON public.comments FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND autor_id = auth.uid());

CREATE POLICY "Author or admin delete comments"
  ON public.comments FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND (autor_id = auth.uid() OR get_current_user_role() = 'admin'));

CREATE INDEX idx_comments_thread ON public.comments(thread_id, created_at);

-- ============ Trigger: notify mentioned users ============
CREATE OR REPLACE FUNCTION public.notify_mentioned_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  IF NEW.mencionados IS NOT NULL AND array_length(NEW.mencionados, 1) > 0 THEN
    FOREACH uid IN ARRAY NEW.mencionados LOOP
      INSERT INTO public.alerts (type, severity, title, message, organization_id)
      VALUES ('low_stock', 'medium', 'Você foi mencionado em um comentário',
        substring(NEW.conteudo from 1 for 200), NEW.organization_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_mentions
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_mentioned_users();

-- ============ Detection functions ============
CREATE OR REPLACE FUNCTION public.detect_consumption_anomalies(_org uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  count_inserted integer := 0;
  media_6m numeric;
  consumo_mes numeric;
BEGIN
  FOR rec IN
    SELECT p.id, p.name
    FROM public.products p
    WHERE p.organization_id = _org
  LOOP
    SELECT COALESCE(SUM(quantity),0)::numeric / NULLIF(6,0) INTO media_6m
    FROM public.movements
    WHERE product_id = rec.id AND type = 'saida'
      AND created_at >= now() - interval '6 months'
      AND created_at < date_trunc('month', now());

    SELECT COALESCE(SUM(quantity),0) INTO consumo_mes
    FROM public.movements
    WHERE product_id = rec.id AND type = 'saida'
      AND created_at >= date_trunc('month', now());

    IF media_6m > 0 AND consumo_mes > media_6m * 1.5 THEN
      INSERT INTO public.ai_insights (organization_id, tipo, titulo, descricao, severidade, entidade, entidade_id, dados)
      VALUES (_org, 'anomalia',
        'Consumo elevado: ' || rec.name,
        'Consumo do mês (' || consumo_mes || ') está mais de 50% acima da média dos últimos 6 meses (' || round(media_6m, 2) || ').',
        CASE WHEN consumo_mes > media_6m * 2 THEN 'alta' ELSE 'media' END,
        'produto', rec.id,
        jsonb_build_object('media_6m', media_6m, 'consumo_mes', consumo_mes));
      count_inserted := count_inserted + 1;
    END IF;
  END LOOP;
  RETURN count_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.detect_budget_overruns(_org uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  count_inserted integer := 0;
  gasto numeric;
  pct numeric;
BEGIN
  FOR rec IN
    SELECT b.* FROM public.budgets b
    WHERE b.organization_id = _org AND b.ativo = true
      AND CURRENT_DATE BETWEEN b.periodo_inicio AND b.periodo_fim
  LOOP
    SELECT COALESCE(SUM(po.valor_total),0) INTO gasto
    FROM public.purchase_orders po
    WHERE po.organization_id = _org
      AND (rec.cost_center_id IS NULL OR po.cost_center_id = rec.cost_center_id)
      AND po.created_at::date BETWEEN rec.periodo_inicio AND rec.periodo_fim;

    pct := CASE WHEN rec.valor_planejado > 0 THEN gasto / rec.valor_planejado * 100 ELSE 0 END;

    IF pct >= 85 THEN
      INSERT INTO public.ai_insights (organization_id, tipo, titulo, descricao, severidade, entidade, entidade_id, dados)
      VALUES (_org,
        CASE WHEN pct >= 100 THEN 'risco' ELSE 'tendencia' END,
        CASE WHEN pct >= 100 THEN 'Orçamento estourado' ELSE 'Orçamento próximo do limite' END,
        'O orçamento atingiu ' || round(pct,1) || '% do planejado (R$ ' || round(gasto,2) || ' de R$ ' || round(rec.valor_planejado,2) || ').',
        CASE WHEN pct >= 100 THEN 'alta' ELSE 'media' END,
        'centro_custo', rec.cost_center_id,
        jsonb_build_object('gasto', gasto, 'planejado', rec.valor_planejado, 'percentual', pct));
      count_inserted := count_inserted + 1;
    END IF;
  END LOOP;
  RETURN count_inserted;
END;
$$;
