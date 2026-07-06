-- Modificar trigger log_product_action para não logar exclusões em cascata
CREATE OR REPLACE FUNCTION public.log_product_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      details,
      organization_id
    ) VALUES (
      NEW.created_by,
      'product_created',
      jsonb_build_object(
        'product_id', NEW.id,
        'product_name', NEW.name,
        'sku', NEW.sku,
        'category', NEW.category
      ),
      NEW.organization_id
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      details,
      organization_id
    ) VALUES (
      auth.uid(),
      'product_updated',
      jsonb_build_object(
        'product_id', NEW.id,
        'product_name', NEW.name,
        'changes', jsonb_build_object(
          'old_stock', OLD.current_stock,
          'new_stock', NEW.current_stock
        )
      ),
      NEW.organization_id
    );
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    -- Não logar se for exclusão em cascata
    IF pg_trigger_depth() = 1 THEN
      INSERT INTO public.security_audit_log (
        user_id,
        action,
        details,
        organization_id
      ) VALUES (
        auth.uid(),
        'product_deleted',
        jsonb_build_object(
          'product_id', OLD.id,
          'product_name', OLD.name,
          'sku', OLD.sku
        ),
        OLD.organization_id
      );
    END IF;
    RETURN OLD;
  END IF;
END;
$function$;

-- Modificar trigger log_user_membership_action para não logar exclusões em cascata
CREATE OR REPLACE FUNCTION public.log_user_membership_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      details,
      organization_id
    ) VALUES (
      NEW.invited_by,
      'user_invited',
      jsonb_build_object(
        'new_user_id', NEW.user_id,
        'role', NEW.role
      ),
      NEW.organization_id
    );
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    -- Não logar se for exclusão em cascata
    IF pg_trigger_depth() = 1 THEN
      INSERT INTO public.security_audit_log (
        user_id,
        action,
        details,
        organization_id
      ) VALUES (
        auth.uid(),
        'user_removed',
        jsonb_build_object(
          'removed_user_id', OLD.user_id,
          'role', OLD.role
        ),
        OLD.organization_id
      );
    END IF;
    RETURN OLD;
  END IF;
END;
$function$;