-- Helper: invoke send-push-notification edge function asynchronously
CREATE OR REPLACE FUNCTION public._invoke_push(_user_id uuid, _title text, _message text, _url text, _data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url constant text := 'https://onngvrefjnzwvxmqnztd.supabase.co/functions/v1/send-push-notification';
  v_key constant text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ubmd2cmVmam56d3Z4bXFuenRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MTA2MDIsImV4cCI6MjA3MzA4NjYwMn0.E1O_NiFp7W2C2zn7ZP28diAtzIGCUl-fSW-bMI4Dl-Q';
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  PERFORM extensions.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_key,
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'userId', _user_id,
      'title', _title,
      'message', _message,
      'url', _url,
      'data', _data
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- never break the originating transaction
  RAISE WARNING 'push invoke failed for %: %', _user_id, SQLERRM;
END;
$$;

-- Trigger function: approval step became pending
CREATE OR REPLACE FUNCTION public.notify_approval_step_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_uid uuid;
  v_title text;
  v_url text;
  v_msg text;
BEGIN
  IF NEW.status <> 'pendente' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'pendente' THEN RETURN NEW; END IF;

  SELECT r.id, r.referencia_tipo, r.organization_id, r.valor
    INTO v_req
  FROM public.approval_requests r
  WHERE r.id = NEW.request_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  v_title := CASE WHEN v_req.referencia_tipo = 'purchase_order'
                  THEN 'Pedido aguardando sua aprovação'
                  ELSE 'Solicitação aguardando sua aprovação'
             END;
  v_msg := COALESCE('Etapa: ' || NEW.nome, 'Há um novo item na sua caixa de entrada');
  v_url := '/aprovacoes/' || v_req.id::text;

  FOR v_uid IN
    SELECT DISTINCT u FROM (
      -- direct approver
      SELECT NEW.aprovador_user_id AS u WHERE NEW.aprovador_user_id IS NOT NULL
      UNION ALL
      -- by role
      SELECT om.user_id FROM public.organization_members om
      WHERE NEW.aprovador_papel IS NOT NULL
        AND om.is_active
        AND om.organization_id = v_req.organization_id
        AND om.role::text = NEW.aprovador_papel
      UNION ALL
      -- active delegations of direct approver
      SELECT d.destino_user_id FROM public.approval_delegations d
      WHERE d.ativo
        AND d.organization_id = v_req.organization_id
        AND CURRENT_DATE BETWEEN d.vigencia_inicio AND d.vigencia_fim
        AND d.origem_user_id = NEW.aprovador_user_id
      UNION ALL
      -- active delegations of role-based approvers
      SELECT d.destino_user_id FROM public.approval_delegations d
      JOIN public.organization_members om2 ON om2.user_id = d.origem_user_id
      WHERE NEW.aprovador_papel IS NOT NULL
        AND d.ativo
        AND d.organization_id = v_req.organization_id
        AND CURRENT_DATE BETWEEN d.vigencia_inicio AND d.vigencia_fim
        AND om2.is_active
        AND om2.organization_id = v_req.organization_id
        AND om2.role::text = NEW.aprovador_papel
    ) s WHERE u IS NOT NULL
  LOOP
    PERFORM public._invoke_push(v_uid, v_title, v_msg, v_url,
      jsonb_build_object('kind','approval','stepId', NEW.id, 'requestId', v_req.id));
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_approval_step_assigned ON public.approval_request_steps;
CREATE TRIGGER trg_notify_approval_step_assigned
AFTER INSERT OR UPDATE OF status ON public.approval_request_steps
FOR EACH ROW EXECUTE FUNCTION public.notify_approval_step_assigned();

-- Trigger function: council proposal opened for voting
CREATE OR REPLACE FUNCTION public.notify_council_proposal_open()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_url text;
BEGIN
  IF NEW.status::text <> 'em_votacao' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status::text = 'em_votacao' THEN RETURN NEW; END IF;

  v_url := '/conselho/' || NEW.id::text;

  FOR v_uid IN
    SELECT user_id FROM public.council_members
    WHERE organization_id = NEW.organization_id AND ativo = true
  LOOP
    PERFORM public._invoke_push(v_uid,
      'Nova proposta para votação',
      COALESCE(NEW.titulo, 'Proposta do conselho'),
      v_url,
      jsonb_build_object('kind','council','proposalId', NEW.id));
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_council_proposal_open ON public.council_proposals;
CREATE TRIGGER trg_notify_council_proposal_open
AFTER INSERT OR UPDATE OF status ON public.council_proposals
FOR EACH ROW EXECUTE FUNCTION public.notify_council_proposal_open();