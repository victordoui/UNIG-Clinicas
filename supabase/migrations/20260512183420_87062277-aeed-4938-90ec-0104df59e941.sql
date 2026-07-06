
-- ============ LABEL TEMPLATES ============
CREATE TABLE public.label_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  nome text NOT NULL,
  largura_mm numeric NOT NULL DEFAULT 50,
  altura_mm numeric NOT NULL DEFAULT 30,
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  padrao boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_label_templates_org ON public.label_templates(organization_id);
ALTER TABLE public.label_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "label_templates_select" ON public.label_templates
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "label_templates_insert" ON public.label_templates
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente') AND created_by = auth.uid());
CREATE POLICY "label_templates_update" ON public.label_templates
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY "label_templates_delete" ON public.label_templates
  FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

CREATE TRIGGER trg_label_templates_updated BEFORE UPDATE ON public.label_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ INVENTORY SESSIONS ============
CREATE TABLE public.inventory_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'ciclico' CHECK (tipo IN ('total','ciclico','amostragem')),
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','em_contagem','fechada')),
  escopo jsonb NOT NULL DEFAULT '{}'::jsonb,
  iniciada_em timestamptz,
  fechada_em timestamptz,
  fechada_por uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inventory_sessions_org ON public.inventory_sessions(organization_id);
ALTER TABLE public.inventory_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_sessions_select" ON public.inventory_sessions
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "inventory_sessions_insert" ON public.inventory_sessions
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente') AND created_by = auth.uid());
CREATE POLICY "inventory_sessions_update" ON public.inventory_sessions
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));
CREATE POLICY "inventory_sessions_delete" ON public.inventory_sessions
  FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

CREATE TRIGGER trg_inventory_sessions_updated BEFORE UPDATE ON public.inventory_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ INVENTORY COUNTS ============
CREATE TABLE public.inventory_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.inventory_sessions(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  product_id uuid NOT NULL,
  contado numeric NOT NULL DEFAULT 0,
  sistema numeric NOT NULL DEFAULT 0,
  divergencia numeric GENERATED ALWAYS AS (contado - sistema) STORED,
  observacao text,
  contado_por uuid NOT NULL,
  contado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inventory_counts_session ON public.inventory_counts(session_id);
CREATE INDEX idx_inventory_counts_product ON public.inventory_counts(product_id);
ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_counts_select" ON public.inventory_counts
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "inventory_counts_insert" ON public.inventory_counts
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND contado_por = auth.uid());
CREATE POLICY "inventory_counts_update" ON public.inventory_counts
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "inventory_counts_delete" ON public.inventory_counts
  FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() IN ('admin','gerente'));

CREATE TRIGGER trg_inventory_counts_updated BEFORE UPDATE ON public.inventory_counts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ DELIVERY SIGNATURES ============
CREATE TABLE public.delivery_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  entidade_tipo text NOT NULL CHECK (entidade_tipo IN ('purchase_receipt','stock_movement')),
  entidade_id uuid NOT NULL,
  assinante_nome text NOT NULL,
  assinante_doc text,
  assinatura_data text NOT NULL,
  capturado_por uuid NOT NULL,
  capturado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_delivery_signatures_entity ON public.delivery_signatures(entidade_tipo, entidade_id);
ALTER TABLE public.delivery_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_signatures_select" ON public.delivery_signatures
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "delivery_signatures_insert" ON public.delivery_signatures
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND capturado_por = auth.uid());
CREATE POLICY "delivery_signatures_delete" ON public.delivery_signatures
  FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

-- ============ OFFLINE SYNC QUEUE ============
CREATE TABLE public.offline_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  client_op_id text NOT NULL,
  tipo text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'processado' CHECK (status IN ('processado','erro')),
  erro text,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, client_op_id)
);
CREATE INDEX idx_offline_sync_org_user ON public.offline_sync_queue(organization_id, user_id);
ALTER TABLE public.offline_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offline_sync_select" ON public.offline_sync_queue
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "offline_sync_insert" ON public.offline_sync_queue
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND user_id = auth.uid());

-- ============ FUNCTION: close_inventory_session ============
CREATE OR REPLACE FUNCTION public.close_inventory_session(_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.inventory_sessions%ROWTYPE;
  v_role text;
  v_count int := 0;
  rec RECORD;
  v_prev numeric;
  v_new numeric;
BEGIN
  SELECT * INTO v_session FROM public.inventory_sessions WHERE id = _session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF v_session.organization_id <> get_user_organization_id() THEN RAISE EXCEPTION 'Forbidden'; END IF;

  v_role := get_current_user_role();
  IF v_role NOT IN ('admin','gerente') THEN RAISE EXCEPTION 'Not allowed'; END IF;

  IF v_session.status = 'fechada' THEN RAISE EXCEPTION 'Session already closed'; END IF;

  FOR rec IN
    SELECT ic.product_id, ic.contado, ic.sistema, ic.divergencia
    FROM public.inventory_counts ic
    WHERE ic.session_id = _session_id AND ic.divergencia <> 0
  LOOP
    SELECT current_stock INTO v_prev FROM public.products WHERE id = rec.product_id;
    v_new := COALESCE(v_prev,0) + rec.divergencia;

    INSERT INTO public.movements (
      organization_id, product_id, type, quantity,
      previous_stock, new_stock, reason, created_by
    ) VALUES (
      v_session.organization_id, rec.product_id,
      CASE WHEN rec.divergencia > 0 THEN 'entrada' ELSE 'saida' END,
      ABS(rec.divergencia),
      COALESCE(v_prev,0), v_new,
      'Ajuste de inventário (sessão ' || v_session.nome || ')',
      auth.uid()
    );

    UPDATE public.products SET current_stock = v_new, updated_at = now()
      WHERE id = rec.product_id;

    v_count := v_count + 1;
  END LOOP;

  UPDATE public.inventory_sessions
    SET status = 'fechada', fechada_em = now(), fechada_por = auth.uid(), updated_at = now()
    WHERE id = _session_id;

  RETURN jsonb_build_object('success', true, 'ajustes', v_count);
END $$;
