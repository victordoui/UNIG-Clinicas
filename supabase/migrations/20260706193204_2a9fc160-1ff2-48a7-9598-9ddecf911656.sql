
CREATE TABLE IF NOT EXISTS public.requirement_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES public.student_requirements(id) ON DELETE CASCADE,
  author_id uuid,
  author_name text,
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requirement_comments TO authenticated;
GRANT SELECT ON public.requirement_comments TO anon;
GRANT ALL ON public.requirement_comments TO service_role;
ALTER TABLE public.requirement_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY req_comments_read ON public.requirement_comments FOR SELECT USING (true);
CREATE POLICY req_comments_insert ON public.requirement_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY req_comments_update ON public.requirement_comments FOR UPDATE TO authenticated USING (author_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY req_comments_delete ON public.requirement_comments FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE TRIGGER trg_req_comments_updated_at BEFORE UPDATE ON public.requirement_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_req_comments_req ON public.requirement_comments(requirement_id, created_at);

CREATE TABLE IF NOT EXISTS public.requirement_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES public.student_requirements(id) ON DELETE CASCADE,
  uploaded_by uuid,
  file_name text NOT NULL,
  file_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requirement_attachments TO authenticated;
GRANT SELECT ON public.requirement_attachments TO anon;
GRANT ALL ON public.requirement_attachments TO service_role;
ALTER TABLE public.requirement_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY req_att_read ON public.requirement_attachments FOR SELECT USING (true);
CREATE POLICY req_att_insert ON public.requirement_attachments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY req_att_delete ON public.requirement_attachments FOR DELETE TO authenticated USING (uploaded_by = auth.uid() OR public.is_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_req_att_req ON public.requirement_attachments(requirement_id);

CREATE INDEX IF NOT EXISTS idx_student_req_status ON public.student_requirements(status);
CREATE INDEX IF NOT EXISTS idx_student_req_priority ON public.student_requirements(priority);
CREATE INDEX IF NOT EXISTS idx_student_req_due ON public.student_requirements(due_date);
CREATE INDEX IF NOT EXISTS idx_student_req_assigned ON public.student_requirements(assigned_to);
CREATE INDEX IF NOT EXISTS idx_student_req_category ON public.student_requirements(category_id);
CREATE INDEX IF NOT EXISTS idx_student_req_student ON public.student_requirements(student_id);
