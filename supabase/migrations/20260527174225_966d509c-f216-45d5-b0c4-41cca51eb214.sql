
DO $$ BEGIN
  CREATE TYPE public.supplier_status AS ENUM (
    'rascunho','aguardando_envio','em_analise','pendente_correcao',
    'aprovado','reprovado','bloqueado','documentacao_vencida'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.supplier_doc_status AS ENUM (
    'nao_enviado','enviado','em_analise','aprovado','reprovado','vencido'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.supplier_invoice_status AS ENUM (
    'aguardando_envio','enviada','em_analise','aprovada','recusada','pagamento_liberado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.supplier_change_status AS ENUM ('pendente','aprovada','rejeitada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_supplier(_user_id uuid, _supplier_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.supplier_users
    WHERE user_id = _user_id AND supplier_id = _supplier_id AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','org_admin','manager')
  );
$$;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS status public.supplier_status NOT NULL DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS tipo_fornecedor text,
  ADD COLUMN IF NOT EXISTS porte text,
  ADD COLUMN IF NOT EXISTS regime_tributario text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS inscricao_municipal text,
  ADD COLUMN IF NOT EXISTS site text,
  ADD COLUMN IF NOT EXISTS categorias text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS logradouro text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS uf text,
  ADD COLUMN IF NOT EXISTS pais text DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS responsavel_comercial text,
  ADD COLUMN IF NOT EXISTS cargo_comercial text,
  ADD COLUMN IF NOT EXISTS telefone_comercial text,
  ADD COLUMN IF NOT EXISTS email_comercial text,
  ADD COLUMN IF NOT EXISTS responsavel_financeiro text,
  ADD COLUMN IF NOT EXISTS telefone_financeiro text,
  ADD COLUMN IF NOT EXISTS email_financeiro text,
  ADD COLUMN IF NOT EXISTS responsavel_tecnico text,
  ADD COLUMN IF NOT EXISTS telefone_tecnico text,
  ADD COLUMN IF NOT EXISTS email_tecnico text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS homologacao_validade date,
  ADD COLUMN IF NOT EXISTS status_observacao text;

CREATE TABLE IF NOT EXISTS public.supplier_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  banco text NOT NULL,
  agencia text NOT NULL,
  conta text NOT NULL,
  tipo_conta text,
  chave_pix text,
  titular text NOT NULL,
  documento_titular text,
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_bank_accounts TO authenticated;
GRANT ALL ON public.supplier_bank_accounts TO service_role;
ALTER TABLE public.supplier_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sba select" ON public.supplier_bank_accounts FOR SELECT TO authenticated
  USING (public.user_belongs_to_supplier(auth.uid(), supplier_id) OR public.is_admin_user(auth.uid()));
CREATE POLICY "sba insert" ON public.supplier_bank_accounts FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_supplier(auth.uid(), supplier_id) OR public.is_admin_user(auth.uid()));
CREATE POLICY "sba update" ON public.supplier_bank_accounts FOR UPDATE TO authenticated
  USING (public.user_belongs_to_supplier(auth.uid(), supplier_id) OR public.is_admin_user(auth.uid()));
CREATE POLICY "sba delete" ON public.supplier_bank_accounts FOR DELETE TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE TABLE IF NOT EXISTS public.supplier_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  tipo text NOT NULL,
  nome text NOT NULL,
  obrigatorio boolean NOT NULL DEFAULT false,
  status public.supplier_doc_status NOT NULL DEFAULT 'nao_enviado',
  file_path text,
  file_name text,
  validade date,
  observacao_analise text,
  enviado_em timestamptz,
  enviado_por uuid,
  analisado_em timestamptz,
  analisado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_docs_supplier ON public.supplier_documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_docs_status ON public.supplier_documents(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_documents TO authenticated;
GRANT ALL ON public.supplier_documents TO service_role;
ALTER TABLE public.supplier_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sd select" ON public.supplier_documents FOR SELECT TO authenticated
  USING (public.user_belongs_to_supplier(auth.uid(), supplier_id) OR public.is_admin_user(auth.uid()));
CREATE POLICY "sd insert" ON public.supplier_documents FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_supplier(auth.uid(), supplier_id) OR public.is_admin_user(auth.uid()));
CREATE POLICY "sd update" ON public.supplier_documents FOR UPDATE TO authenticated
  USING (public.user_belongs_to_supplier(auth.uid(), supplier_id) OR public.is_admin_user(auth.uid()));
CREATE POLICY "sd delete" ON public.supplier_documents FOR DELETE TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE TABLE IF NOT EXISTS public.supplier_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  campo text NOT NULL,
  valor_antigo jsonb,
  valor_novo jsonb NOT NULL,
  justificativa text,
  status public.supplier_change_status NOT NULL DEFAULT 'pendente',
  requested_by uuid NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_changes_supplier ON public.supplier_change_requests(supplier_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_change_requests TO authenticated;
GRANT ALL ON public.supplier_change_requests TO service_role;
ALTER TABLE public.supplier_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scr select" ON public.supplier_change_requests FOR SELECT TO authenticated
  USING (public.user_belongs_to_supplier(auth.uid(), supplier_id) OR public.is_admin_user(auth.uid()));
CREATE POLICY "scr insert" ON public.supplier_change_requests FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_supplier(auth.uid(), supplier_id) AND requested_by = auth.uid());
CREATE POLICY "scr update" ON public.supplier_change_requests FOR UPDATE TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE TABLE IF NOT EXISTS public.supplier_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  numero_nf text NOT NULL,
  serie text,
  valor numeric(14,2) NOT NULL,
  file_path text,
  file_name text,
  xml_path text,
  chave_acesso text,
  status public.supplier_invoice_status NOT NULL DEFAULT 'enviada',
  observacao text,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  enviado_por uuid,
  analisado_em timestamptz,
  analisado_por uuid,
  motivo_recusa text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier ON public.supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_order ON public.supplier_invoices(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON public.supplier_invoices(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_invoices TO authenticated;
GRANT ALL ON public.supplier_invoices TO service_role;
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "si select" ON public.supplier_invoices FOR SELECT TO authenticated
  USING (public.user_belongs_to_supplier(auth.uid(), supplier_id) OR public.is_admin_user(auth.uid()));
CREATE POLICY "si insert" ON public.supplier_invoices FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_supplier(auth.uid(), supplier_id));
CREATE POLICY "si update" ON public.supplier_invoices FOR UPDATE TO authenticated
  USING (public.user_belongs_to_supplier(auth.uid(), supplier_id) OR public.is_admin_user(auth.uid()));
CREATE POLICY "si delete" ON public.supplier_invoices FOR DELETE TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE TABLE IF NOT EXISTS public.supplier_registration_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  organization_id uuid,
  invitation_token text,
  current_step int NOT NULL DEFAULT 1,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted boolean NOT NULL DEFAULT false,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_registration_drafts TO authenticated;
GRANT ALL ON public.supplier_registration_drafts TO service_role;
ALTER TABLE public.supplier_registration_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srd all" ON public.supplier_registration_drafts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_sba_updated BEFORE UPDATE ON public.supplier_bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sd_updated  BEFORE UPDATE ON public.supplier_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_scr_updated BEFORE UPDATE ON public.supplier_change_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_si_updated  BEFORE UPDATE ON public.supplier_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_srd_updated BEFORE UPDATE ON public.supplier_registration_drafts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('supplier-docs','supplier-docs', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('supplier-invoices','supplier-invoices', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "sd files select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'supplier-docs' AND (public.user_belongs_to_supplier(auth.uid(), (split_part(name,'/',1))::uuid) OR public.is_admin_user(auth.uid())));
CREATE POLICY "sd files insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'supplier-docs' AND public.user_belongs_to_supplier(auth.uid(), (split_part(name,'/',1))::uuid));
CREATE POLICY "sd files update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'supplier-docs' AND public.user_belongs_to_supplier(auth.uid(), (split_part(name,'/',1))::uuid));
CREATE POLICY "si files select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'supplier-invoices' AND (public.user_belongs_to_supplier(auth.uid(), (split_part(name,'/',1))::uuid) OR public.is_admin_user(auth.uid())));
CREATE POLICY "si files insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'supplier-invoices' AND public.user_belongs_to_supplier(auth.uid(), (split_part(name,'/',1))::uuid));
CREATE POLICY "si files update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'supplier-invoices' AND public.user_belongs_to_supplier(auth.uid(), (split_part(name,'/',1))::uuid));
