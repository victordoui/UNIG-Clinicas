
-- 1. Tabela supplier_users
CREATE TABLE IF NOT EXISTS public.supplier_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_users_user ON public.supplier_users(user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_users_supplier ON public.supplier_users(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_users_org ON public.supplier_users(organization_id);

ALTER TABLE public.supplier_users ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_supplier_users_updated_at
BEFORE UPDATE ON public.supplier_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Helper functions
CREATE OR REPLACE FUNCTION public.is_supplier_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.supplier_users
    WHERE user_id = _user_id AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.supplier_id_of(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT supplier_id FROM public.supplier_users
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.supplier_org_of(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.supplier_users
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1;
$$;

-- 3. RLS for supplier_users
CREATE POLICY "supplier_users_self_select" ON public.supplier_users
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "supplier_users_org_admin_select" ON public.supplier_users
FOR SELECT TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_current_user_role() IN ('admin','gerente')
);

CREATE POLICY "supplier_users_org_admin_insert" ON public.supplier_users
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND public.get_current_user_role() IN ('admin','gerente')
);

CREATE POLICY "supplier_users_org_admin_update" ON public.supplier_users
FOR UPDATE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_current_user_role() IN ('admin','gerente')
);

CREATE POLICY "supplier_users_org_admin_delete" ON public.supplier_users
FOR DELETE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_current_user_role() IN ('admin','gerente')
);

-- 4. RLS additions for purchase_quotes (supplier sees/edits own quotes)
CREATE POLICY "supplier_select_own_quotes" ON public.purchase_quotes
FOR SELECT TO authenticated
USING (supplier_id = public.supplier_id_of(auth.uid()));

CREATE POLICY "supplier_update_own_open_quotes" ON public.purchase_quotes
FOR UPDATE TO authenticated
USING (
  supplier_id = public.supplier_id_of(auth.uid())
  AND status IN ('aberta','pendente','rascunho')
);

CREATE POLICY "supplier_insert_own_quote" ON public.purchase_quotes
FOR INSERT TO authenticated
WITH CHECK (supplier_id = public.supplier_id_of(auth.uid()));

-- 5. RLS additions for purchase_orders (supplier sees own + can update NF fields)
CREATE POLICY "supplier_select_own_orders" ON public.purchase_orders
FOR SELECT TO authenticated
USING (supplier_id = public.supplier_id_of(auth.uid()));

CREATE POLICY "supplier_update_own_orders_nf" ON public.purchase_orders
FOR UPDATE TO authenticated
USING (supplier_id = public.supplier_id_of(auth.uid()));

-- 6. RLS additions for purchase_requests (supplier sees requests in quoting stage of own org)
CREATE POLICY "supplier_select_org_requests_in_quoting" ON public.purchase_requests
FOR SELECT TO authenticated
USING (
  organization_id = public.supplier_org_of(auth.uid())
  AND status::text IN ('em_cotacao','aprovada')
);

-- 7. RLS additions for suppliers (supplier sees own record)
CREATE POLICY "supplier_select_own_record" ON public.suppliers
FOR SELECT TO authenticated
USING (id = public.supplier_id_of(auth.uid()));

-- 8. Storage policy for fiscal-documents (supplier uploads to own folder = supplier_id)
CREATE POLICY "supplier_upload_fiscal_documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'fiscal-documents'
  AND (storage.foldername(name))[1] = public.supplier_id_of(auth.uid())::text
);

CREATE POLICY "supplier_read_own_fiscal_documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'fiscal-documents'
  AND (storage.foldername(name))[1] = public.supplier_id_of(auth.uid())::text
);
