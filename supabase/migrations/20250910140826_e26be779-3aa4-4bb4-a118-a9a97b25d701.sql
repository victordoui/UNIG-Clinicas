-- Add new columns to products table
ALTER TABLE public.products 
ADD COLUMN max_stock integer DEFAULT 0,
ADD COLUMN qr_code text,
ADD COLUMN supplier text;