
-- 1) profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_change_required boolean NOT NULL DEFAULT false;

-- 2) enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'super_admin','administrador','secretaria','coordenacao',
    'professor','aluno','financeiro','atendimento',
    'gestor_unidade','operador_espacos'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) user_roles: drop old check, normalize, alter type
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS course_id uuid;

UPDATE public.user_roles SET role = CASE
  WHEN role IN ('super_admin','administrador','secretaria','coordenacao','professor','aluno','financeiro','atendimento','gestor_unidade','operador_espacos') THEN role
  WHEN role = 'academico' THEN 'secretaria'
  WHEN role = 'coordenador' THEN 'coordenacao'
  WHEN role = 'responsavel' THEN 'atendimento'
  ELSE 'super_admin'
END;

ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::public.app_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 4) security definer helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role AND is_active=true);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id=_user_id AND is_active=true
      AND role IN ('super_admin','administrador','secretaria','coordenacao','financeiro','atendimento','gestor_unidade','operador_espacos')
  );
$$;

-- 5) rooms
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  block text, floor text,
  capacity integer NOT NULL DEFAULT 0,
  room_type text NOT NULL DEFAULT 'sala_aula',
  has_projector boolean NOT NULL DEFAULT false,
  has_air_conditioning boolean NOT NULL DEFAULT false,
  has_computer boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'disponivel',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms_read_auth" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "rooms_write_staff" ON public.rooms FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 6) room_reservations
CREATE TABLE IF NOT EXISTS public.room_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  requester_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'reserva',
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'solicitada',
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approval_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_reservations TO authenticated;
GRANT ALL ON public.room_reservations TO service_role;
ALTER TABLE public.room_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reservas_read_auth" ON public.room_reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "reservas_insert" ON public.room_reservations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id OR public.is_staff(auth.uid()));
CREATE POLICY "reservas_update" ON public.room_reservations FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id OR public.is_staff(auth.uid()))
  WITH CHECK (auth.uid() = requester_id OR public.is_staff(auth.uid()));
CREATE POLICY "reservas_delete_staff" ON public.room_reservations FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- 7) requirement_categories
CREATE TABLE IF NOT EXISTS public.requirement_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  department text,
  sla_days integer NOT NULL DEFAULT 5,
  requires_attachment boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.requirement_categories TO authenticated;
GRANT ALL ON public.requirement_categories TO service_role;
ALTER TABLE public.requirement_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "req_cats_read" ON public.requirement_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "req_cats_write_admin" ON public.requirement_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'administrador'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'administrador'));

-- 8) student_requirements extra columns
ALTER TABLE public.student_requirements
  ADD COLUMN IF NOT EXISTS protocol_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.requirement_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS response text,
  ADD COLUMN IF NOT EXISTS due_date timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 9) communications
CREATE TABLE IF NOT EXISTS public.communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  target_type text NOT NULL DEFAULT 'all',
  target_id uuid,
  channel text NOT NULL DEFAULT 'portal',
  priority text NOT NULL DEFAULT 'normal',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'rascunho',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communications TO authenticated;
GRANT ALL ON public.communications TO service_role;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comm_read_auth" ON public.communications FOR SELECT TO authenticated USING (true);
CREATE POLICY "comm_write_staff" ON public.communications FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 10) notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_read_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notif_delete_own" ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) OR auth.uid() = user_id);

-- 11) handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12) seed categorias
INSERT INTO public.requirement_categories (code, name, department, sla_days, requires_attachment) VALUES
  ('DEC_MAT','Declaração de matrícula','secretaria',2,false),
  ('HIST','Histórico escolar','secretaria',5,false),
  ('TRANC','Trancamento de matrícula','secretaria',7,true),
  ('REV_NOTA','Revisão de nota','coordenacao',5,true),
  ('BOL_2VIA','2ª via de boleto','financeiro',2,false),
  ('NEGOC_FIN','Negociação financeira','financeiro',5,false),
  ('EST_TERMO','Termo de estágio','atendimento',7,true),
  ('AAC','Atividades complementares','coordenacao',10,true),
  ('OUTROS','Outros','atendimento',5,false)
ON CONFLICT (code) DO NOTHING;
