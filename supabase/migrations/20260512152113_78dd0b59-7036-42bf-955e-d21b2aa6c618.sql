
-- =========================================================
-- FASE 6: COST CENTERS, BUDGETS, SUPPLIER CONTRACTS
-- =========================================================

-- 1. Cost centers
CREATE TABLE public.cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  nome text NOT NULL,
  codigo text NOT NULL,
  responsavel_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, codigo)
);

ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view cost centers"
  ON public.cost_centers FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Admins/gerentes insert cost centers"
  ON public.cost_centers FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_current_user_role() IN ('admin','gerente')
  );

CREATE POLICY "Admins/gerentes update cost centers"
  ON public.cost_centers FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_current_user_role() IN ('admin','gerente')
  );

CREATE POLICY "Admins delete cost centers"
  ON public.cost_centers FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_current_user_role() = 'admin'
  );

CREATE TRIGGER trg_cost_centers_updated_at
  BEFORE UPDATE ON public.cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Budgets
CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  category text,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  valor_planejado numeric NOT NULL CHECK (valor_planejado >= 0),
  valor_alerta_percent numeric NOT NULL DEFAULT 80 CHECK (valor_alerta_percent BETWEEN 0 AND 100),
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_budgets_org_period ON public.budgets(organization_id, periodo_inicio, periodo_fim);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view budgets"
  ON public.budgets FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Admins/gerentes insert budgets"
  ON public.budgets FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND created_by = auth.uid()
    AND get_current_user_role() IN ('admin','gerente')
  );

CREATE POLICY "Admins/gerentes update budgets"
  ON public.budgets FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_current_user_role() IN ('admin','gerente')
  );

CREATE POLICY "Admins delete budgets"
  ON public.budgets FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_current_user_role() = 'admin'
  );

CREATE TRIGGER trg_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Supplier contracts
CREATE TABLE public.supplier_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  numero text NOT NULL,
  inicio date NOT NULL,
  fim date NOT NULL,
  condicao_pagamento text,
  desconto_percent numeric DEFAULT 0 CHECK (desconto_percent BETWEEN 0 AND 100),
  arquivo_url text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','encerrado','suspenso')),
  observacoes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, numero)
);

CREATE INDEX idx_contracts_supplier ON public.supplier_contracts(supplier_id);
CREATE INDEX idx_contracts_org_status ON public.supplier_contracts(organization_id, status);

ALTER TABLE public.supplier_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view contracts"
  ON public.supplier_contracts FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Admins/gerentes insert contracts"
  ON public.supplier_contracts FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND created_by = auth.uid()
    AND get_current_user_role() IN ('admin','gerente')
  );

CREATE POLICY "Admins/gerentes update contracts"
  ON public.supplier_contracts FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_current_user_role() IN ('admin','gerente')
  );

CREATE POLICY "Admins delete contracts"
  ON public.supplier_contracts FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_current_user_role() = 'admin'
  );

CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON public.supplier_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Contract items
CREATE TABLE public.contract_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.supplier_contracts(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  product_id uuid,
  descricao text,
  preco_unitario numeric NOT NULL CHECK (preco_unitario >= 0),
  quantidade_minima numeric DEFAULT 1,
  prazo_entrega_dias integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_items_contract ON public.contract_items(contract_id);
CREATE INDEX idx_contract_items_product ON public.contract_items(product_id);

ALTER TABLE public.contract_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view contract items"
  ON public.contract_items FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Admins/gerentes insert contract items"
  ON public.contract_items FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_current_user_role() IN ('admin','gerente')
  );

CREATE POLICY "Admins/gerentes update contract items"
  ON public.contract_items FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_current_user_role() IN ('admin','gerente')
  );

CREATE POLICY "Admins delete contract items"
  ON public.contract_items FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_current_user_role() = 'admin'
  );

CREATE TRIGGER trg_contract_items_updated_at
  BEFORE UPDATE ON public.contract_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Optional columns on existing tables
ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL;

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.supplier_contracts(id) ON DELETE SET NULL;

-- 6. Functions

-- Total spent on a budget (sum POs that match cost_center and/or category in period)
CREATE OR REPLACE FUNCTION public.budget_consumed(_budget_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_b public.budgets%ROWTYPE;
  v_total numeric;
BEGIN
  SELECT * INTO v_b FROM public.budgets WHERE id = _budget_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT COALESCE(SUM(po.valor_total), 0)
  INTO v_total
  FROM public.purchase_orders po
  LEFT JOIN public.purchase_requests pr ON pr.id = po.request_id
  WHERE po.organization_id = v_b.organization_id
    AND po.created_at::date BETWEEN v_b.periodo_inicio AND v_b.periodo_fim
    AND (v_b.cost_center_id IS NULL OR po.cost_center_id = v_b.cost_center_id)
    AND (v_b.category IS NULL OR pr.categoria = v_b.category);

  RETURN v_total;
END $$;

-- All active budgets with consumption
CREATE OR REPLACE FUNCTION public.budget_status()
RETURNS TABLE (
  id uuid,
  cost_center_id uuid,
  cost_center_nome text,
  category text,
  periodo_inicio date,
  periodo_fim date,
  valor_planejado numeric,
  valor_consumido numeric,
  pct_consumido numeric,
  valor_alerta_percent numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id,
         b.cost_center_id,
         cc.nome,
         b.category,
         b.periodo_inicio,
         b.periodo_fim,
         b.valor_planejado,
         public.budget_consumed(b.id) AS valor_consumido,
         CASE WHEN b.valor_planejado > 0
              THEN ROUND(100.0 * public.budget_consumed(b.id) / b.valor_planejado, 2)
              ELSE 0 END AS pct_consumido,
         b.valor_alerta_percent
  FROM public.budgets b
  LEFT JOIN public.cost_centers cc ON cc.id = b.cost_center_id
  WHERE b.organization_id = get_user_organization_id()
    AND b.ativo = true
  ORDER BY b.periodo_inicio DESC;
$$;

-- Active contract price for a supplier+product
CREATE OR REPLACE FUNCTION public.active_contract_price(_supplier_id uuid, _product_id uuid)
RETURNS TABLE (
  contract_id uuid,
  numero text,
  preco_unitario numeric,
  desconto_percent numeric,
  prazo_entrega_dias integer,
  fim date
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sc.id, sc.numero, ci.preco_unitario, sc.desconto_percent, ci.prazo_entrega_dias, sc.fim
  FROM public.supplier_contracts sc
  JOIN public.contract_items ci ON ci.contract_id = sc.id
  WHERE sc.organization_id = get_user_organization_id()
    AND sc.supplier_id = _supplier_id
    AND ci.product_id = _product_id
    AND sc.status = 'ativo'
    AND CURRENT_DATE BETWEEN sc.inicio AND sc.fim
  ORDER BY ci.preco_unitario ASC
  LIMIT 1;
$$;

-- 7. Storage bucket for contract files
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org members view contract files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'contracts'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

CREATE POLICY "Admins/gerentes upload contract files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contracts'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
    AND get_current_user_role() IN ('admin','gerente')
  );

CREATE POLICY "Admins/gerentes update contract files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'contracts'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
    AND get_current_user_role() IN ('admin','gerente')
  );

CREATE POLICY "Admins/gerentes delete contract files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'contracts'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
    AND get_current_user_role() IN ('admin','gerente')
  );
