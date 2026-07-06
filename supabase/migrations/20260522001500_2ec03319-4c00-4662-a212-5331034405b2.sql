
-- FASE 22: BI avançado (sem IA)

CREATE TABLE IF NOT EXISTS public.bi_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  filtros JSONB NOT NULL DEFAULT '{}'::jsonb,
  grafico TEXT NOT NULL DEFAULT 'bar',
  visibilidade TEXT NOT NULL DEFAULT 'privada' CHECK (visibilidade IN ('privada','compartilhada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bsv_org ON public.bi_saved_views(organization_id);

ALTER TABLE public.bi_saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bsv_select" ON public.bi_saved_views FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id()
    AND (visibilidade = 'compartilhada' OR user_id = auth.uid()));
CREATE POLICY "bsv_insert" ON public.bi_saved_views FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id() AND user_id = auth.uid());
CREATE POLICY "bsv_update" ON public.bi_saved_views FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND user_id = auth.uid());
CREATE POLICY "bsv_delete" ON public.bi_saved_views FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND user_id = auth.uid());

CREATE TRIGGER trg_bsv_updated BEFORE UPDATE ON public.bi_saved_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.purchase_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  product_id UUID,
  supplier_id UUID,
  quantidade NUMERIC NOT NULL DEFAULT 0,
  preco_unitario NUMERIC NOT NULL DEFAULT 0,
  lead_time_dias INT NOT NULL DEFAULT 0,
  resultado JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ps_org ON public.purchase_simulations(organization_id);

ALTER TABLE public.purchase_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ps_select" ON public.purchase_simulations FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY "ps_insert" ON public.purchase_simulations FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id() AND user_id = auth.uid());
CREATE POLICY "ps_update" ON public.purchase_simulations FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND user_id = auth.uid());
CREATE POLICY "ps_delete" ON public.purchase_simulations FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND user_id = auth.uid());

CREATE TRIGGER trg_ps_updated BEFORE UPDATE ON public.purchase_simulations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Alertas de ruptura por média móvel
CREATE OR REPLACE FUNCTION public.get_stockout_alerts(p_lead_time_default INT DEFAULT 7)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  current_stock NUMERIC,
  consumo_diario NUMERIC,
  cobertura_dias NUMERIC,
  lead_time_dias INT,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH consumo AS (
    SELECT m.product_id,
           COALESCE(SUM(m.quantity),0)::NUMERIC / 90.0 AS diario
    FROM public.movements m
    WHERE m.organization_id = public.get_user_organization_id()
      AND m.type = 'saida'
      AND m.created_at >= now() - INTERVAL '90 days'
    GROUP BY m.product_id
  )
  SELECT p.id,
         p.name,
         COALESCE(p.current_stock, 0),
         COALESCE(c.diario, 0),
         CASE WHEN COALESCE(c.diario,0) = 0 THEN 9999
              ELSE ROUND(COALESCE(p.current_stock,0) / c.diario, 1) END,
         p_lead_time_default,
         CASE
           WHEN COALESCE(c.diario,0) = 0 THEN 'sem_consumo'
           WHEN COALESCE(p.current_stock,0) / c.diario < p_lead_time_default * 0.5 THEN 'critico'
           WHEN COALESCE(p.current_stock,0) / c.diario < p_lead_time_default THEN 'alerta'
           ELSE 'ok'
         END
  FROM public.products p
  LEFT JOIN consumo c ON c.product_id = p.id
  WHERE p.organization_id = public.get_user_organization_id();
$$;
