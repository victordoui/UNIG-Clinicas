
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useSessionTracking() {
  const { user, session } = useAuth();

  useEffect(() => {
    if (!user || !session) return;

    // Check session timeout (24 hours absolute timeout)
    const checkSessionTimeout = () => {
      if (session.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000);
        const now = new Date();
        
        // For absolute timeout, we'll track it differently since we don't have issued_at
        // Instead, we'll rely on database session tracking and cleanup
        
        // Check if session is close to expiring (within 1 hour)
        if (expiresAt.getTime() - now.getTime() < 60 * 60 * 1000) {
          console.log('Session expiring soon, refreshing...');
          supabase.auth.refreshSession();
        }
      }
    };

    const updateSession = async () => {
      try {
        // Check session timeout first
        checkSessionTimeout();

        const userAgent = navigator.userAgent;
        
        // Use session access token as session ID for consistency
        const sessionId = session.access_token.substring(0, 36);
        
        // Try to update existing session or create new one
        const { error } = await supabase
          .from('active_sessions')
          .upsert({
            user_id: user.id,
            session_id: sessionId,
            last_activity: new Date().toISOString(),
            user_agent: userAgent,
          }, {
            onConflict: 'user_id,session_id'
          });

        if (error) {
          console.error('Error updating session:', error);
        }
      } catch (error) {
        console.error('Error in session tracking:', error);
      }
    };

    // Update session immediately
    updateSession();

    // Update session every 5 minutes
    const interval = setInterval(updateSession, 5 * 60 * 1000);

    // Update on page visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, session]);
}
