
ALTER TABLE public.supplier_contracts
  ADD COLUMN IF NOT EXISTS auto_renovacao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dias_aviso_vencimento integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS valor_mensal numeric,
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS aviso_enviado_em timestamptz;

CREATE OR REPLACE VIEW public.contracts_expiring_v AS
SELECT
  c.id AS contract_id,
  c.organization_id,
  c.supplier_id,
  c.numero,
  c.fim,
  c.status,
  c.dias_aviso_vencimento,
  c.auto_renovacao,
  c.aviso_enviado_em,
  (c.fim - CURRENT_DATE)::int AS dias_para_vencer
FROM public.supplier_contracts c
WHERE c.status IN ('ativo', 'em_renovacao')
  AND c.fim <= (CURRENT_DATE + INTERVAL '60 days');

CREATE OR REPLACE FUNCTION public.get_contracts_dashboard()
RETURNS TABLE (
  ativos bigint,
  vencendo_30d bigint,
  vencidos bigint,
  em_renovacao bigint,
  valor_mensal_total numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE c.status = 'ativo' AND c.fim >= CURRENT_DATE) AS ativos,
    COUNT(*) FILTER (WHERE c.status IN ('ativo','em_renovacao') AND c.fim BETWEEN CURRENT_DATE AND CURRENT_DATE + 30) AS vencendo_30d,
    COUNT(*) FILTER (WHERE c.fim < CURRENT_DATE AND c.status NOT IN ('encerrado')) AS vencidos,
    COUNT(*) FILTER (WHERE c.status = 'em_renovacao') AS em_renovacao,
    COALESCE(SUM(c.valor_mensal) FILTER (WHERE c.status = 'ativo' AND c.fim >= CURRENT_DATE), 0) AS valor_mensal_total
  FROM public.supplier_contracts c
  WHERE c.organization_id = public.get_user_organization_id();
$$;
