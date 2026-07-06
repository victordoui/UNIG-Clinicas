-- Clean up orphaned sessions that are causing logout issues
-- Delete sessions that don't correspond to valid auth sessions
DELETE FROM public.active_sessions
WHERE session_id = '3397d93a-9392-4ce4-b110-aef9c2f671c6';