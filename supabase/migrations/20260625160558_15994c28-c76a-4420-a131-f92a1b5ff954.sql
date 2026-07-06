
-- 1) Coluna de atraso
ALTER TABLE public.operational_demands
  ADD COLUMN IF NOT EXISTS is_overdue boolean NOT NULL DEFAULT false;

-- 2) Tabela de notificações por usuário
CREATE TABLE IF NOT EXISTS public.operational_demand_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  demand_id uuid NOT NULL REFERENCES public.operational_demands(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_demand_notifications TO authenticated;
GRANT ALL ON public.operational_demand_notifications TO service_role;

ALTER TABLE public.operational_demand_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipient reads own notifications"
  ON public.operational_demand_notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Recipient updates own notifications"
  ON public.operational_demand_notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "System inserts notifications"
  ON public.operational_demand_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS ix_dem_notif_recipient ON public.operational_demand_notifications(recipient_id, is_read, created_at DESC);

-- 3) Função utilitária para inserir notificação (ignora destinatários nulos / duplicados)
CREATE OR REPLACE FUNCTION public._dem_notify(
  _org uuid, _demand uuid, _recipient uuid, _event text, _title text, _message text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _recipient IS NULL THEN RETURN; END IF;
  INSERT INTO public.operational_demand_notifications(organization_id, demand_id, recipient_id, event_type, title, message)
  VALUES (_org, _demand, _recipient, _event, _title, _message);
END;
$$;

-- 4) Trigger: histórico + notificações em INSERT/UPDATE de demanda
CREATE OR REPLACE FUNCTION public.tg_operational_demand_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.operational_demand_activity_log(demand_id, organization_id, evento, payload, autor)
    VALUES (NEW.id, NEW.organization_id, 'criada',
            jsonb_build_object('descricao', 'Demanda criada'), _actor);

    PERFORM public._dem_notify(NEW.organization_id, NEW.id, NEW.gestor_responsavel,
      'criada', 'Nova demanda atribuída', NEW.nome);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- status
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.operational_demand_activity_log(demand_id, organization_id, evento, payload, autor)
      VALUES (NEW.id, NEW.organization_id, 'status',
              jsonb_build_object('descricao', 'Status alterado: ' || OLD.status || ' → ' || NEW.status,
                                 'de', OLD.status, 'para', NEW.status), _actor);
      PERFORM public._dem_notify(NEW.organization_id, NEW.id, NEW.gestor_responsavel,
        'status', 'Status da demanda atualizado',
        'Status: ' || OLD.status || ' → ' || NEW.status);
      PERFORM public._dem_notify(NEW.organization_id, NEW.id, NEW.created_by,
        'status', 'Status da sua demanda foi atualizado',
        'Status: ' || OLD.status || ' → ' || NEW.status);
    END IF;

    -- responsável trocou
    IF NEW.gestor_responsavel IS DISTINCT FROM OLD.gestor_responsavel THEN
      INSERT INTO public.operational_demand_activity_log(demand_id, organization_id, evento, payload, autor)
      VALUES (NEW.id, NEW.organization_id, 'responsavel',
              jsonb_build_object('descricao', 'Responsável alterado'), _actor);
      PERFORM public._dem_notify(NEW.organization_id, NEW.id, NEW.gestor_responsavel,
        'atribuida', 'Demanda atribuída a você', NEW.nome);
      PERFORM public._dem_notify(NEW.organization_id, NEW.id, OLD.gestor_responsavel,
        'reatribuida', 'Demanda reatribuída', NEW.nome);
    END IF;

    -- prazo ou prioridade
    IF NEW.prazo_estimado IS DISTINCT FROM OLD.prazo_estimado
       OR NEW.prioridade IS DISTINCT FROM OLD.prioridade THEN
      INSERT INTO public.operational_demand_activity_log(demand_id, organization_id, evento, payload, autor)
      VALUES (NEW.id, NEW.organization_id, 'editada',
              jsonb_build_object('descricao', 'Prazo/prioridade alterados'), _actor);
      PERFORM public._dem_notify(NEW.organization_id, NEW.id, NEW.gestor_responsavel,
        'editada', 'Demanda atualizada', NEW.nome);
    END IF;

    -- atraso marcado/desmarcado
    IF NEW.is_overdue IS DISTINCT FROM OLD.is_overdue AND NEW.is_overdue = true THEN
      PERFORM public._dem_notify(NEW.organization_id, NEW.id, NEW.gestor_responsavel,
        'atrasada', 'Demanda atrasada', NEW.nome);
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_operational_demand_audit ON public.operational_demands;
CREATE TRIGGER trg_operational_demand_audit
AFTER INSERT OR UPDATE ON public.operational_demands
FOR EACH ROW EXECUTE FUNCTION public.tg_operational_demand_audit();

-- 5) Trigger em updates (nova atualização) — notificar gestor
CREATE OR REPLACE FUNCTION public.tg_operational_demand_update_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _gestor uuid;
  _nome text;
BEGIN
  SELECT gestor_responsavel, nome INTO _gestor, _nome
  FROM public.operational_demands WHERE id = NEW.demand_id;

  INSERT INTO public.operational_demand_activity_log(demand_id, organization_id, evento, payload, autor)
  VALUES (NEW.demand_id, NEW.organization_id, 'atualizacao',
          jsonb_build_object('descricao', 'Nova atualização registrada'), NEW.autor);

  PERFORM public._dem_notify(NEW.organization_id, NEW.demand_id, _gestor,
    'atualizacao', 'Nova atualização em demanda', _nome);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_operational_demand_update_notify ON public.operational_demand_updates;
CREATE TRIGGER trg_operational_demand_update_notify
AFTER INSERT ON public.operational_demand_updates
FOR EACH ROW EXECUTE FUNCTION public.tg_operational_demand_update_notify();

-- 6) Função para marcar demandas atrasadas (idempotente)
CREATE OR REPLACE FUNCTION public.mark_overdue_demands()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer := 0;
BEGIN
  WITH upd AS (
    UPDATE public.operational_demands
    SET is_overdue = true, updated_at = now()
    WHERE is_overdue = false
      AND status NOT IN ('concluida','cancelada')
      AND prazo_estimado IS NOT NULL
      AND prazo_estimado < now()::date
    RETURNING id, organization_id
  )
  INSERT INTO public.operational_demand_activity_log(demand_id, organization_id, evento, payload)
  SELECT id, organization_id, 'atrasada',
         jsonb_build_object('descricao', 'Demanda marcada como atrasada automaticamente')
  FROM upd;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_overdue_demands() TO authenticated;
