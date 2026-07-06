
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.purchase_priority AS ENUM ('baixa', 'normal', 'alta', 'urgente');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.purchase_status AS ENUM (
    'nova','em_analise','aguardando_aprovacao','aprovada','reprovada',
    'em_cotacao','compra_realizada','aguardando_entrega','recebida','finalizada'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============ ROLE MAPPING ============
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = true 
      THEN 'admin'
    WHEN EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE user_id = auth.uid() AND is_active = true 
        AND role IN ('organization_admin','administrador')
    ) THEN 'admin'
    WHEN EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE user_id = auth.uid() AND is_active = true 
        AND role IN ('manager','compras','almoxarifado','gestor_aprovador')
    ) THEN 'gerente'
    ELSE 'usuario'
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_unig_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = true THEN 'super_admin'
    ELSE COALESCE(
      (SELECT CASE role
        WHEN 'organization_admin' THEN 'administrador'
        WHEN 'administrador' THEN 'administrador'
        WHEN 'compras' THEN 'compras'
        WHEN 'almoxarifado' THEN 'almoxarifado'
        WHEN 'gestor_aprovador' THEN 'gestor_aprovador'
        WHEN 'solicitante' THEN 'solicitante'
        WHEN 'visualizador' THEN 'visualizador'
        WHEN 'manager' THEN 'gestor_aprovador'
        ELSE 'solicitante'
       END
       FROM public.organization_members
       WHERE user_id = auth.uid() AND is_active = true LIMIT 1),
      'visualizador'
    )
  END;
$$;

-- ============ SUPPLIERS ============
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  nome_fantasia text NOT NULL,
  razao_social text,
  cnpj text,
  categoria text,
  contato_nome text,
  telefone text,
  whatsapp text,
  email text,
  endereco text,
  produtos_servicos text[] DEFAULT '{}',
  avaliacao integer CHECK (avaliacao BETWEEN 1 AND 5),
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, cnpj)
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view suppliers" ON public.suppliers
  FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Compras and admins insert suppliers" ON public.suppliers
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid()
    AND get_current_user_role() IN ('admin','gerente'));

CREATE POLICY "Compras and admins update suppliers" ON public.suppliers
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));

CREATE POLICY "Admins delete suppliers" ON public.suppliers
  FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PURCHASE REQUESTS ============
CREATE SEQUENCE IF NOT EXISTS public.purchase_request_seq;

CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  numero text NOT NULL,
  solicitante_id uuid NOT NULL,
  setor text,
  unidade text,
  prioridade public.purchase_priority NOT NULL DEFAULT 'normal',
  categoria text,
  item_descricao text NOT NULL,
  quantidade numeric NOT NULL CHECK (quantidade > 0),
  valor_estimado numeric,
  justificativa text,
  prazo_desejado date,
  status public.purchase_status NOT NULL DEFAULT 'nova',
  responsavel_id uuid,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_purchase_request_numero()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := 'SOL-' || to_char(now(),'YYYYMM') || '-' || lpad(nextval('public.purchase_request_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER purchase_requests_set_numero BEFORE INSERT ON public.purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_purchase_request_numero();

CREATE TRIGGER purchase_requests_updated_at BEFORE UPDATE ON public.purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view requests" ON public.purchase_requests
  FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Org members create own requests" ON public.purchase_requests
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND solicitante_id = auth.uid());

CREATE POLICY "Owner updates new requests; staff updates any" ON public.purchase_requests
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id() AND (
      get_current_user_role() IN ('admin','gerente')
      OR (solicitante_id = auth.uid() AND status = 'nova')
    )
  );

CREATE POLICY "Admins delete requests" ON public.purchase_requests
  FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

-- ============ ATTACHMENTS ============
CREATE TABLE IF NOT EXISTS public.purchase_request_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_request_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view attachments" ON public.purchase_request_attachments
  FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Org members add attachments" ON public.purchase_request_attachments
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND uploaded_by = auth.uid());

CREATE POLICY "Uploader or staff delete attachments" ON public.purchase_request_attachments
  FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND
         (uploaded_by = auth.uid() OR get_current_user_role() IN ('admin','gerente')));

-- ============ COMMENTS ============
CREATE TABLE IF NOT EXISTS public.purchase_request_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_request_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view comments" ON public.purchase_request_comments
  FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Org members add comments" ON public.purchase_request_comments
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND author_id = auth.uid());

CREATE POLICY "Author or admin delete comments" ON public.purchase_request_comments
  FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND
         (author_id = auth.uid() OR get_current_user_role() = 'admin'));

-- ============ APPROVAL THRESHOLDS ============
CREATE TABLE IF NOT EXISTS public.approval_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  valor_min numeric NOT NULL DEFAULT 0,
  valor_max numeric,
  papel_aprovador text NOT NULL CHECK (papel_aprovador IN ('compras','gestor_aprovador','administrador')),
  ordem integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER approval_thresholds_updated_at BEFORE UPDATE ON public.approval_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.approval_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view thresholds" ON public.approval_thresholds
  FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Admins manage thresholds" ON public.approval_thresholds
  FOR ALL TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin')
  WITH CHECK (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

-- ============ STORAGE ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('purchase-attachments','purchase-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org members view purchase files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'purchase-attachments' 
    AND (storage.foldername(name))[1] = get_user_organization_id()::text);

CREATE POLICY "Org members upload purchase files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'purchase-attachments'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
    AND owner = auth.uid());

CREATE POLICY "Owner or staff delete purchase files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'purchase-attachments'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
    AND (owner = auth.uid() OR get_current_user_role() IN ('admin','gerente')));
