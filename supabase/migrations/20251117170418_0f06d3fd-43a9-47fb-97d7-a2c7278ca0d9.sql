-- Add foreign key constraints with ON DELETE CASCADE to allow product deletion

-- First, ensure movements.product_id has the proper foreign key with CASCADE
ALTER TABLE public.movements
DROP CONSTRAINT IF EXISTS fk_movements_product_id;

ALTER TABLE public.movements
ADD CONSTRAINT fk_movements_product_id 
FOREIGN KEY (product_id) 
REFERENCES public.products(id) 
ON DELETE CASCADE;

-- Also ensure alerts.product_id has proper CASCADE behavior
ALTER TABLE public.alerts
DROP CONSTRAINT IF EXISTS fk_alerts_product_id;

ALTER TABLE public.alerts
ADD CONSTRAINT fk_alerts_product_id 
FOREIGN KEY (product_id) 
REFERENCES public.products(id) 
ON DELETE CASCADE;

-- Ensure alert_suppressions.product_id has proper CASCADE behavior
ALTER TABLE public.alert_suppressions
DROP CONSTRAINT IF EXISTS fk_alert_suppressions_product_id;

ALTER TABLE public.alert_suppressions
ADD CONSTRAINT fk_alert_suppressions_product_id 
FOREIGN KEY (product_id) 
REFERENCES public.products(id) 
ON DELETE CASCADE;