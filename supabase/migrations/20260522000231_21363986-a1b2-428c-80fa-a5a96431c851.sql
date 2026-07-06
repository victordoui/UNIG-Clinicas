
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
           COALESCE(SUM(m.quantity), 0)::NUMERIC AS qtd,
           COALESCE(SUM(m.quantity * COALESCE(p.unit_price, 0)), 0)::NUMERIC AS valor
    FROM public.movements m
    JOIN public.products p ON p.id = m.product_id
    WHERE m.organization_id = v_org
      AND m.type = 'saida'
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
         COALESCE(p.current_stock, 0), v_user
  FROM public.products p
  LEFT JOIN public.product_abc_classification abc
    ON abc.product_id = p.id AND abc.organization_id = v_org
  WHERE p.organization_id = v_org
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
