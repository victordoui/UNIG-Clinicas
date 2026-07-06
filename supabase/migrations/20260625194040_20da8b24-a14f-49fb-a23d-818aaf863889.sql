
-- 1. Approval state on operational_demands
ALTER TABLE public.operational_demands
  ADD COLUMN IF NOT EXISTS approval_state text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS approval_comment text,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- 2. Status history table
CREATE TABLE IF NOT EXISTS public.operational_demand_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  demand_id uuid NOT NULL REFERENCES public.operational_demands(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  comment text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.operational_demand_status_history TO authenticated;
GRANT ALL ON public.operational_demand_status_history TO service_role;

ALTER TABLE public.operational_demand_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS odsh_select ON public.operational_demand_status_history;
CREATE POLICY odsh_select ON public.operational_demand_status_history
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS odsh_insert ON public.operational_demand_status_history;
CREATE POLICY odsh_insert ON public.operational_demand_status_history
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_odsh_demand ON public.operational_demand_status_history(demand_id, changed_at DESC);

-- 3. Trigger: record status change + notify
CREATE OR REPLACE FUNCTION public.trg_operational_demand_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_gerente RECORD;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.operational_demand_status_history (organization_id, demand_id, from_status, to_status, comment, changed_by)
    VALUES (NEW.organization_id, NEW.id, OLD.status, NEW.status, NEW.approval_comment, v_actor);

    -- notify gestor responsavel
    IF NEW.gestor_responsavel IS NOT NULL AND NEW.gestor_responsavel <> COALESCE(v_actor, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.operational_demand_notifications (organization_id, demand_id, recipient_id, event_type, title, message)
      VALUES (NEW.organization_id, NEW.id, NEW.gestor_responsavel, 'status_change',
        'Status da demanda atualizado',
        'A demanda "' || NEW.nome || '" mudou de status para ' || NEW.status || '.');
    END IF;

    -- notify all gerentes gerais of the org
    FOR v_gerente IN
      SELECT DISTINCT ur.user_id
      FROM public.user_roles ur
      JOIN public.organization_members om ON om.user_id = ur.user_id
      WHERE om.organization_id = NEW.organization_id
        AND ur.role::text IN ('gerente_geral','administrador','super_admin')
        AND ur.user_id <> COALESCE(v_actor, '00000000-0000-0000-0000-000000000000'::uuid)
        AND ur.user_id <> COALESCE(NEW.gestor_responsavel, '00000000-0000-0000-0000-000000000000'::uuid)
    LOOP
      INSERT INTO public.operational_demand_notifications (organization_id, demand_id, recipient_id, event_type, title, message)
      VALUES (NEW.organization_id, NEW.id, v_gerente.user_id, 'status_change',
        'Status alterado: ' || NEW.code,
        NEW.nome || ' → ' || NEW.status);
    END LOOP;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.approval_state IS DISTINCT FROM OLD.approval_state THEN
    IF NEW.gestor_responsavel IS NOT NULL AND NEW.gestor_responsavel <> COALESCE(v_actor, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.operational_demand_notifications (organization_id, demand_id, recipient_id, event_type, title, message)
      VALUES (NEW.organization_id, NEW.id, NEW.gestor_responsavel, 'approval_decision',
        CASE NEW.approval_state WHEN 'aprovado' THEN 'Demanda aprovada' WHEN 'rejeitado' THEN 'Demanda rejeitada' ELSE 'Decisão registrada' END,
        COALESCE(NEW.approval_comment, '') );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_od_status_change ON public.operational_demands;
CREATE TRIGGER trg_od_status_change
AFTER UPDATE ON public.operational_demands
FOR EACH ROW EXECUTE FUNCTION public.trg_operational_demand_status_change();

-- 4. Trigger: notify when evolution update inserted
CREATE OR REPLACE FUNCTION public.trg_operational_demand_update_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_demand RECORD;
  v_gerente RECORD;
BEGIN
  SELECT id, organization_id, nome, code, gestor_responsavel INTO v_demand
  FROM public.operational_demands WHERE id = NEW.demand_id;
  IF v_demand IS NULL THEN RETURN NEW; END IF;

  FOR v_gerente IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    JOIN public.organization_members om ON om.user_id = ur.user_id
    WHERE om.organization_id = v_demand.organization_id
      AND ur.role::text IN ('gerente_geral','administrador','super_admin')
      AND ur.user_id <> COALESCE(NEW.autor, '00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    INSERT INTO public.operational_demand_notifications (organization_id, demand_id, recipient_id, event_type, title, message)
    VALUES (v_demand.organization_id, v_demand.id, v_gerente.user_id, 'evolution_update',
      'Nova evolução: ' || v_demand.code,
      v_demand.nome || ' — ' || COALESCE(left(NEW.texto, 140), ''));
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_od_update_notify ON public.operational_demand_updates;
CREATE TRIGGER trg_od_update_notify
AFTER INSERT ON public.operational_demand_updates
FOR EACH ROW EXECUTE FUNCTION public.trg_operational_demand_update_notify();
