-- CRITICAL SECURITY FIXES - Comprehensive RLS Policy Updates

-- 1. FIX PROFILES TABLE - Prevent privilege escalation
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create secure role update policy for admins only
CREATE POLICY "Only admins can update user roles" 
ON public.profiles 
FOR UPDATE 
USING (get_current_user_role() = 'admin')
WITH CHECK (
  get_current_user_role() = 'admin' AND
  -- Prevent role changes to non-existent roles
  role IN ('admin', 'gerente', 'usuario')
);

-- Allow users to update their own non-role fields
CREATE POLICY "Users can update own profile data" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  -- Users cannot change their own role
  role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- 2. SECURE SECURITY_AUDIT_LOG - Admin access only
DROP POLICY IF EXISTS "Users can view all security_audit_log" ON public.security_audit_log;

CREATE POLICY "Only admins can view security audit log" 
ON public.security_audit_log 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- 3. SECURE LOGIN_ATTEMPTS - Admin access only  
DROP POLICY IF EXISTS "Users can view all login_attempts" ON public.login_attempts;

CREATE POLICY "Only admins can view login attempts" 
ON public.login_attempts 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- 4. SECURE USER_BANS - Admin/Manager access only
DROP POLICY IF EXISTS "Users can manage user_bans" ON public.user_bans;
DROP POLICY IF EXISTS "Users can view all user_bans" ON public.user_bans;

CREATE POLICY "Only admins and managers can view user bans" 
ON public.user_bans 
FOR SELECT 
USING (get_current_user_role() IN ('admin', 'gerente'));

CREATE POLICY "Only admins and managers can manage user bans" 
ON public.user_bans 
FOR ALL 
USING (get_current_user_role() IN ('admin', 'gerente'))
WITH CHECK (get_current_user_role() IN ('admin', 'gerente'));

-- 5. SECURE USER_APPROVALS - Admin/Manager access only
DROP POLICY IF EXISTS "Users can manage user_approvals" ON public.user_approvals;
DROP POLICY IF EXISTS "Users can view all user_approvals" ON public.user_approvals;

CREATE POLICY "Only admins and managers can view user approvals" 
ON public.user_approvals 
FOR SELECT 
USING (get_current_user_role() IN ('admin', 'gerente'));

CREATE POLICY "Only admins and managers can manage user approvals" 
ON public.user_approvals 
FOR ALL 
USING (get_current_user_role() IN ('admin', 'gerente'))
WITH CHECK (get_current_user_role() IN ('admin', 'gerente'));

-- 6. SECURE SETTINGS TABLE - Admin access only
DROP POLICY IF EXISTS "Admins can modify settings" ON public.settings;
DROP POLICY IF EXISTS "Users can view all settings" ON public.settings;

CREATE POLICY "Only admins can view settings" 
ON public.settings 
FOR SELECT 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Only admins can modify settings" 
ON public.settings 
FOR ALL 
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- 7. SECURE CATEGORY_NOTIFICATIONS - User-specific access
DROP POLICY IF EXISTS "Users can manage category_notifications" ON public.category_notifications;
DROP POLICY IF EXISTS "Users can view all category_notifications" ON public.category_notifications;

CREATE POLICY "Users can view own category notifications" 
ON public.category_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own category notifications" 
ON public.category_notifications 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can view all category notifications
CREATE POLICY "Admins can view all category notifications" 
ON public.category_notifications 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- 8. ADD UNIQUE CONSTRAINT TO ACTIVE_SESSIONS
-- First remove any duplicates using ROW_NUMBER() window function
DELETE FROM public.active_sessions 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY user_id, session_id ORDER BY created_at) as rn
    FROM public.active_sessions
  ) ranked
  WHERE rn > 1
);

-- Add unique constraint
ALTER TABLE public.active_sessions 
ADD CONSTRAINT unique_user_session UNIQUE (user_id, session_id);

-- 9. SECURE ALERT_SUPPRESSIONS - Admin/Manager access only
DROP POLICY IF EXISTS "Users can manage alert_suppressions" ON public.alert_suppressions;
DROP POLICY IF EXISTS "Users can view all alert_suppressions" ON public.alert_suppressions;

CREATE POLICY "Only admins and managers can view alert suppressions" 
ON public.alert_suppressions 
FOR SELECT 
USING (get_current_user_role() IN ('admin', 'gerente'));

CREATE POLICY "Only admins and managers can manage alert suppressions" 
ON public.alert_suppressions 
FOR ALL 
USING (get_current_user_role() IN ('admin', 'gerente'))
WITH CHECK (get_current_user_role() IN ('admin', 'gerente'));