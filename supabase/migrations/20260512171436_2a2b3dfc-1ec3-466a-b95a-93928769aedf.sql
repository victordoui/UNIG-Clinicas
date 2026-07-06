
-- ===== Tables =====

CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  nome text NOT NULL,
  banco text,
  agencia text,
  conta text,
  tipo text NOT NULL DEFAULT 'corrente',
  saldo_inicial numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.accounts_payable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  supplier_id uuid,
  cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  numero_documento text,
  descricao text,
  categoria text,
  valor_total numeric NOT NULL CHECK (valor_total >= 0),
  valor_pago numeric NOT NULL DEFAULT 0,
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date NOT NULL,
  data_pagamento date,
  status text NOT NULL DEFAULT 'pendente',
  forma_pagamento text,
  observacoes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ap_org_status ON public.accounts_payable(organization_id, status);
CREATE INDEX idx_ap_vencimento ON public.accounts_payable(data_vencimento);
CREATE INDEX idx_ap_order ON public.accounts_payable(order_id);

CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  account_payable_id uuid NOT NULL REFERENCES public.accounts_payable(id) ON DELETE CASCADE,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  valor numeric NOT NULL CHECK (valor > 0),
  data_pagamento date NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento text NOT NULL DEFAULT 'pix',
  comprovante_url text,
  observacoes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pt_payable ON public.payment_transactions(account_payable_id);

-- ===== RLS =====

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- bank_accounts
CREATE POLICY "Org members view bank accounts" ON public.bank_accounts FOR SELECT TO authenticated
USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Admins insert bank accounts" ON public.bank_accounts FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid() AND get_current_user_role() = 'admin');

CREATE POLICY "Admins update bank accounts" ON public.bank_accounts FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

CREATE POLICY "Admins delete bank accounts" ON public.bank_accounts FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

-- accounts_payable
CREATE POLICY "Org members view payables" ON public.accounts_payable FOR SELECT TO authenticated
USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Staff insert payables" ON public.accounts_payable FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid()
            AND get_current_user_role() = ANY(ARRAY['admin','gerente']));

CREATE POLICY "Staff update payables" ON public.accounts_payable FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id() AND get_current_user_role() = ANY(ARRAY['admin','gerente']));

CREATE POLICY "Admins delete payables" ON public.accounts_payable FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

-- payment_transactions
CREATE POLICY "Org members view payments" ON public.payment_transactions FOR SELECT TO authenticated
USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Staff insert payments" ON public.payment_transactions FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid()
            AND get_current_user_role() = ANY(ARRAY['admin','gerente']));

CREATE POLICY "Admins delete payments" ON public.payment_transactions FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

-- ===== Triggers updated_at =====
CREATE TRIGGER trg_bank_accounts_updated BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_accounts_payable_updated BEFORE UPDATE ON public.accounts_payable
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Functions =====

CREATE OR REPLACE FUNCTION public.update_payable_status(_payable_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_pago numeric;
  v_venc date;
  v_status text;
  v_data_pag date;
BEGIN
  SELECT valor_total, data_vencimento INTO v_total, v_venc
  FROM public.accounts_payable WHERE id = _payable_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(SUM(valor),0), MAX(data_pagamento)
  INTO v_pago, v_data_pag
  FROM public.payment_transactions WHERE account_payable_id = _payable_id;

  IF v_pago >= v_total THEN
    v_status := 'pago';
  ELSIF v_pago > 0 THEN
    v_status := 'parcial';
  ELSIF v_venc < CURRENT_DATE THEN
    v_status := 'vencido';
  ELSE
    v_status := 'pendente';
  END IF;

  UPDATE public.accounts_payable
  SET valor_pago = v_pago,
      status = v_status,
      data_pagamento = CASE WHEN v_status = 'pago' THEN v_data_pag ELSE NULL END,
      updated_at = now()
  WHERE id = _payable_id;
END $$;

CREATE OR REPLACE FUNCTION public.trg_update_payable_after_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.update_payable_status(OLD.account_payable_id);
    RETURN OLD;
  ELSE
    PERFORM public.update_payable_status(NEW.account_payable_id);
    RETURN NEW;
  END IF;
END $$;

CREATE TRIGGER trg_payment_transactions_status
AFTER INSERT OR UPDATE OR DELETE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_update_payable_after_payment();

CREATE OR REPLACE FUNCTION public.generate_payable_from_order(_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.purchase_orders%ROWTYPE;
  v_request public.purchase_requests%ROWTYPE;
  v_payable_id uuid;
  v_dias int := 30;
  v_venc date;
BEGIN
  SELECT * INTO v_order FROM public.purchase_orders WHERE id = _order_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- evitar duplicidade
  SELECT id INTO v_payable_id FROM public.accounts_payable WHERE order_id = _order_id LIMIT 1;
  IF v_payable_id IS NOT NULL THEN RETURN v_payable_id; END IF;

  SELECT * INTO v_request FROM public.purchase_requests WHERE id = v_order.request_id;

  -- tentar parsear "30", "30 dias", "30/60", "à vista"
  IF v_order.condicao_pagamento ~ '^\s*(à vista|a vista|0)' THEN
    v_dias := 0;
  ELSIF v_order.condicao_pagamento ~ '\d+' THEN
    v_dias := COALESCE((regexp_match(v_order.condicao_pagamento, '(\d+)'))[1]::int, 30);
  END IF;

  v_venc := CURRENT_DATE + (v_dias || ' days')::interval;

  INSERT INTO public.accounts_payable (
    organization_id, order_id, supplier_id, cost_center_id,
    numero_documento, descricao, categoria,
    valor_total, data_emissao, data_vencimento,
    forma_pagamento, status, created_by
  ) VALUES (
    v_order.organization_id, v_order.id, v_order.supplier_id, v_order.cost_center_id,
    v_order.nota_fiscal_numero, COALESCE('Pedido ' || v_order.numero, 'Compra'),
    COALESCE(v_request.categoria, NULL),
    v_order.valor_total, CURRENT_DATE, v_venc::date,
    v_order.condicao_pagamento, 'pendente', v_order.emitido_por
  ) RETURNING id INTO v_payable_id;

  RETURN v_payable_id;
END $$;

CREATE OR REPLACE FUNCTION public.trg_generate_payable_on_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.divergencia = false THEN
    PERFORM public.generate_payable_from_order(NEW.order_id);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_purchase_receipts_payable
AFTER INSERT ON public.purchase_receipts
FOR EACH ROW EXECUTE FUNCTION public.trg_generate_payable_on_receipt();

CREATE OR REPLACE FUNCTION public.accounts_payable_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid := get_user_organization_id();
  v_result jsonb;
BEGIN
  IF v_org IS NULL THEN RETURN '{}'::jsonb; END IF;
  SELECT jsonb_build_object(
    'total_pendente', COALESCE(SUM(valor_total - valor_pago) FILTER (WHERE status IN ('pendente','parcial','vencido')), 0),
    'total_vencido', COALESCE(SUM(valor_total - valor_pago) FILTER (WHERE status = 'vencido' OR (status IN ('pendente','parcial') AND data_vencimento < CURRENT_DATE)), 0),
    'vence_7_dias', COALESCE(SUM(valor_total - valor_pago) FILTER (WHERE status IN ('pendente','parcial') AND data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + 7), 0),
    'vence_30_dias', COALESCE(SUM(valor_total - valor_pago) FILTER (WHERE status IN ('pendente','parcial') AND data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + 30), 0),
    'pago_mes', COALESCE(SUM(valor_pago) FILTER (WHERE status = 'pago' AND data_pagamento >= date_trunc('month', CURRENT_DATE)::date), 0),
    'count_vencido', COUNT(*) FILTER (WHERE status IN ('pendente','parcial') AND data_vencimento < CURRENT_DATE),
    'count_pendente', COUNT(*) FILTER (WHERE status IN ('pendente','parcial'))
  ) INTO v_result
  FROM public.accounts_payable
  WHERE organization_id = v_org;
  RETURN v_result;
END $$;

CREATE OR REPLACE FUNCTION public.cash_flow_projection(_dias int DEFAULT 30)
RETURNS TABLE(dia date, valor_a_pagar numeric, qtd bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH dias AS (
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + _dias, interval '1 day')::date AS d
  )
  SELECT d.d,
         COALESCE(SUM(ap.valor_total - ap.valor_pago), 0),
         COUNT(ap.id)
  FROM dias d
  LEFT JOIN public.accounts_payable ap
    ON ap.data_vencimento = d.d
   AND ap.organization_id = get_user_organization_id()
   AND ap.status IN ('pendente','parcial','vencido')
  GROUP BY d.d
  ORDER BY d.d;
$$;

-- ===== Storage bucket =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org members view payment receipts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-receipts' AND (storage.foldername(name))[1] = get_user_organization_id()::text);

CREATE POLICY "Staff upload payment receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-receipts'
            AND (storage.foldername(name))[1] = get_user_organization_id()::text
            AND get_current_user_role() = ANY(ARRAY['admin','gerente']));

CREATE POLICY "Staff delete payment receipts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'payment-receipts'
       AND (storage.foldername(name))[1] = get_user_organization_id()::text
       AND get_current_user_role() = ANY(ARRAY['admin','gerente']));
