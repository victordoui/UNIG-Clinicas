
-- FASE 18: Contagem cíclica por curva ABC

-- Curva ABC por produto (recalculada periodicamente)
CREATE TABLE IF NOT EXISTS public.product_abc_classification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  product_id UUID NOT NULL,
  curva CHAR(1) NOT NULL CHECK (curva IN ('A','B','C')),
  consumo_90d NUMERIC NOT NULL DEFAULT 0,
  valor_consumido NUMERIC NOT NULL DEFAULT 0,
  participacao_percent NUMERIC NOT NULL DEFAULT 0,
  calculado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_abc_org ON public.product_abc_classification(organization_id);
CREATE INDEX IF NOT EXISTS idx_abc_curva ON public.product_abc_classification(curva);

ALTER TABLE public.product_abc_classification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "abc_select" ON public.product_abc_classification FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY "abc_insert" ON public.product_abc_classification FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "abc_update" ON public.product_abc_classification FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY "abc_delete" ON public.product_abc_classification FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id());

-- Planos de contagem cíclica
CREATE TABLE IF NOT EXISTS public.cycle_count_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  nome TEXT NOT NULL,
  freq_a_dias INT NOT NULL DEFAULT 30,
  freq_b_dias INT NOT NULL DEFAULT 90,
  freq_c_dias INT NOT NULL DEFAULT 180,
  tolerancia_percent NUMERIC NOT NULL DEFAULT 2,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cycle_count_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccp_select" ON public.cycle_count_plans FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY "ccp_insert" ON public.cycle_count_plans FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "ccp_update" ON public.cycle_count_plans FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY "ccp_delete" ON public.cycle_count_plans FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE TRIGGER trg_ccp_updated BEFORE UPDATE ON public.cycle_count_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tarefas de contagem
CREATE TABLE IF NOT EXISTS public.cycle_count_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  plan_id UUID REFERENCES public.cycle_count_plans(id) ON DELETE SET NULL,
  product_id UUID NOT NULL,
  curva CHAR(1),
  qtd_esperada NUMERIC NOT NULL DEFAULT 0,
  qtd_contada NUMERIC,
  divergencia NUMERIC,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','contada','aprovada','divergente','cancelada')),
  ajuste_automatico BOOLEAN NOT NULL DEFAULT false,
  observacao TEXT,
  contado_por UUID,
  contado_em TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cct_org ON public.cycle_count_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_cct_status ON public.cycle_count_tasks(status);
CREATE INDEX IF NOT EXISTS idx_cct_product ON public.cycle_count_tasks(product_id);

ALTER TABLE public.cycle_count_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cct_select" ON public.cycle_count_tasks FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY "cct_insert" ON public.cycle_count_tasks FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "cct_update" ON public.cycle_count_tasks FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY "cct_delete" ON public.cycle_count_tasks FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE TRIGGER trg_cct_updated BEFORE UPDATE ON public.cycle_count_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recalcula curva ABC a partir das movimentações dos últimos 90 dias
CREATE OR REPLACE FUNCTION public.recalc_abc_curve()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_count INT := 0;
BEGIN
  IF v_org IS NULL THEN RETURN 0; END IF;

  DELETE FROM public.product_abc_classification WHERE organization_id = v_org;

  WITH consumo AS (
    SELECT m.product_id,
           COALESCE(SUM(m.quantidade), 0)::NUMERIC AS qtd,
           COALESCE(SUM(m.quantidade * COALESCE(p.preco_custo, 0)), 0)::NUMERIC AS valor
    FROM public.movements m
    JOIN public.products p ON p.id = m.product_id
    WHERE m.organization_id = v_org
      AND m.tipo = 'saida'
      AND m.created_at >= now() - INTERVAL '90 days'
    GROUP BY m.product_id
  ),
  total AS (SELECT NULLIF(SUM(valor),0) AS total_valor FROM consumo),
  ranked AS (
    SELECT c.product_id, c.qtd, c.valor,
           CASE WHEN t.total_valor IS NULL THEN 0 ELSE (c.valor / t.total_valor * 100) END AS part,
           SUM(c.valor) OVER (ORDER BY c.valor DESC ROWS UNBOUNDED PRECEDING) AS cum_valor,
           t.total_valor
    FROM consumo c CROSS JOIN total t
  )
  INSERT INTO public.product_abc_classification
    (organization_id, product_id, curva, consumo_90d, valor_consumido, participacao_percent)
  SELECT v_org, product_id,
         CASE
           WHEN total_valor IS NULL OR total_valor = 0 THEN 'C'
           WHEN (cum_valor / total_valor) <= 0.80 THEN 'A'
           WHEN (cum_valor / total_valor) <= 0.95 THEN 'B'
           ELSE 'C'
         END,
         qtd, valor, part
  FROM ranked;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Gera tarefas pendentes para produtos sem contagem recente
CREATE OR REPLACE FUNCTION public.generate_cycle_count_tasks(p_plan_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.get_user_organization_id();
  v_user UUID := auth.uid();
  v_plan RECORD;
  v_count INT := 0;
BEGIN
  IF v_org IS NULL OR v_user IS NULL THEN RETURN 0; END IF;

  SELECT * INTO v_plan FROM public.cycle_count_plans
    WHERE id = p_plan_id AND organization_id = v_org;
  IF NOT FOUND THEN RETURN 0; END IF;

  INSERT INTO public.cycle_count_tasks
    (organization_id, plan_id, product_id, curva, qtd_esperada, created_by)
  SELECT v_org, p_plan_id, p.id, COALESCE(abc.curva, 'C'),
         COALESCE(p.estoque_atual, 0), v_user
  FROM public.products p
  LEFT JOIN public.product_abc_classification abc
    ON abc.product_id = p.id AND abc.organization_id = v_org
  WHERE p.organization_id = v_org
    AND p.ativo = true
    AND NOT EXISTS (
      SELECT 1 FROM public.cycle_count_tasks t
      WHERE t.product_id = p.id
        AND t.organization_id = v_org
        AND t.status IN ('pendente','contada')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.cycle_count_tasks t2
      WHERE t2.product_id = p.id
        AND t2.organization_id = v_org
        AND t2.status = 'aprovada'
        AND t2.contado_em >= now() - (
          CASE COALESCE(abc.curva, 'C')
            WHEN 'A' THEN make_interval(days => v_plan.freq_a_dias)
            WHEN 'B' THEN make_interval(days => v_plan.freq_b_dias)
            ELSE make_interval(days => v_plan.freq_c_dias)
          END
        )
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- KPIs
CREATE OR REPLACE FUNCTION public.get_cycle_count_dashboard()
RETURNS TABLE(pendentes BIGINT, contadas_hoje BIGINT, divergentes BIGINT, aprovadas_mes BIGINT, curva_a BIGINT, curva_b BIGINT, curva_c BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.cycle_count_tasks WHERE organization_id = public.get_user_organization_id() AND status = 'pendente'),
    (SELECT COUNT(*) FROM public.cycle_count_tasks WHERE organization_id = public.get_user_organization_id() AND status IN ('contada','aprovada') AND contado_em::date = current_date),
    (SELECT COUNT(*) FROM public.cycle_count_tasks WHERE organization_id = public.get_user_organization_id() AND status = 'divergente'),
    (SELECT COUNT(*) FROM public.cycle_count_tasks WHERE organization_id = public.get_user_organization_id() AND status = 'aprovada' AND contado_em >= date_trunc('month', now())),
    (SELECT COUNT(*) FROM public.product_abc_classification WHERE organization_id = public.get_user_organization_id() AND curva = 'A'),
    (SELECT COUNT(*) FROM public.product_abc_classification WHERE organization_id = public.get_user_organization_id() AND curva = 'B'),
    (SELECT COUNT(*) FROM public.product_abc_classification WHERE organization_id = public.get_user_organization_id() AND curva = 'C');
$$;
