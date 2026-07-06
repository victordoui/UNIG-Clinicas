-- Modify movements table structure
-- Add new columns
ALTER TABLE public.movements 
ADD COLUMN unit_price numeric,
ADD COLUMN total_value numeric,
ADD COLUMN reason text,
ADD COLUMN supplier text;

-- Remove updated_at column since it's not in the new structure
ALTER TABLE public.movements 
DROP COLUMN IF EXISTS updated_at;