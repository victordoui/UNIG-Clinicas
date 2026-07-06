
-- Atualizações Gerenciais — campos adicionais + tabela de unidades múltiplas
ALTER TABLE public.operational_demands
  ADD COLUMN IF NOT EXISTS dependencies text,
  ADD COLUMN IF NOT EXISTS attention_points text,
  ADD COLUMN IF NOT EXISTS manager_summary text,
  ADD COLUMN IF NOT EXISTS last_summary_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_summary_generated_by uuid;

CREATE TABLE IF NOT EXISTS public.operational_demand_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.operational_demands(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  campus_id uuid NULL,
  unit_name_fallback text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_demand_units TO authenticated;
GRANT ALL ON public.operational_demand_units TO service_role;

ALTER TABLE public.operational_demand_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "od_units_select" ON public.operational_demand_units
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "od_units_write" ON public.operational_demand_units
  FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE INDEX IF NOT EXISTS idx_od_units_demand ON public.operational_demand_units(demand_id);
CREATE INDEX IF NOT EXISTS idx_od_units_org ON public.operational_demand_units(organization_id);
