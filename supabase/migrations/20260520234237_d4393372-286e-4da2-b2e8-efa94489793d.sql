
-- Tile preferences per user (for Fiori Launchpad personalization)
CREATE TABLE public.user_tile_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tile_key text NOT NULL,
  group_key text NOT NULL DEFAULT 'main',
  position integer NOT NULL DEFAULT 0,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tile_key)
);

ALTER TABLE public.user_tile_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tile prefs select"
  ON public.user_tile_preferences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own tile prefs insert"
  ON public.user_tile_preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own tile prefs update"
  ON public.user_tile_preferences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own tile prefs delete"
  ON public.user_tile_preferences FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_tile_prefs_updated_at
  BEFORE UPDATE ON public.user_tile_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Aggregated KPI counts for current authenticated user (Launchpad tiles)
-- Returns a JSON object with all metrics; the Edge Function decides which to expose per role.
CREATE OR REPLACE FUNCTION public.get_launchpad_metrics(_org uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  result jsonb := '{}'::jsonb;
  v_pending_approvals int := 0;
  v_my_requests int := 0;
  v_my_pending_ci int := 0;
  v_open_quotations int := 0;
  v_orders_in_progress int := 0;
  v_orders_late int := 0;
  v_receipts_today int := 0;
  v_active_alerts int := 0;
  v_council_pending int := 0;
  v_supplier_quotes int := 0;
  v_supplier_orders int := 0;
  v_movements_today int := 0;
  v_active_suppliers int := 0;
  v_total_value_pending numeric := 0;
BEGIN
  IF uid IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Approvals pending for me
  SELECT COUNT(*) INTO v_pending_approvals
  FROM approval_request_steps ars
  JOIN approval_requests ar ON ar.id = ars.request_id
  WHERE ar.status = 'pending'
    AND ars.status = 'pending'
    AND public.user_can_decide_step(uid, ars.id);

  -- My requests (CI)
  SELECT COUNT(*) INTO v_my_requests
  FROM ci_requests WHERE created_by = uid;

  SELECT COUNT(*) INTO v_my_pending_ci
  FROM ci_requests WHERE created_by = uid AND status IN ('rascunho','aguardando_aprovacao','em_cotacao');

  -- Open quotations
  SELECT COUNT(*) INTO v_open_quotations
  FROM purchase_quotes WHERE status IN ('aberto','em_andamento','aguardando_resposta');

  -- Orders in progress / late
  SELECT COUNT(*) INTO v_orders_in_progress
  FROM purchase_orders WHERE status IN ('emitido','aprovado','em_transito','parcialmente_recebido');

  SELECT COUNT(*) INTO v_orders_late
  FROM purchase_orders
  WHERE status NOT IN ('recebido','cancelado','finalizado')
    AND expected_delivery_date IS NOT NULL
    AND expected_delivery_date < CURRENT_DATE;

  -- Receipts today
  SELECT COUNT(*) INTO v_receipts_today
  FROM purchase_receipts WHERE created_at::date = CURRENT_DATE;

  -- Movements today
  SELECT COUNT(*) INTO v_movements_today
  FROM movements WHERE created_at::date = CURRENT_DATE;

  -- Active alerts
  SELECT COUNT(*) INTO v_active_alerts
  FROM alerts WHERE resolved_at IS NULL;

  -- Active suppliers
  SELECT COUNT(*) INTO v_active_suppliers
  FROM suppliers WHERE COALESCE(is_active, true) = true;

  -- Total value pending approval
  SELECT COALESCE(SUM(total_amount),0) INTO v_total_value_pending
  FROM purchase_requests WHERE status = 'aguardando_aprovacao';

  -- Council pending votes for me
  SELECT COUNT(*) INTO v_council_pending
  FROM council_proposals cp
  WHERE cp.status = 'em_votacao'
    AND EXISTS (SELECT 1 FROM council_members cm WHERE cm.user_id = uid AND cm.ativo = true)
    AND NOT EXISTS (
      SELECT 1 FROM council_votes cv
      WHERE cv.proposal_id = cp.id AND cv.user_id = uid
    );

  -- Supplier scope
  SELECT COUNT(*) INTO v_supplier_quotes
  FROM purchase_quotes pq
  WHERE pq.supplier_id IN (SELECT supplier_id FROM supplier_users WHERE user_id = uid AND is_active = true)
    AND pq.status IN ('aberto','aguardando_resposta');

  SELECT COUNT(*) INTO v_supplier_orders
  FROM purchase_orders po
  WHERE po.supplier_id IN (SELECT supplier_id FROM supplier_users WHERE user_id = uid AND is_active = true)
    AND po.status NOT IN ('cancelado','finalizado','recebido');

  result := jsonb_build_object(
    'pending_approvals', v_pending_approvals,
    'my_requests', v_my_requests,
    'my_pending_ci', v_my_pending_ci,
    'open_quotations', v_open_quotations,
    'orders_in_progress', v_orders_in_progress,
    'orders_late', v_orders_late,
    'receipts_today', v_receipts_today,
    'movements_today', v_movements_today,
    'active_alerts', v_active_alerts,
    'active_suppliers', v_active_suppliers,
    'total_value_pending', v_total_value_pending,
    'council_pending', v_council_pending,
    'supplier_quotes', v_supplier_quotes,
    'supplier_orders', v_supplier_orders
  );

  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_launchpad_metrics(uuid) TO authenticated;
