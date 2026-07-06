-- Admin: Setores / Centro de Custo
-- Evolui a tabela existente sem criar cadastro paralelo.

ALTER TABLE public.cost_centers
  ADD COLUMN IF NOT EXISTS classificacao text,
  ADD COLUMN IF NOT EXISTS unidade_polo text,
  ADD COLUMN IF NOT EXISTS campus text,
  ADD COLUMN IF NOT EXISTS setor_departamento text,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

UPDATE public.cost_centers
SET
  setor_departamento = COALESCE(setor_departamento, nome),
  unidade_polo = COALESCE(unidade_polo, 'Nova Iguaçu'),
  campus = COALESCE(campus, unidade_polo, 'Nova Iguaçu')
WHERE setor_departamento IS NULL
   OR unidade_polo IS NULL
   OR campus IS NULL;

ALTER TABLE public.cost_centers
  ALTER COLUMN unidade_polo SET DEFAULT 'Nova Iguaçu',
  ALTER COLUMN unidade_polo SET NOT NULL;

ALTER TABLE public.cost_centers
  DROP CONSTRAINT IF EXISTS cost_centers_organization_id_codigo_key;

ALTER TABLE public.cost_centers
  ADD CONSTRAINT cost_centers_org_unidade_codigo_unique
  UNIQUE (organization_id, unidade_polo, codigo);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cost_centers_org_unidade_codigo_norm_unique
  ON public.cost_centers (organization_id, lower(trim(unidade_polo)), lower(trim(codigo)));

CREATE UNIQUE INDEX IF NOT EXISTS idx_cost_centers_org_unidade_classificacao_unique
  ON public.cost_centers (organization_id, lower(trim(unidade_polo)), lower(trim(classificacao)))
  WHERE classificacao IS NOT NULL AND trim(classificacao) <> '';

CREATE INDEX IF NOT EXISTS idx_cost_centers_org_unidade_status
  ON public.cost_centers (organization_id, unidade_polo, ativo);

CREATE INDEX IF NOT EXISTS idx_cost_centers_org_setor
  ON public.cost_centers (organization_id, setor_departamento);

ALTER TABLE public.ci_requests
  ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ci_requests_cost_center_id
  ON public.ci_requests (cost_center_id);

DROP POLICY IF EXISTS "Admins/gerentes insert cost centers" ON public.cost_centers;
DROP POLICY IF EXISTS "Admins/gerentes update cost centers" ON public.cost_centers;
DROP POLICY IF EXISTS "Admins delete cost centers" ON public.cost_centers;
DROP POLICY IF EXISTS "Admins insert cost centers" ON public.cost_centers;
DROP POLICY IF EXISTS "Admins update cost centers" ON public.cost_centers;
DROP POLICY IF EXISTS "Admins delete cost centers restricted" ON public.cost_centers;

CREATE POLICY "Admins insert cost centers"
  ON public.cost_centers FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND (
      public.get_current_user_role() = 'admin'
      OR public.is_super_admin()
    )
  );

CREATE POLICY "Admins update cost centers"
  ON public.cost_centers FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND (
      public.get_current_user_role() = 'admin'
      OR public.is_super_admin()
    )
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND (
      public.get_current_user_role() = 'admin'
      OR public.is_super_admin()
    )
  );

CREATE POLICY "Admins delete cost centers restricted"
  ON public.cost_centers FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND (
      public.get_current_user_role() = 'admin'
      OR public.is_super_admin()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_cost_centers ucc WHERE ucc.cost_center_id = cost_centers.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.purchase_requests pr WHERE pr.cost_center_id = cost_centers.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.purchase_orders po WHERE po.cost_center_id = cost_centers.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.accounts_payable ap WHERE ap.cost_center_id = cost_centers.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.ci_requests ci WHERE ci.cost_center_id = cost_centers.id
    )
  );

CREATE OR REPLACE FUNCTION public.set_cost_center_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  END IF;
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cost_centers_audit_fields ON public.cost_centers;
CREATE TRIGGER trg_cost_centers_audit_fields
  BEFORE INSERT OR UPDATE ON public.cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.set_cost_center_audit_fields();

CREATE OR REPLACE FUNCTION public.log_cost_center_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'cost_center_created';
  ELSIF TG_OP = 'UPDATE' AND OLD.ativo = true AND NEW.ativo = false THEN
    v_action := 'cost_center_deactivated';
  ELSIF TG_OP = 'UPDATE' AND OLD.ativo = false AND NEW.ativo = true THEN
    v_action := 'cost_center_reactivated';
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'cost_center_updated';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'cost_center_deleted';
  END IF;

  INSERT INTO public.security_audit_log (
    user_id,
    organization_id,
    action,
    details
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.organization_id, OLD.organization_id),
    v_action,
    jsonb_build_object(
      'id', COALESCE(NEW.id, OLD.id),
      'codigo', COALESCE(NEW.codigo, OLD.codigo),
      'nome', COALESCE(NEW.nome, OLD.nome),
      'unidade_polo', COALESCE(NEW.unidade_polo, OLD.unidade_polo),
      'before', CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
      'after', CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_cost_center_action ON public.cost_centers;
CREATE TRIGGER trg_log_cost_center_action
  AFTER INSERT OR UPDATE OR DELETE ON public.cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.log_cost_center_action();

CREATE OR REPLACE FUNCTION public.log_cost_center_bulk_action(
  _action text,
  _organization_id uuid,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _organization_id IS DISTINCT FROM public.get_user_organization_id()
     AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Sem permissão para registrar auditoria desta organização';
  END IF;

  INSERT INTO public.security_audit_log (user_id, organization_id, action, details)
  VALUES (auth.uid(), _organization_id, _action, _details);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_cost_centers(_user_id uuid)
RETURNS TABLE (
  id uuid,
  nome text,
  codigo text,
  is_default boolean,
  can_approve_cc boolean,
  classificacao text,
  unidade_polo text,
  campus text,
  setor_departamento text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    cc.id,
    cc.nome,
    cc.codigo,
    ucc.is_default,
    ucc.can_approve_cc,
    cc.classificacao,
    cc.unidade_polo,
    cc.campus,
    cc.setor_departamento
  FROM public.user_cost_centers ucc
  JOIN public.cost_centers cc ON cc.id = ucc.cost_center_id
  WHERE ucc.user_id = _user_id
    AND ucc.can_request = true
    AND cc.ativo = true
  UNION
  SELECT
    cc.id,
    cc.nome,
    cc.codigo,
    false,
    false,
    cc.classificacao,
    cc.unidade_polo,
    cc.campus,
    cc.setor_departamento
  FROM public.cost_centers cc
  WHERE cc.organization_id = public.get_user_organization_id()
    AND cc.ativo = true
    AND (
      public.get_current_user_role() = 'admin'
      OR public.is_super_admin()
    );
$$;
