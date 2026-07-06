
-- Grades table
CREATE TABLE public.grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  assessment text NOT NULL CHECK (assessment IN ('AV1','AV2','AV3','REC')),
  score numeric(5,2),
  max_score numeric(5,2) NOT NULL DEFAULT 10,
  weight numeric(4,2) NOT NULL DEFAULT 1,
  released_at timestamptz,
  released_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, assessment)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grades TO authenticated;
GRANT ALL ON public.grades TO service_role;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- Attendance table
CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  class_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present','absent','justified')),
  hours numeric(4,2) NOT NULL DEFAULT 2,
  notes text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, class_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Triggers to keep updated_at
CREATE TRIGGER trg_grades_updated_at BEFORE UPDATE ON public.grades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper: check enrollment belongs to current student (by email)
CREATE OR REPLACE FUNCTION public.enrollment_belongs_to_student(_enrollment_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.students s ON s.id = e.student_id
    JOIN public.profiles p ON p.email = s.email
    WHERE e.id = _enrollment_id AND p.id = _user_id
  );
$$;

-- Helper: check enrollment class is taught by current professor
CREATE OR REPLACE FUNCTION public.enrollment_taught_by_professor(_enrollment_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.classes c ON c.id = e.class_id
    JOIN public.professors pr ON pr.id = c.professor_id
    JOIN public.profiles p ON p.email = pr.email
    WHERE e.id = _enrollment_id AND p.id = _user_id
  );
$$;

-- GRADES policies
CREATE POLICY "grades_select_student" ON public.grades FOR SELECT TO authenticated
  USING (
    public.is_staff(auth.uid())
    OR public.enrollment_taught_by_professor(enrollment_id, auth.uid())
    OR (released_at IS NOT NULL AND public.enrollment_belongs_to_student(enrollment_id, auth.uid()))
  );

CREATE POLICY "grades_write_staff" ON public.grades FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()) OR public.enrollment_taught_by_professor(enrollment_id, auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()) OR public.enrollment_taught_by_professor(enrollment_id, auth.uid()));

-- ATTENDANCE policies
CREATE POLICY "attendance_select" ON public.attendance_records FOR SELECT TO authenticated
  USING (
    public.is_staff(auth.uid())
    OR public.enrollment_taught_by_professor(enrollment_id, auth.uid())
    OR public.enrollment_belongs_to_student(enrollment_id, auth.uid())
  );

CREATE POLICY "attendance_write" ON public.attendance_records FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()) OR public.enrollment_taught_by_professor(enrollment_id, auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()) OR public.enrollment_taught_by_professor(enrollment_id, auth.uid()));
