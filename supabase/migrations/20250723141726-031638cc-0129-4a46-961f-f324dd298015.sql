-- Fix remaining security warnings for database functions

-- Update functions to ensure proper search path settings
CREATE OR REPLACE FUNCTION public.schedule_alert_reactivation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.reactivate_suppressed_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Excluir suppressões expiradas
  DELETE FROM public.alert_suppressions 
  WHERE suppressed_until < NOW();
  
  -- Aqui poderia adicionar lógica para recriar alertas se as condições ainda existirem
  -- Por exemplo, verificar produtos com estoque baixo novamente
END;
$$;