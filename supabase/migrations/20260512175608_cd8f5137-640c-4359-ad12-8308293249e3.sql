
-- ============================================================
-- FASE 8: Automação, Previsão, Sugestões e Webhooks
-- ============================================================

-- 1) automation_rules
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL CHECK (tipo IN ('reposicao_automatica','aprovacao_automatica','alerta_customizado','escalacao')),
  condicoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  acoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  ultima_execucao timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_automation_rules_org ON public.automation_rules(organization_id, ativo);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view automation rules" ON public.automation_rules
  FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Admins insert automation rules" ON public.automation_rules
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid() AND get_current_user_role() = 'admin');

CREATE POLICY "Admins update automation rules" ON public.automation_rules
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

CREATE POLICY "Admins delete automation rules" ON public.automation_rules
  FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

-- 2) demand_forecasts
CREATE TABLE public.demand_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  product_id uuid NOT NULL,
  periodo date NOT NULL,
  consumo_previsto numeric NOT NULL DEFAULT 0,
  consumo_real numeric,
  confianca numeric NOT NULL DEFAULT 0 CHECK (confianca >= 0 AND confianca <= 100),
  metodo text NOT NULL DEFAULT 'media_movel' CHECK (metodo IN ('media_movel','linear','sazonalidade')),
  gerado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, product_id, periodo)
);
CREATE INDEX idx_forecasts_org_product ON public.demand_forecasts(organization_id, product_id);

ALTER TABLE public.demand_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view forecasts" ON public.demand_forecasts
  FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Staff insert forecasts" ON public.demand_forecasts
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND get_current_user_role() = ANY (ARRAY['admin','gerente']));

CREATE POLICY "Staff update forecasts" ON public.demand_forecasts
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = ANY (ARRAY['admin','gerente']));

CREATE POLICY "Admins delete forecasts" ON public.demand_forecasts
  FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

-- 3) reorder_suggestions
CREATE TABLE public.reorder_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantidade_sugerida numeric NOT NULL CHECK (quantidade_sugerida > 0),
  motivo text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aceita','rejeitada','convertida')),
  request_id uuid,
  decidido_por uuid,
  decidido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reorder_org_status ON public.reorder_suggestions(organization_id, status);

ALTER TABLE public.reorder_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view suggestions" ON public.reorder_suggestions
  FOR SELECT TO authenticated
  USING (is_super_admin() OR organization_id = get_user_organization_id());

CREATE POLICY "Staff insert suggestions" ON public.reorder_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND get_current_user_role() = ANY (ARRAY['admin','gerente']));

CREATE POLICY "Staff update suggestions" ON public.reorder_suggestions
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = ANY (ARRAY['admin','gerente']));

CREATE POLICY "Admins delete suggestions" ON public.reorder_suggestions
  FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

-- 4) integration_webhooks
CREATE TABLE public.integration_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  nome text NOT NULL,
  url text NOT NULL,
  evento text NOT NULL,
  headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret text,
  ativo boolean NOT NULL DEFAULT true,
  ultima_chamada timestamptz,
  ultimo_status integer,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_webhooks_org_event ON public.integration_webhooks(organization_id, evento, ativo);

ALTER TABLE public.integration_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view webhooks" ON public.integration_webhooks
  FOR SELECT TO authenticated
  USING (is_super_admin() OR (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin'));

CREATE POLICY "Admins insert webhooks" ON public.integration_webhooks
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid() AND get_current_user_role() = 'admin');

CREATE POLICY "Admins update webhooks" ON public.integration_webhooks
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

CREATE POLICY "Admins delete webhooks" ON public.integration_webhooks
  FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin');

-- 5) integration_logs
CREATE TABLE public.integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  webhook_id uuid,
  evento text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status_http integer,
  resposta text,
  tentativa integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_logs_org_webhook ON public.integration_logs(organization_id, webhook_id, created_at DESC);

ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view logs" ON public.integration_logs
  FOR SELECT TO authenticated
  USING (is_super_admin() OR (organization_id = get_user_organization_id() AND get_current_user_role() = 'admin'));

-- 6) Funções

CREATE OR REPLACE FUNCTION public.calculate_demand_forecast(_org uuid, _product_id uuid)
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  media numeric;
BEGIN
  SELECT COALESCE(AVG(monthly_total), 0) INTO media
  FROM (
    SELECT date_trunc('month', created_at) AS mes, SUM(quantity) AS monthly_total
    FROM movements
    WHERE organization_id = _org
      AND product_id = _product_id
      AND type = 'saida'
      AND created_at >= now() - interval '6 months'
    GROUP BY 1
  ) sub;

  INSERT INTO demand_forecasts (organization_id, product_id, periodo, consumo_previsto, confianca, metodo)
  VALUES (_org, _product_id, date_trunc('month', now() + interval '1 month')::date, media, 70, 'media_movel')
  ON CONFLICT (organization_id, product_id, periodo)
  DO UPDATE SET consumo_previsto = EXCLUDED.consumo_previsto, gerado_em = now();

  RETURN media;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_reorder_suggestions(_org uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  rec record;
  count_inserted integer := 0;
  consumo_medio numeric;
  qtd_sugerida numeric;
BEGIN
  FOR rec IN
    SELECT id, name, current_stock, min_stock, max_stock
    FROM products
    WHERE organization_id = _org AND current_stock <= min_stock
  LOOP
    SELECT COALESCE(consumo_previsto, 0) INTO consumo_medio
    FROM demand_forecasts
    WHERE organization_id = _org AND product_id = rec.id
    ORDER BY periodo DESC LIMIT 1;

    qtd_sugerida := GREATEST(rec.max_stock - rec.current_stock, consumo_medio, rec.min_stock);
    IF qtd_sugerida <= 0 THEN qtd_sugerida := rec.min_stock; END IF;

    IF NOT EXISTS (
      SELECT 1 FROM reorder_suggestions
      WHERE organization_id = _org AND product_id = rec.id AND status = 'pendente'
    ) THEN
      INSERT INTO reorder_suggestions (organization_id, product_id, quantidade_sugerida, motivo)
      VALUES (_org, rec.id, qtd_sugerida,
        format('Estoque atual %s ≤ mínimo %s. Consumo médio mensal: %s', rec.current_stock, rec.min_stock, ROUND(consumo_medio,2)));
      count_inserted := count_inserted + 1;
    END IF;
  END LOOP;

  RETURN count_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_webhook_event(_org uuid, _evento text, _payload jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  wh record;
BEGIN
  FOR wh IN
    SELECT id FROM integration_webhooks
    WHERE organization_id = _org AND evento = _evento AND ativo = true
  LOOP
    INSERT INTO integration_logs (organization_id, webhook_id, evento, payload, tentativa)
    VALUES (_org, wh.id, _evento, _payload, 1);
  END LOOP;
END;
$$;

-- 7) Triggers de eventos
CREATE OR REPLACE FUNCTION public.trg_dispatch_order_emitted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM dispatch_webhook_event(NEW.organization_id, 'pedido.emitido',
    jsonb_build_object('order_id', NEW.id, 'numero', NEW.numero, 'valor_total', NEW.valor_total, 'supplier_id', NEW.supplier_id));
  RETURN NEW;
END;
$$;

CREATE TRIGGER dispatch_order_emitted
  AFTER INSERT ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_dispatch_order_emitted();

CREATE OR REPLACE FUNCTION public.trg_dispatch_receipt_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM dispatch_webhook_event(NEW.organization_id, 'recebimento.confirmado',
    jsonb_build_object('receipt_id', NEW.id, 'order_id', NEW.order_id, 'quantidade_recebida', NEW.quantidade_recebida, 'divergencia', NEW.divergencia));
  RETURN NEW;
END;
$$;

CREATE TRIGGER dispatch_receipt_confirmed
  AFTER INSERT ON public.purchase_receipts
  FOR EACH ROW EXECUTE FUNCTION public.trg_dispatch_receipt_confirmed();

CREATE OR REPLACE FUNCTION public.trg_dispatch_payment_registered()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM dispatch_webhook_event(NEW.organization_id, 'pagamento.registrado',
    jsonb_build_object('payment_id', NEW.id, 'account_payable_id', NEW.account_payable_id, 'valor', NEW.valor, 'forma_pagamento', NEW.forma_pagamento));
  RETURN NEW;
END;
$$;

CREATE TRIGGER dispatch_payment_registered
  AFTER INSERT ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_dispatch_payment_registered();

-- 8) Triggers de updated_at
CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integration_webhooks_updated_at
  BEFORE UPDATE ON public.integration_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
