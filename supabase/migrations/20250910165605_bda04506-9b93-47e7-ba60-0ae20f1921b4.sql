-- SECURITY FIX: Update RLS policies to properly restrict anonymous access
-- All policies should use 'authenticated' role or explicit auth checks

-- 1. Fix active_sessions policies - use 'authenticated' role
DROP POLICY IF EXISTS "Users can view own active_sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users can insert own active_sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users can update own active_sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users can delete own active_sessions" ON public.active_sessions;

CREATE POLICY "Authenticated users can view own active_sessions" 
ON public.active_sessions 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own active_sessions" 
ON public.active_sessions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own active_sessions" 
ON public.active_sessions 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own active_sessions" 
ON public.active_sessions 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- 2. Fix products policies - use 'authenticated' role
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;

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

CREATE POLICY "Authenticated users can update products" 
ON public.products 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete products" 
ON public.products 
FOR DELETE 
TO authenticated
USING (true);

-- 3. Fix movements policies - use 'authenticated' role
DROP POLICY IF EXISTS "Authenticated users can view movements" ON public.movements;
DROP POLICY IF EXISTS "Authenticated users can insert movements" ON public.movements;
DROP POLICY IF EXISTS "Authenticated users can update movements" ON public.movements;

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

CREATE POLICY "Authenticated users can update movements" 
ON public.movements 
FOR UPDATE 
TO authenticated
USING (true);

-- 4. Fix alerts policies - use 'authenticated' role
DROP POLICY IF EXISTS "Authenticated users can view alerts" ON public.alerts;
DROP POLICY IF EXISTS "Authenticated users can insert alerts" ON public.alerts;
DROP POLICY IF EXISTS "Authenticated users can update alerts" ON public.alerts;
DROP POLICY IF EXISTS "Authenticated users can delete alerts" ON public.alerts;

CREATE POLICY "Authenticated users can view alerts" 
ON public.alerts 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert alerts" 
ON public.alerts 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update alerts" 
ON public.alerts 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete alerts" 
ON public.alerts 
FOR DELETE 
TO authenticated
USING (true);

-- 5. Fix profiles policies - use 'authenticated' role
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile data" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Authenticated admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (get_current_user_role() = 'admin');

CREATE POLICY "Authenticated users can update own profile data" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- 6. Fix category_notifications policies - use 'authenticated' role
DROP POLICY IF EXISTS "Users can view own category notifications" ON public.category_notifications;
DROP POLICY IF EXISTS "Users can manage own category notifications" ON public.category_notifications;
DROP POLICY IF EXISTS "Admins can view all category notifications" ON public.category_notifications;

CREATE POLICY "Authenticated users can view own category notifications" 
ON public.category_notifications 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can manage own category notifications" 
ON public.category_notifications 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated admins can view all category notifications" 
ON public.category_notifications 
FOR SELECT 
TO authenticated
USING (get_current_user_role() = 'admin');