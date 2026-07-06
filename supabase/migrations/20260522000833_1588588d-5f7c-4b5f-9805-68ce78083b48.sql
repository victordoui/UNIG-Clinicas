
-- FASE 20: Portal do solicitante - carrinho

CREATE TABLE IF NOT EXISTS public.requester_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  cost_center_id UUID,
  justificativa TEXT,
  prazo_desejado DATE,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','enviado','cancelado')),
  request_id UUID,
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rc_user ON public.requester_carts(user_id, status);

ALTER TABLE public.requester_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rc_select" ON public.requester_carts FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id() AND user_id = auth.uid());
CREATE POLICY "rc_insert" ON public.requester_carts FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id() AND user_id = auth.uid());
CREATE POLICY "rc_update" ON public.requester_carts FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND user_id = auth.uid());
CREATE POLICY "rc_delete" ON public.requester_carts FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND user_id = auth.uid());

CREATE TRIGGER trg_rc_updated BEFORE UPDATE ON public.requester_carts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.requester_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  cart_id UUID NOT NULL REFERENCES public.requester_carts(id) ON DELETE CASCADE,
  product_id UUID,
  descricao TEXT NOT NULL,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rci_cart ON public.requester_cart_items(cart_id);

ALTER TABLE public.requester_cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rci_select" ON public.requester_cart_items FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id()
    AND EXISTS (SELECT 1 FROM public.requester_carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));
CREATE POLICY "rci_insert" ON public.requester_cart_items FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id()
    AND EXISTS (SELECT 1 FROM public.requester_carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));
CREATE POLICY "rci_update" ON public.requester_cart_items FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id()
    AND EXISTS (SELECT 1 FROM public.requester_carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));
CREATE POLICY "rci_delete" ON public.requester_cart_items FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id()
    AND EXISTS (SELECT 1 FROM public.requester_carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));
