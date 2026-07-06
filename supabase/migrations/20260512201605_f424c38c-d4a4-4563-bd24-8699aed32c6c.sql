
-- ============================================================
-- FASE 13: Fiscal (NF-e/NFC-e) + Devoluções
-- ============================================================

-- ENUMS
DO $$ BEGIN
  CREATE TYPE public.regime_tributario AS ENUM ('simples_nacional','lucro_presumido','lucro_real','mei');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.fiscal_ambiente AS ENUM ('homologacao','producao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.fiscal_modelo AS ENUM ('55','65');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.fiscal_tipo AS ENUM ('saida','entrada','devolucao_venda','devolucao_compra');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.fiscal_status AS ENUM ('rascunho','processando','autorizada','rejeitada','cancelada','inutilizada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.fiscal_event_tipo AS ENUM ('emissao','cancelamento','carta_correcao','inutilizacao','consulta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.return_status AS ENUM ('rascunho','processada','cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_credito_devolucao AS ENUM ('estorno_financeiro','credito_em_conta','troca');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 1. fiscal_settings (uma por organização)
-- ============================================================
CREATE TABLE public.fiscal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE,
  cnpj text NOT NULL,
  razao_social text NOT NULL,
  nome_fantasia text,
  inscricao_estadual text,
  inscricao_municipal text,
  regime_tributario regime_tributario NOT NULL DEFAULT 'simples_nacional',
  ambiente fiscal_ambiente NOT NULL DEFAULT 'homologacao',
  serie_nfe integer NOT NULL DEFAULT 1,
  proximo_numero_nfe integer NOT NULL DEFAULT 1,
  serie_nfce integer NOT NULL DEFAULT 1,
  proximo_numero_nfce integer NOT NULL DEFAULT 1,
  provider text NOT NULL DEFAULT 'focus_nfe',
  csc_id text,
  csc_token text,
  certificado_path text,
  endereco jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fiscal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY fs_select ON public.fiscal_settings FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY fs_insert ON public.fiscal_settings FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');
CREATE POLICY fs_update ON public.fiscal_settings FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');
CREATE POLICY fs_delete ON public.fiscal_settings FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

-- ============================================================
-- 2. product_fiscal_data (1:1 com products)
-- ============================================================
CREATE TABLE public.product_fiscal_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  product_id uuid NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  ncm text,
  cest text,
  cfop_padrao text DEFAULT '5102',
  origem smallint NOT NULL DEFAULT 0 CHECK (origem BETWEEN 0 AND 8),
  icms_cst text,
  icms_aliquota numeric(7,4) DEFAULT 0,
  icms_modalidade_bc smallint,
  pis_cst text,
  pis_aliquota numeric(7,4) DEFAULT 0,
  cofins_cst text,
  cofins_aliquota numeric(7,4) DEFAULT 0,
  unidade_tributavel text DEFAULT 'UN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_fiscal_data ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_pfd_org ON public.product_fiscal_data(organization_id);

CREATE POLICY pfd_select ON public.product_fiscal_data FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY pfd_insert ON public.product_fiscal_data FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());
CREATE POLICY pfd_update ON public.product_fiscal_data FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY pfd_delete ON public.product_fiscal_data FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

-- ============================================================
-- 3. customer_fiscal_data (1:1 com customers)
-- ============================================================
CREATE TABLE public.customer_fiscal_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  customer_id uuid NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
  indicador_ie smallint NOT NULL DEFAULT 9 CHECK (indicador_ie IN (1,2,9)),
  consumidor_final boolean NOT NULL DEFAULT true,
  contribuinte_icms boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_fiscal_data ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_cfd_org ON public.customer_fiscal_data(organization_id);

CREATE POLICY cfd_select ON public.customer_fiscal_data FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY cfd_insert ON public.customer_fiscal_data FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());
CREATE POLICY cfd_update ON public.customer_fiscal_data FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY cfd_delete ON public.customer_fiscal_data FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

-- ============================================================
-- 4. fiscal_invoices
-- ============================================================
CREATE TABLE public.fiscal_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  numero integer,
  serie integer,
  modelo fiscal_modelo NOT NULL,
  tipo fiscal_tipo NOT NULL,
  ambiente fiscal_ambiente NOT NULL DEFAULT 'homologacao',
  chave_acesso text,
  protocolo text,
  status fiscal_status NOT NULL DEFAULT 'rascunho',
  referencia_id uuid,
  referencia_tipo text,
  nota_referenciada_id uuid REFERENCES public.fiscal_invoices(id) ON DELETE SET NULL,
  provider_ref text,
  xml_url text,
  danfe_url text,
  mensagem_sefaz text,
  valor_total numeric(14,2) NOT NULL DEFAULT 0,
  destinatario_nome text,
  destinatario_documento text,
  emitida_em timestamptz,
  cancelada_em timestamptz,
  motivo_cancelamento text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fiscal_invoices ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_fi_org ON public.fiscal_invoices(organization_id);
CREATE INDEX idx_fi_ref ON public.fiscal_invoices(referencia_tipo, referencia_id);
CREATE UNIQUE INDEX idx_fi_chave ON public.fiscal_invoices(chave_acesso) WHERE chave_acesso IS NOT NULL;

CREATE POLICY fi_select ON public.fiscal_invoices FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY fi_insert ON public.fiscal_invoices FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY fi_update ON public.fiscal_invoices FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));
-- DELETE bloqueado (só cancelar)

-- ============================================================
-- 5. fiscal_invoice_items
-- ============================================================
CREATE TABLE public.fiscal_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_invoice_id uuid NOT NULL REFERENCES public.fiscal_invoices(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  numero_item integer NOT NULL,
  descricao text NOT NULL,
  ncm text,
  cfop text,
  unidade text DEFAULT 'UN',
  quantidade numeric(14,4) NOT NULL,
  valor_unitario numeric(14,4) NOT NULL,
  valor_total numeric(14,2) NOT NULL,
  icms_cst text, icms_aliquota numeric(7,4), icms_valor numeric(14,2),
  pis_cst text, pis_aliquota numeric(7,4), pis_valor numeric(14,2),
  cofins_cst text, cofins_aliquota numeric(7,4), cofins_valor numeric(14,2),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fiscal_invoice_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_fii_inv ON public.fiscal_invoice_items(fiscal_invoice_id);

CREATE POLICY fii_select ON public.fiscal_invoice_items FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY fii_insert ON public.fiscal_invoice_items FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY fii_update ON public.fiscal_invoice_items FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));

-- ============================================================
-- 6. fiscal_events
-- ============================================================
CREATE TABLE public.fiscal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  fiscal_invoice_id uuid NOT NULL REFERENCES public.fiscal_invoices(id) ON DELETE CASCADE,
  tipo fiscal_event_tipo NOT NULL,
  payload jsonb,
  resposta jsonb,
  mensagem text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fiscal_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_fe_inv ON public.fiscal_events(fiscal_invoice_id);

CREATE POLICY fe_select ON public.fiscal_events FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY fe_insert ON public.fiscal_events FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

-- ============================================================
-- 7. sales_returns + items
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS public.sales_return_seq;
CREATE SEQUENCE IF NOT EXISTS public.purchase_return_seq;

CREATE TABLE public.sales_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  numero text,
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  motivo text NOT NULL,
  tipo_credito tipo_credito_devolucao NOT NULL DEFAULT 'estorno_financeiro',
  status return_status NOT NULL DEFAULT 'rascunho',
  valor_total numeric(14,2) NOT NULL DEFAULT 0,
  fiscal_invoice_id uuid REFERENCES public.fiscal_invoices(id) ON DELETE SET NULL,
  processada_em timestamptz,
  processada_por uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_sr_org ON public.sales_returns(organization_id);

CREATE POLICY sr_select ON public.sales_returns FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY sr_insert ON public.sales_returns FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid() AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY sr_update ON public.sales_returns FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY sr_delete ON public.sales_returns FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin' AND status = 'rascunho');

CREATE TABLE public.sales_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  sales_return_id uuid NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
  sales_order_item_id uuid REFERENCES public.sales_order_items(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantidade numeric(14,4) NOT NULL,
  valor_unitario numeric(14,4) NOT NULL,
  motivo_item text,
  warehouse_id uuid REFERENCES public.warehouses(id),
  batch_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_sri_ret ON public.sales_return_items(sales_return_id);

CREATE POLICY sri_select ON public.sales_return_items FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY sri_insert ON public.sales_return_items FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY sri_update ON public.sales_return_items FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY sri_delete ON public.sales_return_items FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));

-- ============================================================
-- 8. purchase_returns + items
-- ============================================================
CREATE TABLE public.purchase_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  numero text,
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  motivo text NOT NULL,
  status return_status NOT NULL DEFAULT 'rascunho',
  valor_total numeric(14,2) NOT NULL DEFAULT 0,
  fiscal_invoice_id uuid REFERENCES public.fiscal_invoices(id) ON DELETE SET NULL,
  processada_em timestamptz,
  processada_por uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_pr_org ON public.purchase_returns(organization_id);

CREATE POLICY pr_select ON public.purchase_returns FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY pr_insert ON public.purchase_returns FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid() AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY pr_update ON public.purchase_returns FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY pr_delete ON public.purchase_returns FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin' AND status = 'rascunho');

CREATE TABLE public.purchase_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  purchase_return_id uuid NOT NULL REFERENCES public.purchase_returns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantidade numeric(14,4) NOT NULL,
  valor_unitario numeric(14,4) NOT NULL,
  motivo_item text,
  warehouse_id uuid REFERENCES public.warehouses(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_return_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_pri_ret ON public.purchase_return_items(purchase_return_id);

CREATE POLICY pri_select ON public.purchase_return_items FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());
CREATE POLICY pri_insert ON public.purchase_return_items FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY pri_update ON public.purchase_return_items FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY pri_delete ON public.purchase_return_items FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));

-- ============================================================
-- TRIGGERS de numeração
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_sales_return_numero()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.numero IS NULL THEN
    NEW.numero := 'DEV-' || to_char(now(),'YYYYMM') || '-' || lpad(nextval('public.sales_return_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_set_sales_return_numero BEFORE INSERT ON public.sales_returns
  FOR EACH ROW EXECUTE FUNCTION public.set_sales_return_numero();

CREATE OR REPLACE FUNCTION public.set_purchase_return_numero()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.numero IS NULL THEN
    NEW.numero := 'DVC-' || to_char(now(),'YYYYMM') || '-' || lpad(nextval('public.purchase_return_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_set_purchase_return_numero BEFORE INSERT ON public.purchase_returns
  FOR EACH ROW EXECUTE FUNCTION public.set_purchase_return_numero();

-- product_fiscal_data automático ao criar produto
CREATE OR REPLACE FUNCTION public.create_product_fiscal_data()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.product_fiscal_data (organization_id, product_id)
  VALUES (NEW.organization_id, NEW.id)
  ON CONFLICT (product_id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_create_product_fiscal_data AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.create_product_fiscal_data();

-- updated_at triggers
CREATE TRIGGER trg_fs_updated BEFORE UPDATE ON public.fiscal_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pfd_updated BEFORE UPDATE ON public.product_fiscal_data FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cfd_updated BEFORE UPDATE ON public.customer_fiscal_data FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fi_updated BEFORE UPDATE ON public.fiscal_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sr_updated BEFORE UPDATE ON public.sales_returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pr_updated BEFORE UPDATE ON public.purchase_returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- FUNÇÕES DE NEGÓCIO
-- ============================================================

-- next_fiscal_number
CREATE OR REPLACE FUNCTION public.next_fiscal_number(_org_id uuid, _modelo fiscal_modelo)
RETURNS TABLE(numero integer, serie integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer; _s integer;
BEGIN
  IF _modelo = '55' THEN
    UPDATE public.fiscal_settings SET proximo_numero_nfe = proximo_numero_nfe + 1
    WHERE organization_id = _org_id
    RETURNING proximo_numero_nfe - 1, serie_nfe INTO _n, _s;
  ELSE
    UPDATE public.fiscal_settings SET proximo_numero_nfce = proximo_numero_nfce + 1
    WHERE organization_id = _org_id
    RETURNING proximo_numero_nfce - 1, serie_nfce INTO _n, _s;
  END IF;
  RETURN QUERY SELECT _n, _s;
END $$;

-- cancel_fiscal_invoice
CREATE OR REPLACE FUNCTION public.cancel_fiscal_invoice(_id uuid, _motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _inv public.fiscal_invoices%ROWTYPE; _prazo interval;
BEGIN
  IF get_current_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Apenas admin pode cancelar notas';
  END IF;
  SELECT * INTO _inv FROM public.fiscal_invoices WHERE id = _id AND organization_id = get_user_organization_id() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nota não encontrada'; END IF;
  IF _inv.status <> 'autorizada' THEN RAISE EXCEPTION 'Só é possível cancelar notas autorizadas'; END IF;
  _prazo := CASE WHEN _inv.modelo = '55' THEN interval '24 hours' ELSE interval '30 minutes' END;
  IF now() - _inv.emitida_em > _prazo THEN
    RAISE EXCEPTION 'Prazo legal de cancelamento expirado';
  END IF;
  IF length(coalesce(_motivo,'')) < 15 THEN
    RAISE EXCEPTION 'Justificativa deve ter ao menos 15 caracteres';
  END IF;

  UPDATE public.fiscal_invoices SET status = 'cancelada', cancelada_em = now(), motivo_cancelamento = _motivo
    WHERE id = _id;
  INSERT INTO public.fiscal_events (organization_id, fiscal_invoice_id, tipo, mensagem, criado_por)
    VALUES (_inv.organization_id, _id, 'cancelamento', _motivo, auth.uid());
  RETURN jsonb_build_object('ok', true, 'id', _id);
END $$;

-- process_sales_return
CREATE OR REPLACE FUNCTION public.process_sales_return(_return_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ret public.sales_returns%ROWTYPE; _it record; _total numeric := 0; _org uuid;
BEGIN
  IF get_current_user_role() NOT IN ('admin','gerente') THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  SELECT * INTO _ret FROM public.sales_returns WHERE id = _return_id AND organization_id = get_user_organization_id() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Devolução não encontrada'; END IF;
  IF _ret.status <> 'rascunho' THEN RAISE EXCEPTION 'Devolução já processada'; END IF;
  _org := _ret.organization_id;

  FOR _it IN SELECT * FROM public.sales_return_items WHERE sales_return_id = _return_id LOOP
    -- volta estoque no warehouse destino
    IF _it.warehouse_id IS NOT NULL THEN
      INSERT INTO public.product_stock_by_location (organization_id, product_id, warehouse_id, quantidade)
        VALUES (_org, _it.product_id, _it.warehouse_id, _it.quantidade)
        ON CONFLICT (product_id, warehouse_id)
        DO UPDATE SET quantidade = product_stock_by_location.quantidade + EXCLUDED.quantidade;
    END IF;
    UPDATE public.products SET current_stock = COALESCE(current_stock,0) + _it.quantidade WHERE id = _it.product_id;

    INSERT INTO public.movements (organization_id, product_id, type, quantity, reason, created_by)
      VALUES (_org, _it.product_id, 'entrada', _it.quantidade,
              'Devolução de venda ' || _ret.numero, auth.uid());

    _total := _total + (_it.quantidade * _it.valor_unitario);
  END LOOP;

  -- crédito ao cliente
  IF _ret.tipo_credito = 'estorno_financeiro' THEN
    INSERT INTO public.accounts_receivable (organization_id, customer_id, valor_total, valor_recebido, status, data_vencimento, descricao, created_by)
      VALUES (_org, _ret.customer_id, -_total, 0, 'pendente', current_date,
              'Crédito por devolução ' || _ret.numero, auth.uid());
  END IF;

  UPDATE public.sales_returns SET status='processada', processada_em=now(), processada_por=auth.uid(), valor_total=_total
    WHERE id = _return_id;

  RETURN jsonb_build_object('ok', true, 'valor_total', _total);
END $$;

-- process_purchase_return
CREATE OR REPLACE FUNCTION public.process_purchase_return(_return_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ret public.purchase_returns%ROWTYPE; _it record; _total numeric := 0; _org uuid;
BEGIN
  IF get_current_user_role() NOT IN ('admin','gerente') THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  SELECT * INTO _ret FROM public.purchase_returns WHERE id = _return_id AND organization_id = get_user_organization_id() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Devolução não encontrada'; END IF;
  IF _ret.status <> 'rascunho' THEN RAISE EXCEPTION 'Devolução já processada'; END IF;
  _org := _ret.organization_id;

  FOR _it IN SELECT * FROM public.purchase_return_items WHERE purchase_return_id = _return_id LOOP
    IF _it.warehouse_id IS NOT NULL THEN
      UPDATE public.product_stock_by_location
        SET quantidade = GREATEST(0, quantidade - _it.quantidade)
        WHERE product_id = _it.product_id AND warehouse_id = _it.warehouse_id;
    END IF;
    UPDATE public.products SET current_stock = GREATEST(0, COALESCE(current_stock,0) - _it.quantidade) WHERE id = _it.product_id;

    INSERT INTO public.movements (organization_id, product_id, type, quantity, reason, created_by)
      VALUES (_org, _it.product_id, 'saida', _it.quantidade,
              'Devolução de compra ' || _ret.numero, auth.uid());

    _total := _total + (_it.quantidade * _it.valor_unitario);
  END LOOP;

  UPDATE public.purchase_returns SET status='processada', processada_em=now(), processada_por=auth.uid(), valor_total=_total
    WHERE id = _return_id;

  RETURN jsonb_build_object('ok', true, 'valor_total', _total);
END $$;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('fiscal-documents', 'fiscal-documents', false)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('fiscal-certificates', 'fiscal-certificates', false)
  ON CONFLICT (id) DO NOTHING;

-- Policies fiscal-documents (membros da org leem; edge functions escrevem com service role)
CREATE POLICY fiscal_docs_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fiscal-documents' AND (storage.foldername(name))[1] = get_user_organization_id()::text);

-- Policies fiscal-certificates (apenas admin lê/escreve da própria org)
CREATE POLICY fiscal_certs_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fiscal-certificates' AND (storage.foldername(name))[1] = get_user_organization_id()::text AND get_current_user_role() = 'admin');
CREATE POLICY fiscal_certs_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fiscal-certificates' AND (storage.foldername(name))[1] = get_user_organization_id()::text AND get_current_user_role() = 'admin');
CREATE POLICY fiscal_certs_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'fiscal-certificates' AND (storage.foldername(name))[1] = get_user_organization_id()::text AND get_current_user_role() = 'admin');
CREATE POLICY fiscal_certs_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fiscal-certificates' AND (storage.foldername(name))[1] = get_user_organization_id()::text AND get_current_user_role() = 'admin');
