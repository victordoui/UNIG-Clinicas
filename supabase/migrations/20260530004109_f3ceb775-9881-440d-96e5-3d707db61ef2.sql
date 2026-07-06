-- ============================================
-- FASE 1: Extensão do ci_requests
-- ============================================
ALTER TABLE public.ci_requests
  ADD COLUMN IF NOT EXISTS campus text,
  ADD COLUMN IF NOT EXISTS cost_center text,
  ADD COLUMN IF NOT EXISTS current_stage text NOT NULL DEFAULT 'triagem',
  ADD COLUMN IF NOT EXISTS due_date timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_forecast timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- ============================================
-- Helper: função para checar se user pertence à org de uma CI
-- ============================================
CREATE OR REPLACE FUNCTION public.ci_user_can_access(_ci_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ci_requests c
    JOIN public.organization_members m
      ON m.organization_id = c.organization_id
     AND m.user_id = auth.uid()
     AND m.is_active = true
    WHERE c.id = _ci_id
  );
$$;

-- ============================================
-- ci_items
-- ============================================
CREATE TABLE IF NOT EXISTS public.ci_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ci_id uuid NOT NULL REFERENCES public.ci_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  descricao text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  unidade text,
  especificacao text,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_items TO authenticated;
GRANT ALL ON public.ci_items TO service_role;

ALTER TABLE public.ci_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ci_items_select" ON public.ci_items
  FOR SELECT TO authenticated USING (public.ci_user_can_access(ci_id));
CREATE POLICY "ci_items_insert" ON public.ci_items
  FOR INSERT TO authenticated WITH CHECK (public.ci_user_can_access(ci_id));
CREATE POLICY "ci_items_update" ON public.ci_items
  FOR UPDATE TO authenticated USING (public.ci_user_can_access(ci_id));
CREATE POLICY "ci_items_delete" ON public.ci_items
  FOR DELETE TO authenticated USING (public.ci_user_can_access(ci_id));

CREATE INDEX IF NOT EXISTS idx_ci_items_ci_id ON public.ci_items(ci_id);

-- ============================================
-- ci_quotes
-- ============================================
CREATE TABLE IF NOT EXISTS public.ci_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ci_id uuid NOT NULL REFERENCES public.ci_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  fornecedor text NOT NULL,
  valor_total numeric,
  prazo_entrega text,
  condicoes_pagamento text,
  anexo_url text,
  escolhida boolean NOT NULL DEFAULT false,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_quotes TO authenticated;
GRANT ALL ON public.ci_quotes TO service_role;

ALTER TABLE public.ci_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ci_quotes_select" ON public.ci_quotes
  FOR SELECT TO authenticated USING (public.ci_user_can_access(ci_id));
CREATE POLICY "ci_quotes_insert" ON public.ci_quotes
  FOR INSERT TO authenticated WITH CHECK (public.ci_user_can_access(ci_id));
CREATE POLICY "ci_quotes_update" ON public.ci_quotes
  FOR UPDATE TO authenticated USING (public.ci_user_can_access(ci_id));
CREATE POLICY "ci_quotes_delete" ON public.ci_quotes
  FOR DELETE TO authenticated USING (public.ci_user_can_access(ci_id));

CREATE INDEX IF NOT EXISTS idx_ci_quotes_ci_id ON public.ci_quotes(ci_id);

-- ============================================
-- ci_purchase_order
-- ============================================
CREATE TABLE IF NOT EXISTS public.ci_purchase_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ci_id uuid NOT NULL REFERENCES public.ci_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  numero_alterdata text,
  data_emissao timestamptz,
  valor_total numeric,
  status text NOT NULL DEFAULT 'emitido',
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_purchase_order TO authenticated;
GRANT ALL ON public.ci_purchase_order TO service_role;

ALTER TABLE public.ci_purchase_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ci_po_select" ON public.ci_purchase_order
  FOR SELECT TO authenticated USING (public.ci_user_can_access(ci_id));
CREATE POLICY "ci_po_insert" ON public.ci_purchase_order
  FOR INSERT TO authenticated WITH CHECK (public.ci_user_can_access(ci_id));
CREATE POLICY "ci_po_update" ON public.ci_purchase_order
  FOR UPDATE TO authenticated USING (public.ci_user_can_access(ci_id));
CREATE POLICY "ci_po_delete" ON public.ci_purchase_order
  FOR DELETE TO authenticated USING (public.ci_user_can_access(ci_id));

CREATE INDEX IF NOT EXISTS idx_ci_po_ci_id ON public.ci_purchase_order(ci_id);

-- ============================================
-- ci_delivery
-- ============================================
CREATE TABLE IF NOT EXISTS public.ci_delivery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ci_id uuid NOT NULL REFERENCES public.ci_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  data_prevista timestamptz,
  data_entrega timestamptz,
  recebido_por text,
  conferido boolean NOT NULL DEFAULT false,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_delivery TO authenticated;
GRANT ALL ON public.ci_delivery TO service_role;

ALTER TABLE public.ci_delivery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ci_delivery_select" ON public.ci_delivery
  FOR SELECT TO authenticated USING (public.ci_user_can_access(ci_id));
CREATE POLICY "ci_delivery_insert" ON public.ci_delivery
  FOR INSERT TO authenticated WITH CHECK (public.ci_user_can_access(ci_id));
CREATE POLICY "ci_delivery_update" ON public.ci_delivery
  FOR UPDATE TO authenticated USING (public.ci_user_can_access(ci_id));
CREATE POLICY "ci_delivery_delete" ON public.ci_delivery
  FOR DELETE TO authenticated USING (public.ci_user_can_access(ci_id));

CREATE INDEX IF NOT EXISTS idx_ci_delivery_ci_id ON public.ci_delivery(ci_id);

-- ============================================
-- Triggers updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.ci_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ci_items_updated ON public.ci_items;
CREATE TRIGGER trg_ci_items_updated BEFORE UPDATE ON public.ci_items
  FOR EACH ROW EXECUTE FUNCTION public.ci_set_updated_at();

DROP TRIGGER IF EXISTS trg_ci_quotes_updated ON public.ci_quotes;
CREATE TRIGGER trg_ci_quotes_updated BEFORE UPDATE ON public.ci_quotes
  FOR EACH ROW EXECUTE FUNCTION public.ci_set_updated_at();

DROP TRIGGER IF EXISTS trg_ci_po_updated ON public.ci_purchase_order;
CREATE TRIGGER trg_ci_po_updated BEFORE UPDATE ON public.ci_purchase_order
  FOR EACH ROW EXECUTE FUNCTION public.ci_set_updated_at();

DROP TRIGGER IF EXISTS trg_ci_delivery_updated ON public.ci_delivery;
CREATE TRIGGER trg_ci_delivery_updated BEFORE UPDATE ON public.ci_delivery
  FOR EACH ROW EXECUTE FUNCTION public.ci_set_updated_at();

-- ============================================
-- Garantir apenas 1 cotação escolhida por CI
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ci_quote_escolhida
  ON public.ci_quotes(ci_id) WHERE escolhida = true;