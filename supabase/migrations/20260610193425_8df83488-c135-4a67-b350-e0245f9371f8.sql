CREATE TABLE public.ci_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_templates TO authenticated;
GRANT ALL ON public.ci_templates TO service_role;

ALTER TABLE public.ci_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own org templates"
  ON public.ci_templates FOR SELECT TO authenticated
  USING (organization_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));

CREATE POLICY "Users insert own templates"
  ON public.ci_templates FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND organization_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));

CREATE POLICY "Users update own templates"
  ON public.ci_templates FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users delete own templates"
  ON public.ci_templates FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE OR REPLACE FUNCTION public.update_ci_templates_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_ci_templates_updated_at
  BEFORE UPDATE ON public.ci_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_ci_templates_updated_at();

CREATE INDEX idx_ci_templates_org_user ON public.ci_templates(organization_id, created_by);