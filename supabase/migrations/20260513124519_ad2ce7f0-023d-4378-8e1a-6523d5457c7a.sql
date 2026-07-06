
-- Helper: resolve approver user ids for a given step (considers active delegations)
CREATE OR REPLACE FUNCTION public.resolve_step_approvers(_step_id uuid)
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _step record;
  _org uuid;
BEGIN
  SELECT s.*, r.organization_id
    INTO _step
  FROM approval_request_steps s
  JOIN approval_requests r ON r.id = s.request_id
  WHERE s.id = _step_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  _org := _step.organization_id;

  IF _step.aprovador_user_id IS NOT NULL THEN
    -- Direct user, apply active delegation if any
    RETURN QUERY
    SELECT COALESCE(d.destino_user_id, _step.aprovador_user_id) AS user_id
    FROM (SELECT 1) x
    LEFT JOIN approval_delegations d
      ON d.organization_id = _org
     AND d.origem_user_id = _step.aprovador_user_id
     AND d.ativo = true
     AND CURRENT_DATE BETWEEN d.vigencia_inicio AND d.vigencia_fim
    LIMIT 1;
    RETURN;
  END IF;

  IF _step.aprovador_papel IS NOT NULL THEN
    RETURN QUERY
    SELECT om.user_id
    FROM organization_members om
    WHERE om.organization_id = _org
      AND om.is_active = true
      AND om.role = _step.aprovador_papel;
  END IF;
END;
$$;

-- Trigger function: when a step becomes 'pendente', create alerts for resolved approvers
CREATE OR REPLACE FUNCTION public.notify_approval_step_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org uuid;
  _ref_tipo text;
  _ref_id uuid;
  _approver record;
BEGIN
  IF NEW.status <> 'pendente' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'pendente' THEN
    RETURN NEW;
  END IF;

  SELECT r.organization_id, r.referencia_tipo, r.referencia_id
    INTO _org, _ref_tipo, _ref_id
  FROM approval_requests r
  WHERE r.id = NEW.request_id;

  FOR _approver IN
    SELECT user_id FROM public.resolve_step_approvers(NEW.id)
  LOOP
    INSERT INTO alerts (organization_id, type, severity, title, message, is_read)
    VALUES (
      _org,
      'system',
      'medium',
      'Aprovação pendente',
      'Você tem uma aprovação pendente: ' || COALESCE(_ref_tipo,'') || ' #' || COALESCE(_ref_id::text,''),
      false
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_approval_step_pending ON approval_request_steps;
CREATE TRIGGER trg_notify_approval_step_pending
AFTER INSERT OR UPDATE OF status ON approval_request_steps
FOR EACH ROW
EXECUTE FUNCTION public.notify_approval_step_pending();

-- Trigger: when approval_requests is concluded, alert the requester
CREATE OR REPLACE FUNCTION public.notify_approval_request_decided()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('aprovado','rejeitado') THEN
    RETURN NEW;
  END IF;

  INSERT INTO alerts (organization_id, type, severity, title, message, is_read)
  VALUES (
    NEW.organization_id,
    'system',
    CASE WHEN NEW.status = 'rejeitado' THEN 'high' ELSE 'medium' END,
    CASE WHEN NEW.status = 'rejeitado' THEN 'Solicitação rejeitada' ELSE 'Solicitação aprovada' END,
    'Sua solicitação ' || COALESCE(NEW.referencia_tipo,'') || ' #' || COALESCE(NEW.referencia_id::text,'') || ' foi ' || NEW.status,
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_approval_request_decided ON approval_requests;
CREATE TRIGGER trg_notify_approval_request_decided
AFTER UPDATE OF status ON approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_approval_request_decided();

-- SLA sweep: escalate overdue steps and send reminders
CREATE OR REPLACE FUNCTION public.approval_sla_sweep()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _step record;
  _escalated int := 0;
  _reminded int := 0;
  _max_ordem int;
BEGIN
  -- Escalate overdue steps that have an escalation target
  FOR _step IN
    SELECT s.*, r.organization_id, r.referencia_tipo, r.referencia_id
    FROM approval_request_steps s
    JOIN approval_requests r ON r.id = s.request_id
    WHERE s.status = 'pendente'
      AND s.prazo_em IS NOT NULL
      AND s.prazo_em < now()
      AND s.escalona_para IS NOT NULL
  LOOP
    UPDATE approval_request_steps
       SET status = 'escalonado', updated_at = now()
     WHERE id = _step.id;

    SELECT COALESCE(MAX(ordem),0) INTO _max_ordem
      FROM approval_request_steps
     WHERE request_id = _step.request_id;

    INSERT INTO approval_request_steps (
      request_id, ordem, nome, tipo, aprovador_user_id, status, prazo_em
    ) VALUES (
      _step.request_id,
      _max_ordem + 1,
      'Escalonamento de: ' || _step.nome,
      _step.tipo,
      _step.escalona_para,
      'pendente',
      now() + interval '24 hours'
    );

    _escalated := _escalated + 1;
  END LOOP;

  -- Reminder for steps with no escalation but overdue (alert the org)
  FOR _step IN
    SELECT s.*, r.organization_id, r.referencia_tipo, r.referencia_id
    FROM approval_request_steps s
    JOIN approval_requests r ON r.id = s.request_id
    WHERE s.status = 'pendente'
      AND s.prazo_em IS NOT NULL
      AND s.prazo_em < now()
      AND s.escalona_para IS NULL
  LOOP
    INSERT INTO alerts (organization_id, type, severity, title, message, is_read)
    VALUES (
      _step.organization_id,
      'system',
      'high',
      'Aprovação atrasada',
      'A etapa "' || _step.nome || '" da aprovação está com prazo vencido.',
      false
    );
    _reminded := _reminded + 1;
  END LOOP;

  RETURN jsonb_build_object('escalated', _escalated, 'reminded', _reminded, 'ran_at', now());
END;
$$;

-- Schedule sweep hourly
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  _jobid bigint;
BEGIN
  SELECT jobid INTO _jobid FROM cron.job WHERE jobname = 'approval-sla-sweep';
  IF _jobid IS NOT NULL THEN
    PERFORM cron.unschedule(_jobid);
  END IF;
END;
$$;

SELECT cron.schedule(
  'approval-sla-sweep',
  '0 * * * *',
  $$ SELECT public.approval_sla_sweep(); $$
);
