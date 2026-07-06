-- Add rate limiting for login attempts
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address TEXT,
    attempt_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    success BOOLEAN DEFAULT false,
    user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view login attempts
CREATE POLICY "Admins can view login attempts" 
ON public.login_attempts 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- System can insert login attempts
CREATE POLICY "System can log login attempts" 
ON public.login_attempts 
FOR INSERT 
WITH CHECK (true);

-- Function to check if rate limit is exceeded
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_email TEXT, p_ip_address TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    failed_attempts INTEGER := 0;
    last_attempt TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Count failed attempts in the last 15 minutes
    SELECT COUNT(*), MAX(attempt_time)
    INTO failed_attempts, last_attempt
    FROM public.login_attempts
    WHERE email = p_email 
    AND success = false
    AND attempt_time > now() - interval '15 minutes';
    
    -- If more than 5 failed attempts in 15 minutes, check if cooldown period has passed
    IF failed_attempts >= 5 THEN
        -- If last attempt was less than 30 minutes ago, rate limit is active
        IF last_attempt > now() - interval '30 minutes' THEN
            RETURN false;
        END IF;
    END IF;
    
    RETURN true;
END;
$$;

-- Function to log login attempt
CREATE OR REPLACE FUNCTION public.log_login_attempt(p_email TEXT, p_success BOOLEAN, p_ip_address TEXT DEFAULT NULL, p_user_agent TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.login_attempts (email, ip_address, success, user_agent)
    VALUES (p_email, p_ip_address, p_success, p_user_agent);
    
    -- Clean up old attempts (older than 24 hours)
    DELETE FROM public.login_attempts 
    WHERE attempt_time < now() - interval '24 hours';
END;
$$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time 
ON public.login_attempts (email, attempt_time DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_cleanup 
ON public.login_attempts (attempt_time);