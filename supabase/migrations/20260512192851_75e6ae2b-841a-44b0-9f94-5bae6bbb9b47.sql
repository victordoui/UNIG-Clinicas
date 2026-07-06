
-- ============== SEQUENCES ==============
CREATE SEQUENCE IF NOT EXISTS public.sales_order_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.invoice_seq START 1;

-- ============== CUSTOMERS ==============
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  tipo_pessoa text NOT NULL DEFAULT 'PJ' CHECK (tipo_pessoa IN ('PF','PJ')),
  documento text,
  nome text NOT NULL,
  nome_fantasia text,
  email text,
  telefone text,
  endereco jsonb NOT NULL DEFAULT '{}'::jsonb,
  limite_credito numeric NOT NULL DEFAULT 0,
  prazo_padrao_dias integer NOT NULL DEFAULT 30,
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_org ON public.customers(organization_id);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_select ON public.customers FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY customers_insert ON public.customers FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid());
CREATE POLICY customers_update ON public.customers FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY customers_delete ON public.customers FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== PRICE LISTS ==============
CREATE TABLE public.price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  vigencia_inicio date NOT NULL DEFAULT CURRENT_DATE,
  vigencia_fim date,
  padrao boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY pl_select ON public.price_lists FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY pl_insert ON public.price_lists FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid() AND get_current_user_role() = 'admin');
CREATE POLICY pl_update ON public.price_lists FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');
CREATE POLICY pl_delete ON public.price_lists FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');
CREATE TRIGGER trg_pl_updated BEFORE UPDATE ON public.price_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.price_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  price_list_id uuid NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  preco numeric NOT NULL,
  desconto_percent numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (price_list_id, product_id)
);
ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY pli_select ON public.price_list_items FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY pli_insert ON public.price_list_items FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');
CREATE POLICY pli_update ON public.price_list_items FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');
CREATE POLICY pli_delete ON public.price_list_items FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');
CREATE TRIGGER trg_pli_updated BEFORE UPDATE ON public.price_list_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.customer_price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  price_list_id uuid NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, price_list_id)
);
ALTER TABLE public.customer_price_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY cpl_select ON public.customer_price_lists FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY cpl_insert ON public.customer_price_lists FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());
CREATE POLICY cpl_delete ON public.customer_price_lists FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));

-- ============== SALES ORDERS ==============
CREATE TABLE public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  numero text,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  warehouse_id uuid REFERENCES public.warehouses(id),
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','confirmado','separado','expedido','faturado','cancelado')),
  data_pedido date NOT NULL DEFAULT CURRENT_DATE,
  data_prevista_entrega date,
  condicao_pagamento text,
  prazo_pagamento_dias integer NOT NULL DEFAULT 30,
  valor_total numeric NOT NULL DEFAULT 0,
  desconto_total numeric NOT NULL DEFAULT 0,
  observacao text,
  created_by uuid NOT NULL,
  confirmado_em timestamptz,
  separado_em timestamptz,
  expedido_em timestamptz,
  faturado_em timestamptz,
  cancelado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sales_orders_org ON public.sales_orders(organization_id);
CREATE INDEX idx_sales_orders_customer ON public.sales_orders(customer_id);
CREATE INDEX idx_sales_orders_status ON public.sales_orders(status);
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY so_select ON public.sales_orders FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY so_insert ON public.sales_orders FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid());
CREATE POLICY so_update ON public.sales_orders FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY so_delete ON public.sales_orders FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');
CREATE TRIGGER trg_so_updated BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.set_sales_order_numero()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := 'VEN-' || to_char(now(),'YYYYMM') || '-' || lpad(nextval('public.sales_order_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_so_numero BEFORE INSERT ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_sales_order_numero();

CREATE TABLE public.sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  batch_id uuid,
  quantidade numeric NOT NULL,
  quantidade_separada numeric NOT NULL DEFAULT 0,
  preco_unitario numeric NOT NULL,
  desconto_percent numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_soi_order ON public.sales_order_items(order_id);
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY soi_select ON public.sales_order_items FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY soi_insert ON public.sales_order_items FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());
CREATE POLICY soi_update ON public.sales_order_items FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY soi_delete ON public.sales_order_items FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE TRIGGER trg_soi_updated BEFORE UPDATE ON public.sales_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== SHIPMENTS ==============
CREATE TABLE public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES public.warehouses(id),
  status text NOT NULL DEFAULT 'expedida' CHECK (status IN ('preparada','expedida','entregue','cancelada')),
  transportadora text,
  rastreio text,
  expedida_em timestamptz NOT NULL DEFAULT now(),
  expedida_por uuid NOT NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY ship_select ON public.shipments FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY ship_insert ON public.shipments FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND expedida_por = auth.uid());
CREATE POLICY ship_update ON public.shipments FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY ship_delete ON public.shipments FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

-- ============== INVOICES ==============
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  numero text,
  order_id uuid NOT NULL REFERENCES public.sales_orders(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  valor_total numeric NOT NULL,
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','paga','parcial','vencida','cancelada')),
  pdf_url text,
  observacao text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_org ON public.invoices(organization_id);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY inv_select ON public.invoices FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY inv_insert ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid());
CREATE POLICY inv_update ON public.invoices FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY inv_delete ON public.invoices FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');
CREATE TRIGGER trg_inv_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.set_invoice_numero()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := 'FAT-' || to_char(now(),'YYYYMM') || '-' || lpad(nextval('public.invoice_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_inv_numero BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_invoice_numero();

-- ============== ACCOUNTS RECEIVABLE ==============
CREATE TABLE public.accounts_receivable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  numero_documento text,
  descricao text,
  valor_total numeric NOT NULL,
  valor_recebido numeric NOT NULL DEFAULT 0,
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date NOT NULL,
  data_recebimento date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','parcial','recebido','vencido','cancelado')),
  forma_pagamento text,
  observacoes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ar_org ON public.accounts_receivable(organization_id);
CREATE INDEX idx_ar_status ON public.accounts_receivable(status);
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
CREATE POLICY ar_select ON public.accounts_receivable FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY ar_insert ON public.accounts_receivable FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid()
              AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY ar_update ON public.accounts_receivable FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY ar_delete ON public.accounts_receivable FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');
CREATE TRIGGER trg_ar_updated BEFORE UPDATE ON public.accounts_receivable
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== RECEIPT TRANSACTIONS ==============
CREATE TABLE public.receipt_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  account_receivable_id uuid NOT NULL REFERENCES public.accounts_receivable(id) ON DELETE CASCADE,
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  valor numeric NOT NULL,
  data_recebimento date NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento text,
  numero_documento text,
  observacoes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.receipt_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY rt_select ON public.receipt_transactions FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY rt_insert ON public.receipt_transactions FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid()
              AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY rt_delete ON public.receipt_transactions FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

-- ============== RECEIVABLE STATUS ==============
CREATE OR REPLACE FUNCTION public.update_receivable_status(_ar_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total numeric; v_rec numeric; v_venc date; v_status text; v_data date;
BEGIN
  SELECT valor_total, data_vencimento INTO v_total, v_venc
  FROM public.accounts_receivable WHERE id = _ar_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(SUM(valor),0), MAX(data_recebimento)
  INTO v_rec, v_data
  FROM public.receipt_transactions WHERE account_receivable_id = _ar_id;

  IF v_rec >= v_total THEN v_status := 'recebido';
  ELSIF v_rec > 0 THEN v_status := 'parcial';
  ELSIF v_venc < CURRENT_DATE THEN v_status := 'vencido';
  ELSE v_status := 'pendente';
  END IF;

  UPDATE public.accounts_receivable
  SET valor_recebido = v_rec,
      status = v_status,
      data_recebimento = CASE WHEN v_status = 'recebido' THEN v_data ELSE NULL END,
      updated_at = now()
  WHERE id = _ar_id;

  -- atualizar invoice
  UPDATE public.invoices i
  SET status = CASE
                 WHEN v_status = 'recebido' THEN 'paga'
                 WHEN v_status = 'parcial' THEN 'parcial'
                 WHEN v_status = 'vencido' THEN 'vencida'
                 ELSE 'aberta'
               END,
      updated_at = now()
  WHERE i.id = (SELECT invoice_id FROM public.accounts_receivable WHERE id = _ar_id);
END $$;

CREATE OR REPLACE FUNCTION public.trg_update_receivable_after_receipt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.update_receivable_status(OLD.account_receivable_id);
    RETURN OLD;
  ELSE
    PERFORM public.update_receivable_status(NEW.account_receivable_id);
    RETURN NEW;
  END IF;
END $$;
CREATE TRIGGER trg_rt_after_change
  AFTER INSERT OR UPDATE OR DELETE ON public.receipt_transactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_receivable_after_receipt();

-- ============== BUSINESS FUNCTIONS ==============
CREATE OR REPLACE FUNCTION public.confirm_sales_order(_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_o public.sales_orders%ROWTYPE; v_role text; rec RECORD; v_qty numeric;
BEGIN
  SELECT * INTO v_o FROM public.sales_orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_o.organization_id <> get_user_organization_id() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  v_role := get_current_user_role();
  IF v_role NOT IN ('admin','gerente') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF v_o.status <> 'rascunho' THEN RAISE EXCEPTION 'Order not in draft'; END IF;
  IF v_o.warehouse_id IS NULL THEN RAISE EXCEPTION 'Warehouse required'; END IF;

  FOR rec IN SELECT * FROM public.sales_order_items WHERE order_id = _order_id LOOP
    SELECT COALESCE(quantidade,0) INTO v_qty
      FROM public.product_stock_by_location
      WHERE product_id = rec.product_id AND warehouse_id = v_o.warehouse_id AND bin_id IS NULL;
    IF COALESCE(v_qty,0) < rec.quantidade THEN
      RAISE EXCEPTION 'Estoque insuficiente para o produto %', rec.product_id;
    END IF;
  END LOOP;

  UPDATE public.sales_orders
    SET status = 'confirmado', confirmado_em = now(), updated_at = now()
    WHERE id = _order_id;

  RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION public.pick_sales_order(_order_id uuid, _items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_o public.sales_orders%ROWTYPE; v_role text; v_item jsonb;
BEGIN
  SELECT * INTO v_o FROM public.sales_orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_o.organization_id <> get_user_organization_id() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  v_role := get_current_user_role();
  IF v_role NOT IN ('admin','gerente') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF v_o.status <> 'confirmado' THEN RAISE EXCEPTION 'Order not confirmed'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    UPDATE public.sales_order_items
      SET quantidade_separada = (v_item->>'quantidade_separada')::numeric,
          updated_at = now()
      WHERE id = (v_item->>'id')::uuid AND order_id = _order_id;
  END LOOP;

  UPDATE public.sales_orders
    SET status = 'separado', separado_em = now(), updated_at = now()
    WHERE id = _order_id;

  RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION public.ship_sales_order(_order_id uuid, _transportadora text DEFAULT NULL, _rastreio text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_o public.sales_orders%ROWTYPE; v_role text; rec RECORD;
  v_qty numeric; v_prev numeric; v_ship_id uuid;
BEGIN
  SELECT * INTO v_o FROM public.sales_orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_o.organization_id <> get_user_organization_id() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  v_role := get_current_user_role();
  IF v_role NOT IN ('admin','gerente') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF v_o.status <> 'separado' THEN RAISE EXCEPTION 'Order not picked'; END IF;

  INSERT INTO public.shipments (organization_id, order_id, warehouse_id, status, transportadora, rastreio, expedida_por)
  VALUES (v_o.organization_id, v_o.id, v_o.warehouse_id, 'expedida', _transportadora, _rastreio, auth.uid())
  RETURNING id INTO v_ship_id;

  FOR rec IN SELECT * FROM public.sales_order_items WHERE order_id = _order_id LOOP
    v_qty := COALESCE(rec.quantidade_separada, rec.quantidade);
    IF v_qty <= 0 THEN CONTINUE; END IF;

    UPDATE public.product_stock_by_location
      SET quantidade = quantidade - v_qty, updated_at = now()
      WHERE product_id = rec.product_id AND warehouse_id = v_o.warehouse_id AND bin_id IS NULL;

    SELECT current_stock INTO v_prev FROM public.products WHERE id = rec.product_id;
    INSERT INTO public.movements (
      organization_id, product_id, type, quantity,
      previous_stock, new_stock, reason, created_by,
      warehouse_id, batch_id
    ) VALUES (
      v_o.organization_id, rec.product_id, 'saida', v_qty,
      COALESCE(v_prev,0), COALESCE(v_prev,0) - v_qty,
      'Venda ' || COALESCE(v_o.numero, _order_id::text),
      auth.uid(), v_o.warehouse_id, rec.batch_id
    );
    UPDATE public.products
      SET current_stock = COALESCE(current_stock,0) - v_qty, updated_at = now()
      WHERE id = rec.product_id;
  END LOOP;

  UPDATE public.sales_orders
    SET status = 'expedido', expedido_em = now(), updated_at = now()
    WHERE id = _order_id;

  RETURN jsonb_build_object('success', true, 'shipment_id', v_ship_id);
END $$;

CREATE OR REPLACE FUNCTION public.invoice_sales_order(_order_id uuid, _data_vencimento date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_o public.sales_orders%ROWTYPE; v_c public.customers%ROWTYPE;
  v_role text; v_inv_id uuid; v_ar_id uuid; v_venc date;
BEGIN
  SELECT * INTO v_o FROM public.sales_orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_o.organization_id <> get_user_organization_id() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  v_role := get_current_user_role();
  IF v_role NOT IN ('admin','gerente') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF v_o.status NOT IN ('expedido','separado') THEN RAISE EXCEPTION 'Order not ready to invoice'; END IF;

  IF EXISTS (SELECT 1 FROM public.invoices WHERE order_id = _order_id) THEN
    RAISE EXCEPTION 'Order already invoiced';
  END IF;

  SELECT * INTO v_c FROM public.customers WHERE id = v_o.customer_id;
  v_venc := COALESCE(_data_vencimento, CURRENT_DATE + COALESCE(v_o.prazo_pagamento_dias, v_c.prazo_padrao_dias, 30));

  INSERT INTO public.invoices (
    organization_id, order_id, customer_id, valor_total,
    data_emissao, data_vencimento, status, created_by
  ) VALUES (
    v_o.organization_id, v_o.id, v_o.customer_id, v_o.valor_total,
    CURRENT_DATE, v_venc, 'aberta', auth.uid()
  ) RETURNING id INTO v_inv_id;

  INSERT INTO public.accounts_receivable (
    organization_id, invoice_id, customer_id, descricao,
    valor_total, data_emissao, data_vencimento, status, created_by
  ) VALUES (
    v_o.organization_id, v_inv_id, v_o.customer_id,
    'Fatura pedido ' || COALESCE(v_o.numero, _order_id::text),
    v_o.valor_total, CURRENT_DATE, v_venc, 'pendente', auth.uid()
  ) RETURNING id INTO v_ar_id;

  UPDATE public.sales_orders SET status = 'faturado', faturado_em = now(), updated_at = now()
    WHERE id = _order_id;

  RETURN jsonb_build_object('success', true, 'invoice_id', v_inv_id, 'receivable_id', v_ar_id);
END $$;

CREATE OR REPLACE FUNCTION public.register_sales_receipt(
  _ar_id uuid, _valor numeric, _data date, _forma text DEFAULT NULL, _bank_account_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ar public.accounts_receivable%ROWTYPE; v_role text; v_id uuid;
BEGIN
  SELECT * INTO v_ar FROM public.accounts_receivable WHERE id = _ar_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Receivable not found'; END IF;
  IF v_ar.organization_id <> get_user_organization_id() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  v_role := get_current_user_role();
  IF v_role NOT IN ('admin','gerente') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _valor <= 0 THEN RAISE EXCEPTION 'Valor must be positive'; END IF;

  INSERT INTO public.receipt_transactions (
    organization_id, account_receivable_id, bank_account_id, valor,
    data_recebimento, forma_pagamento, created_by
  ) VALUES (
    v_ar.organization_id, _ar_id, _bank_account_id, _valor,
    COALESCE(_data, CURRENT_DATE), _forma, auth.uid()
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'transaction_id', v_id);
END $$;

-- ============== STORAGE BUCKET ==============
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org members read invoices" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'invoices');
CREATE POLICY "Staff write invoices" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'invoices' AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY "Staff update invoices" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'invoices' AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY "Admin delete invoices" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'invoices' AND get_current_user_role() = 'admin');
