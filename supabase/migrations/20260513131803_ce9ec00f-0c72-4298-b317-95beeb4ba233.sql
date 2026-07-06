
-- ============================================================
-- Phase 16 — Focus on Purchasing + Stock
-- A) Drop sales-related tables
-- B) Create user_cost_centers + permission helpers
-- ============================================================

-- A) DROP sales modules ------------------------------------------------
DROP TABLE IF EXISTS public.sales_return_items CASCADE;
DROP TABLE IF EXISTS public.sales_returns CASCADE;
DROP TABLE IF EXISTS public.sales_order_items CASCADE;
DROP TABLE IF EXISTS public.sales_orders CASCADE;
DROP TABLE IF EXISTS public.receipt_transactions CASCADE;
DROP TABLE IF EXISTS public.accounts_receivable CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.price_list_items CASCADE;
DROP TABLE IF EXISTS public.customer_price_lists CASCADE;
DROP TABLE IF EXISTS public.price_lists CASCADE;
DROP TABLE IF EXISTS public.customer_fiscal_data CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;

-- B) user_cost_centers -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cost_center_id UUID NOT NULL REFERENCES public.cost_centers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  can_request BOOLEAN NOT NULL DEFAULT true,
  can_approve_cc BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, cost_center_id)
);

CREATE INDEX IF NOT EXISTS idx_ucc_user ON public.user_cost_centers(user_id);
CREATE INDEX IF NOT EXISTS idx_ucc_org ON public.user_cost_centers(organization_id);
CREATE INDEX IF NOT EXISTS idx_ucc_cc  ON public.user_cost_centers(cost_center_id);

ALTER TABLE public.user_cost_centers ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_ucc_updated_at ON public.user_cost_centers;
CREATE TRIGGER trg_ucc_updated_at
BEFORE UPDATE ON public.user_cost_centers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: user reads own; admin/manager of org manages all
CREATE POLICY "Users view own cost-center links"
ON public.user_cost_centers FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (organization_id = public.get_user_organization_id()
      AND public.get_current_user_role() = ANY (ARRAY['admin','gerente']))
  OR public.is_super_admin()
);

CREATE POLICY "Admins manage cost-center links (insert)"
ON public.user_cost_centers FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND public.get_current_user_role() = ANY (ARRAY['admin','gerente'])
);

CREATE POLICY "Admins manage cost-center links (update)"
ON public.user_cost_centers FOR UPDATE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_current_user_role() = ANY (ARRAY['admin','gerente'])
);

CREATE POLICY "Admins manage cost-center links (delete)"
ON public.user_cost_centers FOR DELETE TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.get_current_user_role() = ANY (ARRAY['admin','gerente'])
);

-- Permission helper: can the user open a purchase request?
CREATE OR REPLACE FUNCTION public.can_create_purchase_request(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND is_active = true
      AND role = ANY (ARRAY['admin','gerente','organization_admin','administrador','compras','gestor_aprovador','solicitante','manager','user'])
  ) OR public.is_super_admin();
$$;

-- Helper: cost centers the user can request from
CREATE OR REPLACE FUNCTION public.get_user_cost_centers(_user_id uuid)
RETURNS TABLE (
  id uuid,
  nome text,
  codigo text,
  is_default boolean,
  can_approve_cc boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT cc.id, cc.nome, cc.codigo, ucc.is_default, ucc.can_approve_cc
  FROM public.user_cost_centers ucc
  JOIN public.cost_centers cc ON cc.id = ucc.cost_center_id
  WHERE ucc.user_id = _user_id
    AND ucc.can_request = true
    AND cc.ativo = true
  UNION
  -- compras/admin see all CCs of their org
  SELECT cc.id, cc.nome, cc.codigo, false, false
  FROM public.cost_centers cc
  WHERE cc.organization_id = public.get_user_organization_id()
    AND cc.ativo = true
    AND public.get_current_user_role() = ANY (ARRAY['admin','gerente']);
$$;

-- Update purchase_requests INSERT policy to enforce role + CC binding
DROP POLICY IF EXISTS "Org members create own requests" ON public.purchase_requests;
CREATE POLICY "Permitted roles create own requests"
ON public.purchase_requests FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND solicitante_id = auth.uid()
  AND public.can_create_purchase_request(auth.uid())
  AND (
    -- admin/gerente bypasses CC binding
    public.get_current_user_role() = ANY (ARRAY['admin','gerente'])
    OR cost_center_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.user_cost_centers ucc
      WHERE ucc.user_id = auth.uid()
        AND ucc.cost_center_id = purchase_requests.cost_center_id
        AND ucc.can_request = true
    )
  )
);
