-- Inbound invoices (NF-e entrada)
CREATE TABLE public.inbound_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  chave_acesso TEXT NOT NULL,
  numero TEXT,
  serie TEXT,
  emissao DATE,
  data_vencimento DATE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_cnpj TEXT,
  supplier_nome TEXT,
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'importado',
  order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  xml_path TEXT NOT NULL,
  parse_warnings JSONB DEFAULT '[]'::jsonb,
  matched_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, chave_acesso)
);

CREATE INDEX idx_inbound_invoices_org ON public.inbound_invoices(organization_id);
CREATE INDEX idx_inbound_invoices_supplier ON public.inbound_invoices(supplier_id);
CREATE INDEX idx_inbound_invoices_status ON public.inbound_invoices(status);
CREATE INDEX idx_inbound_invoices_order ON public.inbound_invoices(order_id);

ALTER TABLE public.inbound_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY ii_select ON public.inbound_invoices FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY ii_insert ON public.inbound_invoices FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY ii_update ON public.inbound_invoices FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY ii_delete ON public.inbound_invoices FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE TRIGGER trg_inbound_invoices_updated
BEFORE UPDATE ON public.inbound_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Items
CREATE TABLE public.inbound_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES public.inbound_invoices(id) ON DELETE CASCADE,
  numero_item INTEGER,
  descricao TEXT NOT NULL,
  cfop TEXT,
  ncm TEXT,
  cean TEXT,
  unidade TEXT,
  quantidade NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_unitario NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  order_item_id UUID,
  divergence TEXT NOT NULL DEFAULT 'ok',
  divergence_detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_iii_invoice ON public.inbound_invoice_items(invoice_id);
CREATE INDEX idx_iii_org ON public.inbound_invoice_items(organization_id);
CREATE INDEX idx_iii_product ON public.inbound_invoice_items(product_id);

ALTER TABLE public.inbound_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY iii_select ON public.inbound_invoice_items FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY iii_insert ON public.inbound_invoice_items FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY iii_update ON public.inbound_invoice_items FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY iii_delete ON public.inbound_invoice_items FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id());

-- Link in purchase_orders
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS inbound_invoice_id UUID REFERENCES public.inbound_invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_po_inbound_invoice ON public.purchase_orders(inbound_invoice_id);

-- Storage bucket for raw XML
INSERT INTO storage.buckets (id, name, public)
VALUES ('nfe-xml', 'nfe-xml', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "nfe_xml_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'nfe-xml'
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  );

CREATE POLICY "nfe_xml_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'nfe-xml'
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  );

CREATE POLICY "nfe_xml_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'nfe-xml'
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  );

-- Dashboard RPC
CREATE OR REPLACE FUNCTION public.get_inbound_invoices_dashboard()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org UUID := public.get_user_organization_id();
  _res JSON;
BEGIN
  SELECT json_build_object(
    'importadas_hoje', COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE),
    'aguardando', COUNT(*) FILTER (WHERE status IN ('importado','conciliado')),
    'divergentes', COUNT(*) FILTER (WHERE status = 'divergente'),
    'recebidas_mes', COUNT(*) FILTER (WHERE status = 'recebido' AND received_at >= date_trunc('month', now())),
    'valor_mes', COALESCE(SUM(valor_total) FILTER (WHERE status = 'recebido' AND received_at >= date_trunc('month', now())), 0)
  )
  INTO _res
  FROM public.inbound_invoices
  WHERE organization_id = _org;
  RETURN _res;
END;
$$;