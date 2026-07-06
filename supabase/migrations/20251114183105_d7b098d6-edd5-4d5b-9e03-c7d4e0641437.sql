-- Create index for better performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_security_audit_log_organization_id 
ON public.security_audit_log(organization_id);

-- Create function to automatically log product actions
CREATE OR REPLACE FUNCTION public.log_product_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    RETURN OLD;
  END IF;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_log_product_action ON public.products;
CREATE TRIGGER trigger_log_product_action
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.log_product_action();

-- Create function to automatically log movement actions
CREATE OR REPLACE FUNCTION public.log_movement_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    details,
    organization_id
  ) VALUES (
    NEW.created_by,
    'movement_created',
    jsonb_build_object(
      'movement_id', NEW.id,
      'type', NEW.type,
      'product_id', NEW.product_id,
      'quantity', NEW.quantity,
      'previous_stock', NEW.previous_stock,
      'new_stock', NEW.new_stock
    ),
    NEW.organization_id
  );
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_log_movement_action ON public.movements;
CREATE TRIGGER trigger_log_movement_action
AFTER INSERT ON public.movements
FOR EACH ROW
EXECUTE FUNCTION public.log_movement_action();

-- Create function to automatically log user actions
CREATE OR REPLACE FUNCTION public.log_user_membership_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    RETURN OLD;
  END IF;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_log_user_membership_action ON public.organization_members;
CREATE TRIGGER trigger_log_user_membership_action
AFTER INSERT OR DELETE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.log_user_membership_action();