-- Fix critical security vulnerability in active_sessions table
-- Current policies allow any user to view all sessions from all users

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view all active_sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users can insert active_sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users can update active_sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users can delete active_sessions" ON public.active_sessions;

-- Create secure policies that only allow users to access their own sessions
CREATE POLICY "Users can view own active_sessions" 
ON public.active_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own active_sessions" 
ON public.active_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own active_sessions" 
ON public.active_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own active_sessions" 
ON public.active_sessions 
FOR DELETE 
USING (auth.uid() = user_id);