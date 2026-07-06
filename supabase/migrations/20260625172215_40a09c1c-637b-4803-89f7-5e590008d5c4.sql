CREATE OR REPLACE FUNCTION public.od_validate_and_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'concluida' AND (NEW.resumo_final IS NULL OR length(trim(NEW.resumo_final)) = 0) THEN
    RAISE EXCEPTION 'Para concluir uma demanda é necessário informar o resumo final.';
  END IF;
  IF NEW.status = 'cancelada' AND (NEW.justificativa_cancelamento IS NULL OR length(trim(NEW.justificativa_cancelamento)) = 0) THEN
    RAISE EXCEPTION 'Para cancelar uma demanda é necessário informar a justificativa.';
  END IF;
  IF NEW.status = 'pausada' AND (NEW.motivo_pausa IS NULL OR length(trim(NEW.motivo_pausa)) = 0) THEN
    RAISE EXCEPTION 'Para pausar uma demanda é necessário informar o motivo.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status <> OLD.status AND NEW.status = 'concluida' AND NEW.concluida_em IS NULL THEN
      NEW.concluida_em := now();
    END IF;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_od_validate_status_before ON public.operational_demands;
CREATE TRIGGER trg_od_validate_status_before
BEFORE INSERT OR UPDATE ON public.operational_demands
FOR EACH ROW EXECUTE FUNCTION public.od_validate_and_log();

CREATE OR REPLACE FUNCTION public.od_log_after()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.operational_demand_activity_log(demand_id, organization_id, evento, payload, autor)
    VALUES (NEW.id, NEW.organization_id, 'created',
            jsonb_build_object('status', NEW.status), auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status <> OLD.status THEN
      INSERT INTO public.operational_demand_activity_log(demand_id, organization_id, evento, payload, autor)
      VALUES (NEW.id, NEW.organization_id, 'status_changed',
              jsonb_build_object('from', OLD.status, 'to', NEW.status), auth.uid());
    END IF;
    IF COALESCE(NEW.prazo_estimado::text,'') <> COALESCE(OLD.prazo_estimado::text,'') THEN
      INSERT INTO public.operational_demand_activity_log(demand_id, organization_id, evento, payload, autor)
      VALUES (NEW.id, NEW.organization_id, 'prazo_changed',
              jsonb_build_object('from', OLD.prazo_estimado, 'to', NEW.prazo_estimado), auth.uid());
    END IF;
    IF NEW.gestor_responsavel <> OLD.gestor_responsavel THEN
      INSERT INTO public.operational_demand_activity_log(demand_id, organization_id, evento, payload, autor)
      VALUES (NEW.id, NEW.organization_id, 'gestor_changed',
              jsonb_build_object('from', OLD.gestor_responsavel, 'to', NEW.gestor_responsavel), auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_od_log_after ON public.operational_demands;
CREATE TRIGGER trg_od_log_after
AFTER INSERT OR UPDATE ON public.operational_demands
FOR EACH ROW EXECUTE FUNCTION public.od_log_after();