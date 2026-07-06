
-- supplier_evaluations table
CREATE TABLE public.supplier_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  order_id uuid NOT NULL,
  pontualidade smallint NOT NULL CHECK (pontualidade BETWEEN 1 AND 5),
  qualidade smallint NOT NULL CHECK (qualidade BETWEEN 1 AND 5),
  atendimento smallint NOT NULL CHECK (atendimento BETWEEN 1 AND 5),
  preco smallint NOT NULL CHECK (preco BETWEEN 1 AND 5),
  nota_geral numeric GENERATED ALWAYS AS ((pontualidade + qualidade + atendimento + preco)::numeric / 4) STORED,
  comentario text,
  avaliado_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

ALTER TABLE public.supplier_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view evaluations"
  ON public.supplier_evaluations FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Compras and admins insert evaluations"
  ON public.supplier_evaluations FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND avaliado_por = auth.uid()
    AND get_current_user_role() IN ('admin','gerente')
  );

CREATE POLICY "Admins update evaluations"
  ON public.supplier_evaluations FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

CREATE POLICY "Admins delete evaluations"
  ON public.supplier_evaluations FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

CREATE TRIGGER update_supplier_evaluations_updated_at
  BEFORE UPDATE ON public.supplier_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_supplier_evaluations_supplier ON public.supplier_evaluations(supplier_id);
CREATE INDEX idx_supplier_evaluations_org ON public.supplier_evaluations(organization_id);

-- KPI: overview
CREATE OR REPLACE FUNCTION public.kpi_purchases_overview(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org uuid := get_user_organization_id();
  v_result jsonb;
BEGIN
  IF v_org IS NULL THEN RETURN '{}'::jsonb; END IF;

  SELECT jsonb_build_object(
    'solicitacoes_total', (SELECT count(*) FROM purchase_requests WHERE organization_id = v_org AND created_at BETWEEN _from AND _to),
    'solicitacoes_abertas', (SELECT count(*) FROM purchase_requests WHERE organization_id = v_org AND status NOT IN ('recebida','reprovada','cancelada') AND created_at BETWEEN _from AND _to),
    'aprovadas', (SELECT count(*) FROM purchase_requests WHERE organization_id = v_org AND status::text IN ('aprovada','em_cotacao','compra_realizada','aguardando_entrega','recebida') AND created_at BETWEEN _from AND _to),
    'pedidos_emitidos', (SELECT count(*) FROM purchase_orders WHERE organization_id = v_org AND created_at BETWEEN _from AND _to),
    'pedidos_recebidos', (SELECT count(*) FROM purchase_orders WHERE organization_id = v_org AND status = 'recebido_total' AND created_at BETWEEN _from AND _to),
    'valor_comprado', COALESCE((SELECT sum(valor_total) FROM purchase_orders WHERE organization_id = v_org AND created_at BETWEEN _from AND _to), 0),
    'ticket_medio', COALESCE((SELECT avg(valor_total) FROM purchase_orders WHERE organization_id = v_org AND created_at BETWEEN _from AND _to), 0),
    'lead_time_medio_dias', COALESCE((
      SELECT avg(EXTRACT(EPOCH FROM (r.data_recebimento - po.created_at)) / 86400)
      FROM purchase_orders po
      JOIN purchase_receipts r ON r.order_id = po.id
      WHERE po.organization_id = v_org AND po.status = 'recebido_total' AND po.created_at BETWEEN _from AND _to
    ), 0),
    'pct_no_prazo', COALESCE((
      SELECT 100.0 * count(*) FILTER (
        WHERE r.data_recebimento <= po.created_at + (COALESCE(po.prazo_entrega_dias,0) || ' days')::interval
      ) / NULLIF(count(*),0)
      FROM purchase_orders po
      JOIN purchase_receipts r ON r.order_id = po.id
      WHERE po.organization_id = v_org AND po.status = 'recebido_total' AND po.created_at BETWEEN _from AND _to
    ), 0)
  ) INTO v_result;

  RETURN v_result;
END $$;

-- KPI: by status
CREATE OR REPLACE FUNCTION public.kpi_purchases_by_status(_from timestamptz, _to timestamptz)
RETURNS TABLE(status text, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT status::text, count(*)
  FROM purchase_requests
  WHERE organization_id = get_user_organization_id()
    AND created_at BETWEEN _from AND _to
  GROUP BY status::text
  ORDER BY count(*) DESC;
$$;

-- KPI: by category
CREATE OR REPLACE FUNCTION public.kpi_purchases_by_category(_from timestamptz, _to timestamptz)
RETURNS TABLE(categoria text, total_pedidos bigint, valor_total numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(pr.categoria,'sem_categoria') AS categoria,
         count(po.*)::bigint,
         COALESCE(sum(po.valor_total),0)
  FROM purchase_orders po
  JOIN purchase_requests pr ON pr.id = po.request_id
  WHERE po.organization_id = get_user_organization_id()
    AND po.created_at BETWEEN _from AND _to
  GROUP BY 1
  ORDER BY 3 DESC;
$$;

-- KPI: top suppliers
CREATE OR REPLACE FUNCTION public.kpi_top_suppliers(_from timestamptz, _to timestamptz, _limit integer DEFAULT 10)
RETURNS TABLE(
  supplier_id uuid,
  nome_fantasia text,
  total_pedidos bigint,
  valor_total numeric,
  nota_media numeric,
  pct_no_prazo numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id,
         s.nome_fantasia,
         count(po.*)::bigint,
         COALESCE(sum(po.valor_total),0),
         COALESCE((SELECT avg(nota_geral) FROM supplier_evaluations se
                   WHERE se.supplier_id = s.id AND se.organization_id = get_user_organization_id()),0),
         COALESCE((
           SELECT 100.0 * count(*) FILTER (
             WHERE r.data_recebimento <= po2.created_at + (COALESCE(po2.prazo_entrega_dias,0) || ' days')::interval
           ) / NULLIF(count(*),0)
           FROM purchase_orders po2
           JOIN purchase_receipts r ON r.order_id = po2.id
           WHERE po2.supplier_id = s.id AND po2.status = 'recebido_total'
             AND po2.organization_id = get_user_organization_id()
         ),0)
  FROM suppliers s
  LEFT JOIN purchase_orders po ON po.supplier_id = s.id
    AND po.created_at BETWEEN _from AND _to
    AND po.organization_id = get_user_organization_id()
  WHERE s.organization_id = get_user_organization_id()
  GROUP BY s.id, s.nome_fantasia
  HAVING count(po.*) > 0
  ORDER BY 4 DESC
  LIMIT _limit;
$$;

-- KPI: lead time time series (monthly)
CREATE OR REPLACE FUNCTION public.kpi_purchase_lead_time_series(_from timestamptz, _to timestamptz)
RETURNS TABLE(mes text, emitidos bigint, recebidos bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH meses AS (
    SELECT to_char(date_trunc('month', gs)::date, 'YYYY-MM') AS mes
    FROM generate_series(date_trunc('month', _from), date_trunc('month', _to), interval '1 month') gs
  ),
  emit AS (
    SELECT to_char(date_trunc('month', created_at)::date, 'YYYY-MM') AS mes, count(*) AS total
    FROM purchase_orders
    WHERE organization_id = get_user_organization_id()
      AND created_at BETWEEN _from AND _to
    GROUP BY 1
  ),
  rec AS (
    SELECT to_char(date_trunc('month', data_recebimento)::date, 'YYYY-MM') AS mes, count(*) AS total
    FROM purchase_receipts
    WHERE organization_id = get_user_organization_id()
      AND data_recebimento BETWEEN _from AND _to
    GROUP BY 1
  )
  SELECT m.mes, COALESCE(e.total,0), COALESCE(r.total,0)
  FROM meses m
  LEFT JOIN emit e ON e.mes = m.mes
  LEFT JOIN rec r ON r.mes = m.mes
  ORDER BY m.mes;
$$;
