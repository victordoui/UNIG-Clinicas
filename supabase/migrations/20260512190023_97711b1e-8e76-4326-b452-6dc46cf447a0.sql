
-- =========================================================
-- Fase 11: Multi-local, logística e rastreabilidade
-- =========================================================

-- 1) WAREHOUSES
CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  nome text NOT NULL,
  codigo text,
  tipo text NOT NULL DEFAULT 'cd',
  endereco jsonb DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  padrao boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_warehouses_org ON public.warehouses(organization_id);
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "warehouses_select" ON public.warehouses FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "warehouses_insert" ON public.warehouses FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');
CREATE POLICY "warehouses_update" ON public.warehouses FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');
CREATE POLICY "warehouses_delete" ON public.warehouses FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

CREATE TRIGGER trg_warehouses_updated BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) WAREHOUSE BINS
CREATE TABLE public.warehouse_bins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  corredor text,
  prateleira text,
  posicao text,
  capacidade numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, codigo)
);
CREATE INDEX idx_bins_warehouse ON public.warehouse_bins(warehouse_id);
ALTER TABLE public.warehouse_bins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bins_select" ON public.warehouse_bins FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "bins_insert" ON public.warehouse_bins FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY "bins_update" ON public.warehouse_bins FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY "bins_delete" ON public.warehouse_bins FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

CREATE TRIGGER trg_bins_updated BEFORE UPDATE ON public.warehouse_bins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) PRODUCT STOCK BY LOCATION
CREATE TABLE public.product_stock_by_location (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  bin_id uuid REFERENCES public.warehouse_bins(id) ON DELETE SET NULL,
  quantidade numeric NOT NULL DEFAULT 0,
  reservado numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_psl ON public.product_stock_by_location(product_id, warehouse_id, COALESCE(bin_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX idx_psl_product ON public.product_stock_by_location(product_id);
CREATE INDEX idx_psl_warehouse ON public.product_stock_by_location(warehouse_id);
ALTER TABLE public.product_stock_by_location ENABLE ROW LEVEL SECURITY;

CREATE POLICY "psl_select" ON public.product_stock_by_location FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "psl_insert" ON public.product_stock_by_location FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());
CREATE POLICY "psl_update" ON public.product_stock_by_location FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "psl_delete" ON public.product_stock_by_location FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

CREATE TRIGGER trg_psl_updated BEFORE UPDATE ON public.product_stock_by_location
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) PRODUCT BATCHES
CREATE TABLE public.product_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  lote text NOT NULL,
  validade date,
  fabricacao date,
  supplier_id uuid,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, lote)
);
CREATE INDEX idx_batches_product ON public.product_batches(product_id);
CREATE INDEX idx_batches_validade ON public.product_batches(validade);
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "batches_select" ON public.product_batches FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "batches_insert" ON public.product_batches FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());
CREATE POLICY "batches_update" ON public.product_batches FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "batches_delete" ON public.product_batches FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

CREATE TRIGGER trg_batches_updated BEFORE UPDATE ON public.product_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) BATCH STOCK BY LOCATION
CREATE TABLE public.batch_stock_by_location (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  batch_id uuid NOT NULL REFERENCES public.product_batches(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantidade numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, warehouse_id)
);
CREATE INDEX idx_bsl_batch ON public.batch_stock_by_location(batch_id);
ALTER TABLE public.batch_stock_by_location ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bsl_select" ON public.batch_stock_by_location FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "bsl_insert" ON public.batch_stock_by_location FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());
CREATE POLICY "bsl_update" ON public.batch_stock_by_location FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "bsl_delete" ON public.batch_stock_by_location FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

CREATE TRIGGER trg_bsl_updated BEFORE UPDATE ON public.batch_stock_by_location
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) STOCK TRANSFERS
CREATE TABLE public.stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  numero text,
  origem_id uuid NOT NULL REFERENCES public.warehouses(id),
  destino_id uuid NOT NULL REFERENCES public.warehouses(id),
  status text NOT NULL DEFAULT 'rascunho',
  observacao text,
  enviada_em timestamptz,
  enviada_por uuid,
  recebida_em timestamptz,
  recebida_por uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (origem_id <> destino_id)
);
CREATE INDEX idx_transfers_org ON public.stock_transfers(organization_id);
CREATE INDEX idx_transfers_status ON public.stock_transfers(status);
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transfers_select" ON public.stock_transfers FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "transfers_insert" ON public.stock_transfers FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());
CREATE POLICY "transfers_update" ON public.stock_transfers FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "transfers_delete" ON public.stock_transfers FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

CREATE TRIGGER trg_transfers_updated BEFORE UPDATE ON public.stock_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) STOCK TRANSFER ITEMS
CREATE TABLE public.stock_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  transfer_id uuid NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  batch_id uuid REFERENCES public.product_batches(id),
  quantidade_enviada numeric NOT NULL DEFAULT 0,
  quantidade_recebida numeric,
  divergencia numeric,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sti_transfer ON public.stock_transfer_items(transfer_id);
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sti_select" ON public.stock_transfer_items FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "sti_insert" ON public.stock_transfer_items FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());
CREATE POLICY "sti_update" ON public.stock_transfer_items FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "sti_delete" ON public.stock_transfer_items FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE TRIGGER trg_sti_updated BEFORE UPDATE ON public.stock_transfer_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Aditivas em products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS controla_lote boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS controla_validade boolean NOT NULL DEFAULT false;

-- 9) Aditivas em movements
ALTER TABLE public.movements
  ADD COLUMN IF NOT EXISTS warehouse_id uuid,
  ADD COLUMN IF NOT EXISTS bin_id uuid,
  ADD COLUMN IF NOT EXISTS batch_id uuid,
  ADD COLUMN IF NOT EXISTS transfer_id uuid;

-- 10) Sequência de número de transferência
CREATE SEQUENCE IF NOT EXISTS public.stock_transfer_seq START 1;

CREATE OR REPLACE FUNCTION public.set_stock_transfer_numero()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := 'TRF-' || to_char(now(),'YYYYMM') || '-' || lpad(nextval('public.stock_transfer_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_set_transfer_numero BEFORE INSERT ON public.stock_transfers
  FOR EACH ROW EXECUTE FUNCTION public.set_stock_transfer_numero();

-- 11) FUNÇÕES DE NEGÓCIO

-- Enviar transferência
CREATE OR REPLACE FUNCTION public.transfer_send(_transfer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_t public.stock_transfers%ROWTYPE;
  v_role text;
  rec RECORD;
  v_qty numeric;
  v_prev numeric;
BEGIN
  SELECT * INTO v_t FROM public.stock_transfers WHERE id = _transfer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF v_t.organization_id <> get_user_organization_id() THEN RAISE EXCEPTION 'Forbidden'; END IF;

  v_role := get_current_user_role();
  IF v_role NOT IN ('admin','gerente') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF v_t.status <> 'rascunho' THEN RAISE EXCEPTION 'Transfer must be in draft'; END IF;

  FOR rec IN
    SELECT * FROM public.stock_transfer_items WHERE transfer_id = _transfer_id
  LOOP
    IF rec.quantidade_enviada <= 0 THEN
      RAISE EXCEPTION 'Item with non-positive quantity';
    END IF;

    SELECT COALESCE(quantidade,0) INTO v_qty
      FROM public.product_stock_by_location
      WHERE product_id = rec.product_id AND warehouse_id = v_t.origem_id AND bin_id IS NULL;

    IF COALESCE(v_qty,0) < rec.quantidade_enviada THEN
      RAISE EXCEPTION 'Insufficient stock for product %', rec.product_id;
    END IF;

    UPDATE public.product_stock_by_location
      SET quantidade = quantidade - rec.quantidade_enviada
      WHERE product_id = rec.product_id AND warehouse_id = v_t.origem_id AND bin_id IS NULL;

    -- Movement
    SELECT current_stock INTO v_prev FROM public.products WHERE id = rec.product_id;
    INSERT INTO public.movements (
      organization_id, product_id, type, quantity,
      previous_stock, new_stock, reason, created_by,
      warehouse_id, transfer_id
    ) VALUES (
      v_t.organization_id, rec.product_id, 'saida', rec.quantidade_enviada,
      COALESCE(v_prev,0), COALESCE(v_prev,0) - rec.quantidade_enviada,
      'Transferência ' || COALESCE(v_t.numero, _transfer_id::text) || ' (envio)',
      auth.uid(), v_t.origem_id, v_t.id
    );

    UPDATE public.products SET current_stock = COALESCE(current_stock,0) - rec.quantidade_enviada, updated_at = now()
      WHERE id = rec.product_id;
  END LOOP;

  UPDATE public.stock_transfers
    SET status = 'em_transito', enviada_em = now(), enviada_por = auth.uid(), updated_at = now()
    WHERE id = _transfer_id;

  RETURN jsonb_build_object('success', true);
END $$;

-- Receber transferência
CREATE OR REPLACE FUNCTION public.transfer_receive(_transfer_id uuid, _items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_t public.stock_transfers%ROWTYPE;
  v_role text;
  rec RECORD;
  v_recebido numeric;
  v_div numeric;
  v_prev numeric;
BEGIN
  SELECT * INTO v_t FROM public.stock_transfers WHERE id = _transfer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF v_t.organization_id <> get_user_organization_id() THEN RAISE EXCEPTION 'Forbidden'; END IF;

  v_role := get_current_user_role();
  IF v_role NOT IN ('admin','gerente') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF v_t.status <> 'em_transito' THEN RAISE EXCEPTION 'Transfer must be in transit'; END IF;

  FOR rec IN
    SELECT * FROM public.stock_transfer_items WHERE transfer_id = _transfer_id
  LOOP
    v_recebido := COALESCE(((_items -> rec.id::text) ->> 'quantidade_recebida')::numeric, rec.quantidade_enviada);
    v_div := v_recebido - rec.quantidade_enviada;

    UPDATE public.stock_transfer_items
      SET quantidade_recebida = v_recebido, divergencia = v_div, updated_at = now()
      WHERE id = rec.id;

    -- Crédito no destino
    INSERT INTO public.product_stock_by_location (organization_id, product_id, warehouse_id, quantidade)
    VALUES (v_t.organization_id, rec.product_id, v_t.destino_id, v_recebido)
    ON CONFLICT (product_id, warehouse_id, COALESCE(bin_id, '00000000-0000-0000-0000-000000000000'::uuid))
    DO UPDATE SET quantidade = public.product_stock_by_location.quantidade + EXCLUDED.quantidade, updated_at = now();

    SELECT current_stock INTO v_prev FROM public.products WHERE id = rec.product_id;
    INSERT INTO public.movements (
      organization_id, product_id, type, quantity,
      previous_stock, new_stock, reason, created_by,
      warehouse_id, transfer_id
    ) VALUES (
      v_t.organization_id, rec.product_id, 'entrada', v_recebido,
      COALESCE(v_prev,0), COALESCE(v_prev,0) + v_recebido,
      'Transferência ' || COALESCE(v_t.numero, _transfer_id::text) || ' (recebimento)',
      auth.uid(), v_t.destino_id, v_t.id
    );

    UPDATE public.products SET current_stock = COALESCE(current_stock,0) + v_recebido, updated_at = now()
      WHERE id = rec.product_id;
  END LOOP;

  UPDATE public.stock_transfers
    SET status = 'recebida', recebida_em = now(), recebida_por = auth.uid(), updated_at = now()
    WHERE id = _transfer_id;

  RETURN jsonb_build_object('success', true);
END $$;

-- FEFO
CREATE OR REPLACE FUNCTION public.consume_batch_fefo(_product_id uuid, _warehouse_id uuid, _qty numeric)
RETURNS TABLE(batch_id uuid, lote text, validade date, quantidade_disponivel numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pb.id, pb.lote, pb.validade, bsl.quantidade
  FROM public.product_batches pb
  JOIN public.batch_stock_by_location bsl ON bsl.batch_id = pb.id
  WHERE pb.organization_id = get_user_organization_id()
    AND pb.product_id = _product_id
    AND bsl.warehouse_id = _warehouse_id
    AND bsl.quantidade > 0
  ORDER BY pb.validade ASC NULLS LAST, pb.created_at ASC;
$$;

-- 12) SEED: cria warehouse Padrão por organização e migra estoque atual
DO $$
DECLARE
  org RECORD;
  v_wh_id uuid;
BEGIN
  FOR org IN SELECT id FROM public.organizations LOOP
    -- já existe?
    SELECT id INTO v_wh_id FROM public.warehouses WHERE organization_id = org.id AND padrao = true LIMIT 1;
    IF v_wh_id IS NULL THEN
      INSERT INTO public.warehouses (organization_id, nome, codigo, tipo, padrao)
      VALUES (org.id, 'Padrão', 'PAD', 'cd', true)
      RETURNING id INTO v_wh_id;
    END IF;

    INSERT INTO public.product_stock_by_location (organization_id, product_id, warehouse_id, quantidade)
    SELECT p.organization_id, p.id, v_wh_id, COALESCE(p.current_stock, 0)
    FROM public.products p
    WHERE p.organization_id = org.id
      AND NOT EXISTS (
        SELECT 1 FROM public.product_stock_by_location psl
        WHERE psl.product_id = p.id AND psl.warehouse_id = v_wh_id AND psl.bin_id IS NULL
      );
  END LOOP;
END $$;
