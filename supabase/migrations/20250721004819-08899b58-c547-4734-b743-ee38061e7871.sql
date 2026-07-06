-- Criar função que agenda alertas para soarem novamente após 12 horas se não forem resolvidos
CREATE OR REPLACE FUNCTION schedule_alert_reactivation() 
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um alerta é excluído, criamos um registro de supressão por 12 horas
  INSERT INTO public.alert_suppressions (alert_type, product_id, suppressed_until)
  VALUES (
    OLD.type,
    OLD.product_id,
    NOW() + INTERVAL '12 hours'
  )
  ON CONFLICT (alert_type, product_id) 
  DO UPDATE SET suppressed_until = NOW() + INTERVAL '12 hours';
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para quando alertas são excluídos
DROP TRIGGER IF EXISTS alert_suppression_trigger ON public.alerts;
CREATE TRIGGER alert_suppression_trigger
  BEFORE DELETE ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION schedule_alert_reactivation();

-- Criar função para reativar alertas após o período de supressão
CREATE OR REPLACE FUNCTION reactivate_suppressed_alerts()
RETURNS void AS $$
BEGIN
  -- Excluir suppressões expiradas
  DELETE FROM public.alert_suppressions 
  WHERE suppressed_until < NOW();
  
  -- Aqui poderia adicionar lógica para recriar alertas se as condições ainda existirem
  -- Por exemplo, verificar produtos com estoque baixo novamente
END;
$$ LANGUAGE plpgsql;

-- Adicionar uma constraint única para evitar múltiplas supressões do mesmo tipo/produto
ALTER TABLE public.alert_suppressions 
DROP CONSTRAINT IF EXISTS unique_alert_suppression;

ALTER TABLE public.alert_suppressions 
ADD CONSTRAINT unique_alert_suppression 
UNIQUE (alert_type, product_id);