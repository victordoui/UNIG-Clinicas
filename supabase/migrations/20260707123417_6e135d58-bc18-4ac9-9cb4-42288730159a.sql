
-- direct_messages
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text,
  body text NOT NULL,
  parent_id uuid REFERENCES public.direct_messages(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dm_sender ON public.direct_messages(sender_id, created_at DESC);
CREATE INDEX idx_dm_recipient ON public.direct_messages(recipient_id, created_at DESC);
CREATE INDEX idx_dm_parent ON public.direct_messages(parent_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY dm_select_own ON public.direct_messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY dm_insert_sender ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY dm_update_recipient_read ON public.direct_messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (recipient_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY dm_delete_staff ON public.direct_messages FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER trg_dm_updated BEFORE UPDATE ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Notification helpers
CREATE OR REPLACE FUNCTION public.mark_notification_read(_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.notifications SET read_at = now()
   WHERE id = _id AND user_id = auth.uid() AND read_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.notifications SET read_at = now()
   WHERE user_id = auth.uid() AND read_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.broadcast_announcement(_announcement_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a RECORD;
  n integer := 0;
BEGIN
  IF NOT (public.has_role(auth.uid(),'super_admin')
       OR public.has_role(auth.uid(),'administrador')
       OR public.has_role(auth.uid(),'coordenacao')
       OR public.has_role(auth.uid(),'secretaria')) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  SELECT * INTO a FROM public.announcements WHERE id = _announcement_id;
  IF a IS NULL THEN RAISE EXCEPTION 'Comunicado não encontrado'; END IF;

  INSERT INTO public.notifications (user_id, title, body, link)
  SELECT p.id, a.title, a.body, '/comunicados'
    FROM public.profiles p
   WHERE
     CASE a.audience
       WHEN 'todos'    THEN true
       WHEN 'alunos'   THEN EXISTS (SELECT 1 FROM public.students s WHERE s.email = p.email)
       WHEN 'docentes' THEN EXISTS (SELECT 1 FROM public.professors pr WHERE pr.email = p.email)
       WHEN 'staff'    THEN public.is_staff(p.id)
       ELSE false
     END;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;

-- Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
