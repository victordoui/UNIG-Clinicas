-- Individualiza o trabalho dos compradores e remove a conta genérica de testes.

CREATE INDEX IF NOT EXISTS idx_purchase_requests_responsavel
  ON public.purchase_requests (organization_id, responsavel_id);

CREATE OR REPLACE FUNCTION public._ci_user_can_distribute(_ci_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1
    FROM public.ci_requests c
    JOIN public.organization_members m
      ON m.organization_id = c.organization_id
     AND m.user_id = auth.uid()
    WHERE c.id = _ci_id
      AND m.is_active = true
      AND m.role IN (
        'organization_admin', 'admin', 'administrador',
        'coordenador_operacoes', 'gerente_geral'
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.ci_assign_buyer(
  _id uuid,
  _buyer_id uuid,
  _secondary uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_status text;
BEGIN
  IF NOT public._ci_user_can_distribute(_id) THEN
    RAISE EXCEPTION 'Somente gestores podem distribuir esta CI';
  END IF;
  IF _buyer_id IS NULL THEN
    RAISE EXCEPTION 'Comprador obrigatório';
  END IF;

  SELECT organization_id, status::text
    INTO v_org, v_status
  FROM public.ci_requests
  WHERE id = _id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'CI não encontrada';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = v_org
      AND user_id = _buyer_id
      AND role = 'compras'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'O responsável deve ser um comprador ativo da organização';
  END IF;

  IF _secondary IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = v_org
      AND user_id = _secondary
      AND role = 'compras'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'O comprador secundário deve estar ativo na organização';
  END IF;

  UPDATE public.ci_requests
     SET assigned_to = _buyer_id,
         assigned_to_secondary = _secondary,
         updated_at = now()
   WHERE id = _id;

  UPDATE public.purchase_requests pr
     SET responsavel_id = _buyer_id,
         updated_at = now()
    FROM public.ci_requests ci
   WHERE ci.id = _id
     AND ci.purchase_request_id = pr.id;

  INSERT INTO public.ci_status_history(
    ci_id, organization_id, event_type, from_status, to_status, actor_id, payload
  ) VALUES (
    _id, v_org, 'distribuicao', v_status, v_status, auth.uid(),
    jsonb_build_object('assigned_to', _buyer_id, 'assigned_to_secondary', _secondary)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ci_promote_to_purchase(p_ci_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ci public.ci_requests%ROWTYPE;
  v_pr_id uuid;
BEGIN
  SELECT * INTO v_ci FROM public.ci_requests WHERE id = p_ci_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CI não encontrada'; END IF;
  IF v_ci.organization_id <> public.get_user_organization_id()
     AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF v_ci.assigned_to <> auth.uid()
     AND NOT public._ci_user_can_distribute(p_ci_id) THEN
    RAISE EXCEPTION 'Somente o comprador responsável ou gestores podem iniciar a cotação';
  END IF;
  IF v_ci.assigned_to IS NULL THEN
    RAISE EXCEPTION 'Distribua a CI para um comprador antes de iniciar a cotação';
  END IF;
  IF v_ci.status <> 'aprovada'::public.ci_status THEN
    RAISE EXCEPTION 'Apenas CIs aprovadas podem iniciar cotação';
  END IF;
  IF v_ci.purchase_request_id IS NOT NULL THEN
    UPDATE public.purchase_requests
       SET responsavel_id = v_ci.assigned_to,
           updated_at = now()
     WHERE id = v_ci.purchase_request_id;
    RETURN v_ci.purchase_request_id;
  END IF;

  INSERT INTO public.purchase_requests(
    organization_id, solicitante_id, setor, unidade, cost_center_id,
    prioridade, categoria, item_descricao, quantidade, justificativa,
    responsavel_id, status
  ) VALUES (
    v_ci.organization_id, COALESCE(v_ci.created_by, auth.uid()),
    v_ci.requester_sector, v_ci.campus, v_ci.cost_center_id,
    CASE v_ci.priority
      WHEN 'baixa' THEN 'baixa'::public.purchase_priority
      WHEN 'media' THEN 'normal'::public.purchase_priority
      WHEN 'alta' THEN 'alta'::public.purchase_priority
      WHEN 'urgente' THEN 'urgente'::public.purchase_priority
    END,
    v_ci.request_type,
    COALESCE(v_ci.generated_description, v_ci.description, v_ci.subject),
    1,
    v_ci.subject,
    v_ci.assigned_to,
    'em_cotacao'::public.purchase_status
  ) RETURNING id INTO v_pr_id;

  UPDATE public.ci_requests
     SET purchase_request_id = v_pr_id,
         status = 'em_cotacao',
         current_stage = 'cotacao',
         updated_at = now()
   WHERE id = p_ci_id;

  RETURN v_pr_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ci_advance_purchase_stage(
  p_ci_id uuid,
  p_to_status public.ci_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ci public.ci_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_ci
  FROM public.ci_requests
  WHERE id = p_ci_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CI não encontrada';
  END IF;
  IF v_ci.assigned_to <> auth.uid()
     AND NOT public._ci_user_can_distribute(p_ci_id) THEN
    RAISE EXCEPTION 'Somente o comprador responsável ou gestores podem avançar esta CI';
  END IF;
  IF v_ci.status <> 'pedido_emitido'::public.ci_status
     OR p_to_status <> 'aguardando_entrega'::public.ci_status THEN
    RAISE EXCEPTION 'Transição operacional não permitida';
  END IF;

  UPDATE public.ci_requests
     SET status = p_to_status,
         current_stage = 'entrega',
         updated_at = now()
   WHERE id = p_ci_id;

  IF v_ci.purchase_request_id IS NOT NULL THEN
    UPDATE public.purchase_requests
       SET status = 'aguardando_entrega'::public.purchase_status,
           responsavel_id = v_ci.assigned_to,
           updated_at = now()
     WHERE id = v_ci.purchase_request_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_ci_buyer_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
      OR NEW.assigned_to_secondary IS DISTINCT FROM OLD.assigned_to_secondary)
     AND auth.uid() IS NOT NULL
     AND NOT public._ci_user_can_distribute(OLD.id) THEN
    RAISE EXCEPTION 'Somente gestores podem distribuir ou transferir CIs';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_ci_buyer_assignment ON public.ci_requests;
CREATE TRIGGER trg_protect_ci_buyer_assignment
BEFORE UPDATE OF assigned_to, assigned_to_secondary ON public.ci_requests
FOR EACH ROW EXECUTE FUNCTION public.protect_ci_buyer_assignment();

GRANT EXECUTE ON FUNCTION public.ci_assign_buyer(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ci_promote_to_purchase(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ci_advance_purchase_stage(uuid, public.ci_status) TO authenticated;

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = 'compras@teste.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.ci_requests
     SET assigned_to = NULL,
         assigned_to_secondary = CASE WHEN assigned_to_secondary = v_user_id THEN NULL ELSE assigned_to_secondary END
   WHERE assigned_to = v_user_id OR assigned_to_secondary = v_user_id;

  UPDATE public.purchase_requests SET responsavel_id = NULL WHERE responsavel_id = v_user_id;
  UPDATE public.cost_centers SET responsavel_id = NULL WHERE responsavel_id = v_user_id;

  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  DELETE FROM public.user_cost_centers WHERE user_id = v_user_id;
  DELETE FROM public.organization_members WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE id = v_user_id;
  DELETE FROM auth.identities WHERE user_id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;
