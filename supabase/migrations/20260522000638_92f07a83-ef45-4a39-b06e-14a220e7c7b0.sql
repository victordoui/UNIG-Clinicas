
-- FASE 19: Separação por ondas

CREATE TABLE IF NOT EXISTS public.warehouse_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  warehouse_id UUID,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  rota INT NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, codigo)
);

ALTER TABLE public.warehouse_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wz_select" ON public.warehouse_zones FOR SELECT TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE POLICY "wz_insert" ON public.warehouse_zones FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "wz_update" ON public.warehouse_zones FOR UPDATE TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE POLICY "wz_delete" ON public.warehouse_zones FOR DELETE TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE TRIGGER trg_wz_updated BEFORE UPDATE ON public.warehouse_zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.picking_waves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  numero TEXT NOT NULL,
  data_onda DATE NOT NULL DEFAULT current_date,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','separando','concluida','cancelada')),
  separador_id UUID,
  warehouse_id UUID,
  observacoes TEXT,
  iniciada_em TIMESTAMPTZ,
  concluida_em TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_pw_org ON public.picking_waves(organization_id);
CREATE INDEX IF NOT EXISTS idx_pw_status ON public.picking_waves(status);

ALTER TABLE public.picking_waves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pw_select" ON public.picking_waves FOR SELECT TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE POLICY "pw_insert" ON public.picking_waves FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "pw_update" ON public.picking_waves FOR UPDATE TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE POLICY "pw_delete" ON public.picking_waves FOR DELETE TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE TRIGGER trg_pw_updated BEFORE UPDATE ON public.picking_waves FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.picking_wave_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  wave_id UUID NOT NULL REFERENCES public.picking_waves(id) ON DELETE CASCADE,
  request_id UUID,
  product_id UUID,
  descricao TEXT NOT NULL,
  qtd_solicitada NUMERIC NOT NULL DEFAULT 0,
  qtd_separada NUMERIC NOT NULL DEFAULT 0,
  zone_id UUID REFERENCES public.warehouse_zones(id) ON DELETE SET NULL,
  ordem_rota INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','separado','falta','cancelado')),
  observacao TEXT,
  separado_em TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pwi_wave ON public.picking_wave_items(wave_id);
CREATE INDEX IF NOT EXISTS idx_pwi_org ON public.picking_wave_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_pwi_status ON public.picking_wave_items(status);

ALTER TABLE public.picking_wave_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pwi_select" ON public.picking_wave_items FOR SELECT TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE POLICY "pwi_insert" ON public.picking_wave_items FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "pwi_update" ON public.picking_wave_items FOR UPDATE TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE POLICY "pwi_delete" ON public.picking_wave_items FOR DELETE TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE TRIGGER trg_pwi_updated BEFORE UPDATE ON public.picking_wave_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_picking_waves_dashboard()
RETURNS TABLE(abertas BIGINT, separando BIGINT, concluidas_hoje BIGINT, itens_pendentes BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.picking_waves WHERE organization_id = public.get_user_organization_id() AND status = 'aberta'),
    (SELECT COUNT(*) FROM public.picking_waves WHERE organization_id = public.get_user_organization_id() AND status = 'separando'),
    (SELECT COUNT(*) FROM public.picking_waves WHERE organization_id = public.get_user_organization_id() AND status = 'concluida' AND concluida_em::date = current_date),
    (SELECT COUNT(*) FROM public.picking_wave_items WHERE organization_id = public.get_user_organization_id() AND status = 'pendente');
$$;
