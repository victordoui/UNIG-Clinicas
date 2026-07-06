-- Fix active_sessions RLS policy to allow admins to view all sessions
DROP POLICY IF EXISTS "Authenticated users can view own active_sessions" ON public.active_sessions;

-- Allow users to view their own sessions + admins can view all sessions
CREATE POLICY "Users can view own sessions, admins can view all" 
ON public.active_sessions 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id OR 
  get_current_user_role() = 'admin'::text
);

-- Add session cleanup trigger to automatically remove old sessions
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Delete sessions older than 7 days
  DELETE FROM public.active_sessions 
  WHERE last_activity < now() - interval '7 days';
  
  RETURN NEW;
END;
$$;

-- Create trigger for session cleanup (runs on insert)
DROP TRIGGER IF EXISTS cleanup_old_sessions_trigger ON public.active_sessions;
CREATE TRIGGER cleanup_old_sessions_trigger
  AFTER INSERT ON public.active_sessions
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_old_sessions();