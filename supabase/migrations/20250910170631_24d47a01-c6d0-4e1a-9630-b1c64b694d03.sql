-- Security fixes: Tighten RLS policies and restrict write access

-- Fix products table policies
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;

-- Only admins and managers can update/delete products
CREATE POLICY "Only admins and managers can update products" 
ON public.products 
FOR UPDATE 
TO authenticated
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'gerente'::text]));

CREATE POLICY "Only admins and managers can delete products" 
ON public.products 
FOR DELETE 
TO authenticated
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'gerente'::text]));

-- Fix movements table policies
DROP POLICY IF EXISTS "Authenticated users can update movements" ON public.movements;

-- Only admins and managers can update movements, no one can delete
CREATE POLICY "Only admins and managers can update movements" 
ON public.movements 
FOR UPDATE 
TO authenticated
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'gerente'::text]));

-- Fix alerts table policies
DROP POLICY IF EXISTS "Authenticated users can view alerts" ON public.alerts;
DROP POLICY IF EXISTS "Authenticated users can insert alerts" ON public.alerts;
DROP POLICY IF EXISTS "Authenticated users can update alerts" ON public.alerts;
DROP POLICY IF EXISTS "Authenticated users can delete alerts" ON public.alerts;

-- Only admins and managers can manage alerts completely
CREATE POLICY "Only admins and managers can view alerts" 
ON public.alerts 
FOR SELECT 
TO authenticated
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'gerente'::text]));

CREATE POLICY "Only admins and managers can insert alerts" 
ON public.alerts 
FOR INSERT 
TO authenticated
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin'::text, 'gerente'::text]));

CREATE POLICY "Only admins and managers can update alerts" 
ON public.alerts 
FOR UPDATE 
TO authenticated
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'gerente'::text]));

CREATE POLICY "Only admins and managers can delete alerts" 
ON public.alerts 
FOR DELETE 
TO authenticated
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'gerente'::text]));

-- Normalize remaining policies to explicitly specify TO authenticated
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;

CREATE POLICY "Authenticated users can view products" 
ON public.products 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert products" 
ON public.products 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Normalize movements policies
DROP POLICY IF EXISTS "Authenticated users can view movements" ON public.movements;
DROP POLICY IF EXISTS "Authenticated users can insert movements" ON public.movements;

CREATE POLICY "Authenticated users can view movements" 
ON public.movements 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert movements" 
ON public.movements 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);