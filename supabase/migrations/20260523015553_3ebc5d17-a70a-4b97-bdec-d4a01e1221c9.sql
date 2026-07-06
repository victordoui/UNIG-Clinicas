
-- 1. Novos estados em ci_status
ALTER TYPE public.ci_status ADD VALUE IF NOT EXISTS 'aguardando_validacao_tecnica';
ALTER TYPE public.ci_status ADD VALUE IF NOT EXISTS 'ajuste_solicitado_engenheira';
ALTER TYPE public.ci_status ADD VALUE IF NOT EXISTS 'aguardando_coordenador';
ALTER TYPE public.ci_status ADD VALUE IF NOT EXISTS 'aguardando_gerente';
ALTER TYPE public.ci_status ADD VALUE IF NOT EXISTS 'aguardando_conselho';
ALTER TYPE public.ci_status ADD VALUE IF NOT EXISTS 'revisao_solicitada';
ALTER TYPE public.ci_status ADD VALUE IF NOT EXISTS 'desaprovada_conselho';

-- 2. Novos campos no registro da CI
ALTER TABLE public.ci_requests
  ADD COLUMN IF NOT EXISTS requires_technical_validation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS technical_reviewer_id uuid,
  ADD COLUMN IF NOT EXISTS technical_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS technical_review_notes text,
  ADD COLUMN IF NOT EXISTS requires_superior_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS council_decision text,
  ADD COLUMN IF NOT EXISTS council_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS council_decided_by uuid;

-- 3. Helper: verifica se usuário logado tem algum dos papéis na org da CI
CREATE OR REPLACE FUNCTION public._ci_user_has_role(_ci_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ci_requests c
    JOIN public.organization_members m
      ON m.organization_id = c.organization_id AND m.user_id = auth.uid()
    WHERE c.id = _ci_id
      AND m.is_active = true
      AND m.role = ANY(_roles)
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true);
$$;

-- 4. Coordenador envia para validação técnica
CREATE OR REPLACE FUNCTION public.ci_request_technical_review(_id uuid, _comentario text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org uuid; v_from text;
BEGIN
  IF NOT public._ci_user_has_role(_id, ARRAY['coordenador_operacoes','administrador','organization_admin','admin','super_admin']) THEN
    RAISE EXCEPTION 'Apenas o Coordenador pode solicitar validação técnica';
  END IF;
  SELECT organization_id, status::text INTO v_org, v_from FROM public.ci_requests WHERE id = _id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'CI não encontrada'; END IF;

  UPDATE public.ci_requests
     SET status = 'aguardando_validacao_tecnica',
         requires_technical_validation = true,
         updated_at = now()
   WHERE id = _id;

  INSERT INTO public.ci_status_history(ci_id, organization_id, event_type, from_status, to_status, actor_id, payload)
  VALUES (_id, v_org, 'enviado_engenheira', v_from, 'aguardando_validacao_tecnica', auth.uid(),
          jsonb_build_object('comentario', _comentario));
END;
$$;

-- 5. Engenheira solicita ajuste
CREATE OR REPLACE FUNCTION public.ci_engineer_request_adjustment(_id uuid, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org uuid; v_from text;
BEGIN
  IF _motivo IS NULL OR length(trim(_motivo)) = 0 THEN
    RAISE EXCEPTION 'Motivo do ajuste é obrigatório';
  END IF;
  IF NOT public._ci_user_has_role(_id, ARRAY['engenheira','administrador','organization_admin','admin','super_admin']) THEN
    RAISE EXCEPTION 'Apenas a Engenheira pode solicitar ajuste';
  END IF;
  SELECT organization_id, status::text INTO v_org, v_from FROM public.ci_requests WHERE id = _id;

  UPDATE public.ci_requests
     SET status = 'ajuste_solicitado_engenheira',
         technical_review_notes = _motivo,
         technical_reviewer_id = auth.uid(),
         technical_reviewed_at = now(),
         updated_at = now()
   WHERE id = _id;

  INSERT INTO public.ci_status_history(ci_id, organization_id, event_type, from_status, to_status, actor_id, payload)
  VALUES (_id, v_org, 'ajuste_solicitado', v_from, 'ajuste_solicitado_engenheira', auth.uid(),
          jsonb_build_object('motivo', _motivo));
END;
$$;

-- 6. Engenheira dá OK técnico
CREATE OR REPLACE FUNCTION public.ci_engineer_approve(_id uuid, _parecer text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org uuid; v_from text;
BEGIN
  IF NOT public._ci_user_has_role(_id, ARRAY['engenheira','administrador','organization_admin','admin','super_admin']) THEN
    RAISE EXCEPTION 'Apenas a Engenheira pode dar OK técnico';
  END IF;
  SELECT organization_id, status::text INTO v_org, v_from FROM public.ci_requests WHERE id = _id;

  UPDATE public.ci_requests
     SET status = 'aguardando_coordenador',
         technical_review_notes = COALESCE(_parecer, technical_review_notes),
         technical_reviewer_id = auth.uid(),
         technical_reviewed_at = now(),
         updated_at = now()
   WHERE id = _id;

  INSERT INTO public.ci_status_history(ci_id, organization_id, event_type, from_status, to_status, actor_id, payload)
  VALUES (_id, v_org, 'ok_tecnico', v_from, 'aguardando_coordenador', auth.uid(),
          jsonb_build_object('parecer', _parecer));
END;
$$;

-- 7. Coordenador aprova e libera para cotação
CREATE OR REPLACE FUNCTION public.ci_coordinator_approve(_id uuid, _comentario text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org uuid; v_from text;
BEGIN
  IF NOT public._ci_user_has_role(_id, ARRAY['coordenador_operacoes','administrador','organization_admin','admin','super_admin']) THEN
    RAISE EXCEPTION 'Apenas o Coordenador pode aprovar';
  END IF;
  SELECT organization_id, status::text INTO v_org, v_from FROM public.ci_requests WHERE id = _id;

  UPDATE public.ci_requests
     SET status = 'em_cotacao',
         approved_by = auth.uid(),
         approved_at = now(),
         updated_at = now()
   WHERE id = _id;

  INSERT INTO public.ci_status_history(ci_id, organization_id, event_type, from_status, to_status, actor_id, payload)
  VALUES (_id, v_org, 'aprovacao_coordenador', v_from, 'em_cotacao', auth.uid(),
          jsonb_build_object('comentario', _comentario));
END;
$$;

-- 8. Compras solicita aprovação superior
CREATE OR REPLACE FUNCTION public.ci_request_superior_approval(_id uuid, _motivo text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org uuid; v_from text;
BEGIN
  IF NOT public._ci_user_has_role(_id, ARRAY['compras','administrador','organization_admin','admin','super_admin']) THEN
    RAISE EXCEPTION 'Apenas Compras pode solicitar aprovação superior';
  END IF;
  SELECT organization_id, status::text INTO v_org, v_from FROM public.ci_requests WHERE id = _id;

  UPDATE public.ci_requests
     SET status = 'aguardando_gerente',
         requires_superior_approval = true,
         updated_at = now()
   WHERE id = _id;

  INSERT INTO public.ci_status_history(ci_id, organization_id, event_type, from_status, to_status, actor_id, payload)
  VALUES (_id, v_org, 'aprovacao_superior_solicitada', v_from, 'aguardando_gerente', auth.uid(),
          jsonb_build_object('motivo', _motivo));
END;
$$;

-- 9. Gerente Geral encaminha ao Conselho
CREATE OR REPLACE FUNCTION public.ci_manager_send_to_council(_id uuid, _comentario text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org uuid; v_from text;
BEGIN
  IF NOT public._ci_user_has_role(_id, ARRAY['gerente_geral','administrador','organization_admin','admin','super_admin']) THEN
    RAISE EXCEPTION 'Apenas o Gerente Geral pode encaminhar ao Conselho';
  END IF;
  SELECT organization_id, status::text INTO v_org, v_from FROM public.ci_requests WHERE id = _id;

  UPDATE public.ci_requests
     SET status = 'aguardando_conselho',
         updated_at = now()
   WHERE id = _id;

  INSERT INTO public.ci_status_history(ci_id, organization_id, event_type, from_status, to_status, actor_id, payload)
  VALUES (_id, v_org, 'encaminhado_conselho', v_from, 'aguardando_conselho', auth.uid(),
          jsonb_build_object('comentario', _comentario));
END;
$$;

-- 10. Conselho decide
CREATE OR REPLACE FUNCTION public.ci_council_decide(_id uuid, _decisao text, _comentario text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org uuid; v_from text; v_to text;
BEGIN
  IF _decisao NOT IN ('aprovado','revisao','desaprovado') THEN
    RAISE EXCEPTION 'Decisão inválida';
  END IF;
  IF NOT public._ci_user_has_role(_id, ARRAY['administrador','organization_admin','admin','super_admin']) THEN
    RAISE EXCEPTION 'Apenas o Conselho pode decidir';
  END IF;
  SELECT organization_id, status::text INTO v_org, v_from FROM public.ci_requests WHERE id = _id;

  v_to := CASE _decisao
    WHEN 'aprovado' THEN 'em_cotacao'
    WHEN 'revisao' THEN 'revisao_solicitada'
    WHEN 'desaprovado' THEN 'desaprovada_conselho'
  END;

  UPDATE public.ci_requests
     SET status = v_to::ci_status,
         council_decision = _decisao,
         council_decided_at = now(),
         council_decided_by = auth.uid(),
         rejected_reason = CASE WHEN _decisao = 'desaprovado' THEN _comentario ELSE rejected_reason END,
         updated_at = now()
   WHERE id = _id;

  INSERT INTO public.ci_status_history(ci_id, organization_id, event_type, from_status, to_status, actor_id, payload)
  VALUES (_id, v_org, 'decisao_conselho_' || _decisao, v_from, v_to, auth.uid(),
          jsonb_build_object('comentario', _comentario));
END;
$$;
