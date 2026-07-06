-- CRITICAL SECURITY FIX: Restrict public access to sensitive business data
-- Fix for exposed inventory and business operations data

-- 1. SECURE PRODUCTS TABLE - Restrict to authenticated users only
DROP POLICY IF EXISTS "Users can view all products" ON public.products;
DROP POLICY IF EXISTS "Users can insert products" ON public.products;
DROP POLICY IF EXISTS "Users can update products" ON public.products;
DROP POLICY IF EXISTS "Users can delete products" ON public.products;

-- Products: Only authenticated users can access
CREATE POLICY "Authenticated users can view products" 
ON public.products 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert products" 
ON public.products 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Authenticated users can update products" 
ON public.products 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete products" 
ON public.products 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- 2. SECURE MOVEMENTS TABLE - Restrict to authenticated users only
DROP POLICY IF EXISTS "Users can view all movements" ON public.movements;
DROP POLICY IF EXISTS "Users can insert movements" ON public.movements;
DROP POLICY IF EXISTS "Users can update movements" ON public.movements;

-- Movements: Only authenticated users can access
CREATE POLICY "Authenticated users can view movements" 
ON public.movements 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert movements" 
ON public.movements 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Authenticated users can update movements" 
ON public.movements 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- 3. SECURE ALERTS TABLE - Restrict to authenticated users only
DROP POLICY IF EXISTS "Users can view all alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can insert alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can update alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can delete alerts" ON public.alerts;

-- Alerts: Only authenticated users can access
CREATE POLICY "Authenticated users can view alerts" 
ON public.alerts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert alerts" 
ON public.alerts 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update alerts" 
ON public.alerts 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete alerts" 
ON public.alerts 
FOR DELETE 
USING (auth.uid() IS NOT NULL);