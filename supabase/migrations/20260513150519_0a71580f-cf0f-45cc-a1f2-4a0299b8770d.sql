-- =========================================================
-- UNIG Ops — Módulo Requisição de Compra (CI)
-- =========================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.ci_status AS ENUM (
    'recebida','em_analise','aguardando_aprovacao','aprovada',
    'em_cotacao','pedido_emitido','aguardando_entrega','recebida_estoque',
    'finalizada','cancelada','reprovada'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ci_priority AS ENUM ('baixa','media','alta','urgente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ci_channel AS ENUM ('chatbot','formulario','interno');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sequence (annual prefix is built in trigger)
CREATE SEQUENCE IF NOT EXISTS public.ci_protocol_seq START 1;

-- =========================================================
-- ci_requests
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ci_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  protocol text UNIQUE NOT NULL DEFAULT '',
  channel public.ci_channel NOT NULL DEFAULT 'interno',
  -- requester (snapshot, may be public)
  requester_name text NOT NULL,
  requester_registration text,
  requester_role text,
  requester_sector text,
  requester_whatsapp text,
  requester_email text,
  -- routing
  source_sector text,
  destination_sector text,
  request_type text,
  subject text NOT NULL,
  description text,
  generated_description text,
  priority public.ci_priority NOT NULL DEFAULT 'media',
  status public.ci_status NOT NULL DEFAULT 'recebida',
  -- stock
  stock_checked boolean NOT NULL DEFAULT false,
  stock_available boolean,
  stock_qty numeric,
  -- linkage
  purchase_request_id uuid REFERENCES public.purchase_requests(id) ON DELETE SET NULL,
  lookup_token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ci_requests_org ON public.ci_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_ci_requests_status ON public.ci_requests(status);
CREATE INDEX IF NOT EXISTS idx_ci_requests_created_by ON public.ci_requests(created_by);

-- protocol generator
CREATE OR REPLACE FUNCTION public.set_ci_protocol()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.protocol IS NULL OR NEW.protocol = '' THEN
    NEW.protocol := 'CI-' || to_char(now(),'YYYY') || '-' ||
      lpad(nextval('public.ci_protocol_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_ci_protocol ON public.ci_requests;
CREATE TRIGGER trg_set_ci_protocol BEFORE INSERT ON public.ci_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_ci_protocol();

DROP TRIGGER IF EXISTS trg_ci_requests_updated ON public.ci_requests;
CREATE TRIGGER trg_ci_requests_updated BEFORE UPDATE ON public.ci_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- ci_attachments
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ci_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ci_id uuid NOT NULL REFERENCES public.ci_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ci_att_ci ON public.ci_attachments(ci_id);

-- =========================================================
-- ci_comments
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ci_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ci_id uuid NOT NULL REFERENCES public.ci_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  author_id uuid,
  author_name text,
  content text NOT NULL,
  mentioned uuid[],
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ci_comments_ci ON public.ci_comments(ci_id);

-- =========================================================
-- ci_approvals
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ci_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ci_id uuid NOT NULL REFERENCES public.ci_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  ordem int NOT NULL,
  papel text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  approver_id uuid,
  comentario text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ci_approvals_ci ON public.ci_approvals(ci_id);

-- =========================================================
-- ci_status_history
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ci_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ci_id uuid NOT NULL REFERENCES public.ci_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  actor_id uuid,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ci_hist_ci ON public.ci_status_history(ci_id);

-- log status changes
CREATE OR REPLACE FUNCTION public.log_ci_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ci_status_history(ci_id, organization_id, actor_id, event_type, to_status)
    VALUES (NEW.id, NEW.organization_id, NEW.created_by, 'criada', NEW.status::text);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.ci_status_history(ci_id, organization_id, actor_id, event_type, from_status, to_status)
    VALUES (NEW.id, NEW.organization_id, auth.uid(), 'status_alterado', OLD.status::text, NEW.status::text);
    RETURN NEW;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ci_log_status ON public.ci_requests;
CREATE TRIGGER trg_ci_log_status AFTER INSERT OR UPDATE ON public.ci_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_ci_status_change();

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.ci_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_status_history ENABLE ROW LEVEL SECURITY;

-- ci_requests
DROP POLICY IF EXISTS ci_req_select ON public.ci_requests;
CREATE POLICY ci_req_select ON public.ci_requests FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id() OR public.is_super_admin());

DROP POLICY IF EXISTS ci_req_insert ON public.ci_requests;
CREATE POLICY ci_req_insert ON public.ci_requests FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS ci_req_update ON public.ci_requests;
CREATE POLICY ci_req_update ON public.ci_requests FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id() OR public.is_super_admin());

-- ci_attachments
DROP POLICY IF EXISTS ci_att_select ON public.ci_attachments;
CREATE POLICY ci_att_select ON public.ci_attachments FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id() OR public.is_super_admin());
DROP POLICY IF EXISTS ci_att_insert ON public.ci_attachments;
CREATE POLICY ci_att_insert ON public.ci_attachments FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());
DROP POLICY IF EXISTS ci_att_delete ON public.ci_attachments;
CREATE POLICY ci_att_delete ON public.ci_attachments FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id());

-- ci_comments
DROP POLICY IF EXISTS ci_com_select ON public.ci_comments;
CREATE POLICY ci_com_select ON public.ci_comments FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id() OR public.is_super_admin());
DROP POLICY IF EXISTS ci_com_insert ON public.ci_comments;
CREATE POLICY ci_com_insert ON public.ci_comments FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id() AND author_id = auth.uid());

-- ci_approvals
DROP POLICY IF EXISTS ci_apv_select ON public.ci_approvals;
CREATE POLICY ci_apv_select ON public.ci_approvals FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id() OR public.is_super_admin());
DROP POLICY IF EXISTS ci_apv_update ON public.ci_approvals;
CREATE POLICY ci_apv_update ON public.ci_approvals FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id());

-- ci_status_history
DROP POLICY IF EXISTS ci_hist_select ON public.ci_status_history;
CREATE POLICY ci_hist_select ON public.ci_status_history FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id() OR public.is_super_admin());

-- =========================================================
-- RPCs
-- =========================================================

-- Lookup público por protocolo + matrícula (verificação leve)
CREATE OR REPLACE FUNCTION public.ci_lookup(p_protocol text, p_registration text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ci public.ci_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_ci FROM public.ci_requests WHERE protocol = p_protocol;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
  IF p_registration IS NOT NULL AND v_ci.requester_registration IS NOT NULL
     AND v_ci.requester_registration <> p_registration THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  RETURN jsonb_build_object(
    'found', true,
    'protocol', v_ci.protocol,
    'subject', v_ci.subject,
    'status', v_ci.status,
    'priority', v_ci.priority,
    'created_at', v_ci.created_at,
    'updated_at', v_ci.updated_at,
    'destination_sector', v_ci.destination_sector,
    'history', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'event', event_type, 'from', from_status, 'to', to_status, 'at', created_at
      ) ORDER BY created_at), '[]'::jsonb)
      FROM public.ci_status_history WHERE ci_id = v_ci.id
    )
  );
END $$;

GRANT EXECUTE ON FUNCTION public.ci_lookup(text, text) TO anon, authenticated;

-- Submissão pública/interna (security definer)
CREATE OR REPLACE FUNCTION public.submit_ci(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_id uuid;
  v_protocol text;
  v_priority public.ci_priority;
  v_desc text;
BEGIN
  -- determinar organização
  v_org := COALESCE(
    (payload->>'organization_id')::uuid,
    public.get_user_organization_id(),
    (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
  );
  IF v_org IS NULL THEN RAISE EXCEPTION 'No organization configured'; END IF;

  v_priority := COALESCE((payload->>'priority')::public.ci_priority, 'media');
  v_desc := COALESCE(payload->>'description','');

  -- sugestão automática de prioridade
  IF v_priority = 'media' AND (
    v_desc ~* '\m(mec|visita|urgência|urgencia|auditoria)\M'
    OR COALESCE(payload->>'subject','') ~* '\m(mec|visita|urgência|urgencia|auditoria)\M'
  ) THEN
    v_priority := 'alta';
  END IF;

  INSERT INTO public.ci_requests (
    organization_id, channel,
    requester_name, requester_registration, requester_role, requester_sector, requester_whatsapp, requester_email,
    source_sector, destination_sector, request_type,
    subject, description, generated_description, priority,
    created_by
  ) VALUES (
    v_org,
    COALESCE((payload->>'channel')::public.ci_channel, 'formulario'),
    payload->>'requester_name',
    payload->>'requester_registration',
    payload->>'requester_role',
    payload->>'requester_sector',
    payload->>'requester_whatsapp',
    payload->>'requester_email',
    payload->>'source_sector',
    payload->>'destination_sector',
    payload->>'request_type',
    payload->>'subject',
    v_desc,
    payload->>'generated_description',
    v_priority,
    NULLIF(payload->>'created_by','')::uuid
  ) RETURNING id, protocol INTO v_id, v_protocol;

  RETURN jsonb_build_object('id', v_id, 'protocol', v_protocol);
END $$;

GRANT EXECUTE ON FUNCTION public.submit_ci(jsonb) TO anon, authenticated;

-- Verificação rápida de estoque por nome/sku
CREATE OR REPLACE FUNCTION public.ci_check_stock(p_term text)
RETURNS TABLE(id uuid, name text, sku text, current_stock int, min_stock int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, sku, current_stock, min_stock
  FROM public.products
  WHERE organization_id = public.get_user_organization_id()
    AND (name ILIKE '%'||p_term||'%' OR sku ILIKE '%'||p_term||'%')
  ORDER BY current_stock DESC
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.ci_check_stock(text) TO authenticated;

-- Promove CI aprovada em purchase_request
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
  IF NOT FOUND THEN RAISE EXCEPTION 'CI not found'; END IF;
  IF v_ci.organization_id <> public.get_user_organization_id()
     AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF v_ci.purchase_request_id IS NOT NULL THEN
    RETURN v_ci.purchase_request_id;
  END IF;

  INSERT INTO public.purchase_requests(
    organization_id, solicitante_id, setor, prioridade,
    categoria, item_descricao, quantidade, justificativa, status
  ) VALUES (
    v_ci.organization_id, COALESCE(v_ci.created_by, auth.uid()),
    v_ci.requester_sector,
    CASE v_ci.priority
      WHEN 'baixa' THEN 'baixa'::purchase_priority
      WHEN 'media' THEN 'media'::purchase_priority
      WHEN 'alta' THEN 'alta'::purchase_priority
      WHEN 'urgente' THEN 'urgente'::purchase_priority
    END,
    v_ci.request_type,
    COALESCE(v_ci.generated_description, v_ci.description, v_ci.subject),
    1,
    v_ci.subject,
    'nova'::purchase_status
  ) RETURNING id INTO v_pr_id;

  UPDATE public.ci_requests
    SET purchase_request_id = v_pr_id,
        status = 'em_cotacao',
        updated_at = now()
    WHERE id = p_ci_id;

  RETURN v_pr_id;
END $$;

GRANT EXECUTE ON FUNCTION public.ci_promote_to_purchase(uuid) TO authenticated;

-- =========================================================
-- Storage bucket for attachments
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('ci-attachments','ci-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS ci_att_read ON storage.objects;
CREATE POLICY ci_att_read ON storage.objects FOR SELECT
  USING (bucket_id = 'ci-attachments');

DROP POLICY IF EXISTS ci_att_write ON storage.objects;
CREATE POLICY ci_att_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ci-attachments');
