
-- Scorecard function
CREATE OR REPLACE FUNCTION public.get_supplier_scorecard(_from timestamptz, _to timestamptz)
RETURNS TABLE (
  supplier_id uuid,
  nome_fantasia text,
  orders_count bigint,
  total_value numeric,
  manual_avg numeric,
  on_time_rate numeric,
  nf_on_time_rate numeric,
  divergence_rate numeric,
  quote_response_rate numeric,
  score_final numeric,
  tier text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH org AS (SELECT get_user_organization_id() AS oid),
  base AS (
    SELECT s.id AS supplier_id, s.nome_fantasia
    FROM suppliers s, org
    WHERE s.organization_id = org.oid
  ),
  orders_agg AS (
    SELECT po.supplier_id,
           count(*)::bigint AS orders_count,
           COALESCE(sum(po.valor_total),0) AS total_value,
           COALESCE(100.0 * count(*) FILTER (
             WHERE po.status = 'recebido_total' AND EXISTS (
               SELECT 1 FROM purchase_receipts r
               WHERE r.order_id = po.id
                 AND r.data_recebimento <= po.created_at::date + COALESCE(po.prazo_entrega_dias,0)
             )
           )::numeric / NULLIF(count(*) FILTER (WHERE po.status = 'recebido_total'),0), 0) AS on_time_rate,
           COALESCE(100.0 * count(*) FILTER (
             WHERE po.nota_fiscal_uploaded_at IS NOT NULL
               AND po.nota_fiscal_uploaded_at <= po.created_at + interval '48 hours'
           )::numeric / NULLIF(count(*) FILTER (WHERE po.status <> 'cancelado'),0), 0) AS nf_on_time_rate,
           COALESCE(100.0 * (
             SELECT count(*) FROM purchase_receipts r2
             JOIN purchase_orders po2 ON po2.id = r2.order_id
             WHERE po2.supplier_id = po.supplier_id
               AND po2.organization_id = po.organization_id
               AND r2.created_at BETWEEN _from AND _to
               AND r2.divergencia = true
           )::numeric / NULLIF((
             SELECT count(*) FROM purchase_receipts r3
             JOIN purchase_orders po3 ON po3.id = r3.order_id
             WHERE po3.supplier_id = po.supplier_id
               AND po3.organization_id = po.organization_id
               AND r3.created_at BETWEEN _from AND _to
           ),0), 0) AS divergence_rate
    FROM purchase_orders po, org
    WHERE po.organization_id = org.oid
      AND po.created_at BETWEEN _from AND _to
    GROUP BY po.supplier_id, po.organization_id
  ),
  manual AS (
    SELECT se.supplier_id,
           avg(se.nota_geral) * 20 AS manual_avg
    FROM supplier_evaluations se, org
    WHERE se.organization_id = org.oid
      AND se.created_at BETWEEN _from AND _to
    GROUP BY se.supplier_id
  ),
  quotes_agg AS (
    SELECT q.supplier_id,
           COALESCE(100.0 * count(*) FILTER (
             WHERE q.status IN ('respondida','escolhida','descartada')
               AND q.updated_at <= q.created_at + interval '48 hours'
           )::numeric / NULLIF(count(*),0), 0) AS quote_response_rate
    FROM purchase_quotes q, org
    WHERE q.organization_id = org.oid
      AND q.created_at BETWEEN _from AND _to
    GROUP BY q.supplier_id
  )
  SELECT b.supplier_id,
         b.nome_fantasia,
         COALESCE(o.orders_count, 0) AS orders_count,
         COALESCE(o.total_value, 0) AS total_value,
         COALESCE(m.manual_avg, 0) AS manual_avg,
         COALESCE(o.on_time_rate, 0) AS on_time_rate,
         COALESCE(o.nf_on_time_rate, 0) AS nf_on_time_rate,
         COALESCE(o.divergence_rate, 0) AS divergence_rate,
         COALESCE(q.quote_response_rate, 0) AS quote_response_rate,
         ROUND(
           0.30 * COALESCE(m.manual_avg, 0)
         + 0.25 * COALESCE(o.on_time_rate, 0)
         + 0.15 * COALESCE(o.nf_on_time_rate, 0)
         + 0.15 * (100 - COALESCE(o.divergence_rate, 0))
         + 0.15 * COALESCE(q.quote_response_rate, 0)
         , 2) AS score_final,
         CASE
           WHEN COALESCE(o.orders_count,0) = 0 AND COALESCE(m.manual_avg,0) = 0 THEN 'sem_dados'
           WHEN (0.30 * COALESCE(m.manual_avg, 0)
               + 0.25 * COALESCE(o.on_time_rate, 0)
               + 0.15 * COALESCE(o.nf_on_time_rate, 0)
               + 0.15 * (100 - COALESCE(o.divergence_rate, 0))
               + 0.15 * COALESCE(q.quote_response_rate, 0)) >= 85 THEN 'ouro'
           WHEN (0.30 * COALESCE(m.manual_avg, 0)
               + 0.25 * COALESCE(o.on_time_rate, 0)
               + 0.15 * COALESCE(o.nf_on_time_rate, 0)
               + 0.15 * (100 - COALESCE(o.divergence_rate, 0))
               + 0.15 * COALESCE(q.quote_response_rate, 0)) >= 70 THEN 'prata'
           WHEN (0.30 * COALESCE(m.manual_avg, 0)
               + 0.25 * COALESCE(o.on_time_rate, 0)
               + 0.15 * COALESCE(o.nf_on_time_rate, 0)
               + 0.15 * (100 - COALESCE(o.divergence_rate, 0))
               + 0.15 * COALESCE(q.quote_response_rate, 0)) >= 50 THEN 'bronze'
           ELSE 'atencao'
         END AS tier
  FROM base b
  LEFT JOIN orders_agg o ON o.supplier_id = b.supplier_id
  LEFT JOIN manual m ON m.supplier_id = b.supplier_id
  LEFT JOIN quotes_agg q ON q.supplier_id = b.supplier_id
  ORDER BY score_final DESC NULLS LAST;
$$;

-- Snapshot table
CREATE TABLE IF NOT EXISTS public.supplier_score_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  period_from timestamptz NOT NULL,
  period_to timestamptz NOT NULL,
  score_final numeric NOT NULL,
  tier text NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_score_snap_org_date
  ON public.supplier_score_snapshots (organization_id, supplier_id, captured_at DESC);

ALTER TABLE public.supplier_score_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read scorecard snapshots in own org"
  ON public.supplier_score_snapshots
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
