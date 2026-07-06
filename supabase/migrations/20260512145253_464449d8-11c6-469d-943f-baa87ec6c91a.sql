
-- =========================================================
-- Sequence + helper for PO numbering
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS public.purchase_order_seq START 1;

-- =========================================================
-- purchase_quotes
-- =========================================================
CREATE TABLE public.purchase_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  valor_unitario numeric NOT NULL CHECK (valor_unitario >= 0),
  quantidade numeric NOT NULL CHECK (quantidade > 0),
  valor_total numeric GENERATED ALWAYS AS (valor_unitario * quantidade) STORED,
  prazo_entrega_dias integer,
  condicao_pagamento text,
  observacoes text,
  anexo_path text,
  status text NOT NULL DEFAULT 'recebida' CHECK (status IN ('recebida','escolhida','descartada')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_quotes_request ON public.purchase_quotes(request_id);
CREATE INDEX idx_purchase_quotes_org ON public.purchase_quotes(organization_id);

ALTER TABLE public.purchase_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view quotes"
  ON public.purchase_quotes FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Compras and admins insert quotes"
  ON public.purchase_quotes FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND created_by = auth.uid()
    AND get_current_user_role() = ANY (ARRAY['admin','gerente'])
  );

CREATE POLICY "Compras and admins update quotes"
  ON public.purchase_quotes FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_current_user_role() = ANY (ARRAY['admin','gerente'])
  );

CREATE POLICY "Admins delete quotes"
  ON public.purchase_quotes FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_current_user_role() = 'admin'
  );

CREATE TRIGGER purchase_quotes_updated_at
  BEFORE UPDATE ON public.purchase_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- purchase_orders
-- =========================================================
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  request_id uuid NOT NULL REFERENCES public.purchase_requests(id) ON DELETE RESTRICT,
  quote_id uuid NOT NULL REFERENCES public.purchase_quotes(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  organization_id uuid NOT NULL,
  valor_total numeric NOT NULL,
  quantidade numeric NOT NULL,
  prazo_entrega_dias integer,
  condicao_pagamento text,
  status text NOT NULL DEFAULT 'emitido'
    CHECK (status IN ('emitido','enviado_fornecedor','confirmado','recebido_parcial','recebido_total','cancelado')),
  nota_fiscal_numero text,
  nota_fiscal_path text,
  nota_fiscal_uploaded_at timestamptz,
  emitido_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_orders_request ON public.purchase_orders(request_id);
CREATE INDEX idx_purchase_orders_org ON public.purchase_orders(organization_id);
CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view orders"
  ON public.purchase_orders FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Compras and admins update orders"
  ON public.purchase_orders FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_current_user_role() = ANY (ARRAY['admin','gerente'])
  );

CREATE POLICY "Admins delete orders"
  ON public.purchase_orders FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_current_user_role() = 'admin'
  );
-- INSERT only via SECURITY DEFINER function create_purchase_order

CREATE OR REPLACE FUNCTION public.set_purchase_order_numero()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := 'PO-' || to_char(now(),'YYYYMM') || '-' || lpad(nextval('public.purchase_order_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER purchase_orders_set_numero
  BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_purchase_order_numero();

CREATE TRIGGER purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- purchase_receipts
-- =========================================================
CREATE TABLE public.purchase_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  quantidade_recebida numeric NOT NULL CHECK (quantidade_recebida > 0),
  data_recebimento timestamptz NOT NULL DEFAULT now(),
  recebido_por uuid NOT NULL,
  observacoes text,
  divergencia boolean NOT NULL DEFAULT false,
  divergencia_descricao text,
  movement_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_receipts_order ON public.purchase_receipts(order_id);
CREATE INDEX idx_purchase_receipts_org ON public.purchase_receipts(organization_id);

ALTER TABLE public.purchase_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view receipts"
  ON public.purchase_receipts FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Staff update receipts"
  ON public.purchase_receipts FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_current_user_role() = ANY (ARRAY['admin','gerente'])
  );
-- INSERT via SECURITY DEFINER function register_receipt

-- =========================================================
-- choose_quote
-- =========================================================
CREATE OR REPLACE FUNCTION public.choose_quote(_quote_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote public.purchase_quotes%ROWTYPE;
  v_request public.purchase_requests%ROWTYPE;
  v_role text;
BEGIN
  SELECT * INTO v_quote FROM public.purchase_quotes WHERE id = _quote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found'; END IF;

  IF v_quote.organization_id <> get_user_organization_id() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_role := get_current_user_role();
  IF v_role NOT IN ('admin','gerente') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT * INTO v_request FROM public.purchase_requests WHERE id = v_quote.request_id;
  IF v_request.status NOT IN ('aprovada'::purchase_status, 'em_cotacao'::purchase_status) THEN
    RAISE EXCEPTION 'Request must be approved or in quoting';
  END IF;

  UPDATE public.purchase_quotes
    SET status = CASE WHEN id = _quote_id THEN 'escolhida' ELSE 'descartada' END,
        updated_at = now()
    WHERE request_id = v_quote.request_id;

  UPDATE public.purchase_requests
    SET status = 'compra_realizada'::purchase_status, updated_at = now()
    WHERE id = v_quote.request_id;

  INSERT INTO public.purchase_request_history (request_id, organization_id, actor_id, event_type, from_status, to_status, payload)
  VALUES (v_quote.request_id, v_quote.organization_id, auth.uid(), 'cotacao_escolhida',
          v_request.status::text, 'compra_realizada',
          jsonb_build_object('quote_id', _quote_id, 'supplier_id', v_quote.supplier_id, 'valor_total', v_quote.valor_total));
END $$;

-- =========================================================
-- create_purchase_order
-- =========================================================
CREATE OR REPLACE FUNCTION public.create_purchase_order(_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote public.purchase_quotes%ROWTYPE;
  v_role text;
  v_order_id uuid;
BEGIN
  SELECT * INTO v_quote FROM public.purchase_quotes WHERE id = _quote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found'; END IF;
  IF v_quote.organization_id <> get_user_organization_id() THEN RAISE EXCEPTION 'Forbidden'; END IF;

  v_role := get_current_user_role();
  IF v_role NOT IN ('admin','gerente') THEN RAISE EXCEPTION 'Not allowed'; END IF;

  IF v_quote.status <> 'escolhida' THEN
    RAISE EXCEPTION 'Quote must be chosen first';
  END IF;

  IF EXISTS (SELECT 1 FROM public.purchase_orders WHERE quote_id = _quote_id) THEN
    RAISE EXCEPTION 'Order already exists for this quote';
  END IF;

  INSERT INTO public.purchase_orders (
    request_id, quote_id, supplier_id, organization_id,
    valor_total, quantidade, prazo_entrega_dias, condicao_pagamento,
    status, emitido_por
  ) VALUES (
    v_quote.request_id, v_quote.id, v_quote.supplier_id, v_quote.organization_id,
    v_quote.valor_total, v_quote.quantidade, v_quote.prazo_entrega_dias, v_quote.condicao_pagamento,
    'emitido', auth.uid()
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.purchase_request_history (request_id, organization_id, actor_id, event_type, payload)
  VALUES (v_quote.request_id, v_quote.organization_id, auth.uid(), 'pedido_emitido',
          jsonb_build_object('order_id', v_order_id, 'supplier_id', v_quote.supplier_id, 'valor_total', v_quote.valor_total));

  RETURN v_order_id;
END $$;

-- =========================================================
-- register_receipt
-- =========================================================
CREATE OR REPLACE FUNCTION public.register_receipt(
  _order_id uuid,
  _quantidade numeric,
  _observacoes text DEFAULT NULL,
  _divergencia boolean DEFAULT false,
  _divergencia_desc text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.purchase_orders%ROWTYPE;
  v_role text;
  v_total_recebido numeric;
  v_new_status text;
  v_receipt_id uuid;
BEGIN
  SELECT * INTO v_order FROM public.purchase_orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.organization_id <> get_user_organization_id() THEN RAISE EXCEPTION 'Forbidden'; END IF;

  v_role := get_current_user_role();
  IF v_role NOT IN ('admin','gerente') THEN RAISE EXCEPTION 'Not allowed'; END IF;

  IF v_order.status = 'cancelado' OR v_order.status = 'recebido_total' THEN
    RAISE EXCEPTION 'Order is closed';
  END IF;

  IF _quantidade <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;

  INSERT INTO public.purchase_receipts (
    order_id, organization_id, quantidade_recebida, recebido_por,
    observacoes, divergencia, divergencia_descricao
  ) VALUES (
    _order_id, v_order.organization_id, _quantidade, auth.uid(),
    _observacoes, COALESCE(_divergencia,false), _divergencia_desc
  ) RETURNING id INTO v_receipt_id;

  SELECT COALESCE(SUM(quantidade_recebida),0) INTO v_total_recebido
    FROM public.purchase_receipts WHERE order_id = _order_id;

  IF v_total_recebido >= v_order.quantidade THEN
    v_new_status := 'recebido_total';
    UPDATE public.purchase_requests
      SET status = 'recebida'::purchase_status, updated_at = now()
      WHERE id = v_order.request_id;
    INSERT INTO public.purchase_request_history (request_id, organization_id, actor_id, event_type, to_status, payload)
    VALUES (v_order.request_id, v_order.organization_id, auth.uid(), 'recebimento_total', 'recebida',
            jsonb_build_object('order_id', _order_id, 'receipt_id', v_receipt_id, 'quantidade', _quantidade));
  ELSE
    v_new_status := 'recebido_parcial';
    INSERT INTO public.purchase_request_history (request_id, organization_id, actor_id, event_type, payload)
    VALUES (v_order.request_id, v_order.organization_id, auth.uid(), 'recebimento_parcial',
            jsonb_build_object('order_id', _order_id, 'receipt_id', v_receipt_id, 'quantidade', _quantidade));
  END IF;

  UPDATE public.purchase_orders
    SET status = v_new_status, updated_at = now()
    WHERE id = _order_id;

  RETURN jsonb_build_object('success', true, 'receipt_id', v_receipt_id, 'order_status', v_new_status, 'total_recebido', v_total_recebido);
END $$;
