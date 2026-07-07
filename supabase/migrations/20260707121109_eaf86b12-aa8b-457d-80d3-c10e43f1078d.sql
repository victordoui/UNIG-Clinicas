
-- Fase 7 — Financeiro (ordem corrigida)

CREATE TABLE public.scholarships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  type text NOT NULL DEFAULT 'outro',
  discount_kind text NOT NULL DEFAULT 'percent',
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  valid_from date,
  valid_until date,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scholarships_type_chk CHECK (type IN ('bolsa_integral','bolsa_parcial','desconto_pontualidade','desconto_convenio','outro')),
  CONSTRAINT scholarships_kind_chk CHECK (discount_kind IN ('percent','fixed'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scholarships TO authenticated;
GRANT ALL ON public.scholarships TO service_role;
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.student_scholarships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  scholarship_id uuid NOT NULL REFERENCES public.scholarships(id) ON DELETE RESTRICT,
  starts_at date NOT NULL DEFAULT (now()::date),
  ends_at date,
  status text NOT NULL DEFAULT 'ativa',
  granted_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_scholarships_status_chk CHECK (status IN ('ativa','suspensa','encerrada')),
  CONSTRAINT student_scholarships_unique UNIQUE (student_id, scholarship_id, starts_at)
);
CREATE INDEX idx_student_scholarships_student ON public.student_scholarships(student_id);
CREATE INDEX idx_student_scholarships_scholarship ON public.student_scholarships(scholarship_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_scholarships TO authenticated;
GRANT ALL ON public.student_scholarships TO service_role;
ALTER TABLE public.student_scholarships ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.tuition_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  reference_month date NOT NULL,
  description text,
  base_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  net_amount numeric(12,2) GENERATED ALWAYS AS (GREATEST(base_amount - discount_amount, 0)) STORED,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  paid_at timestamptz,
  paid_amount numeric(12,2),
  payment_method text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tuition_charges_status_chk CHECK (status IN ('pendente','pago','vencido','cancelado','em_negociacao'))
);
CREATE INDEX idx_tuition_charges_student ON public.tuition_charges(student_id);
CREATE INDEX idx_tuition_charges_status ON public.tuition_charges(status);
CREATE INDEX idx_tuition_charges_due ON public.tuition_charges(due_date);
CREATE INDEX idx_tuition_charges_ref ON public.tuition_charges(reference_month);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tuition_charges TO authenticated;
GRANT ALL ON public.tuition_charges TO service_role;
ALTER TABLE public.tuition_charges ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payment_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id uuid REFERENCES public.tuition_charges(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  slip_number text NOT NULL UNIQUE,
  barcode text,
  digitable_line text,
  amount numeric(12,2) NOT NULL,
  due_date date NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'emitido',
  paid_at timestamptz,
  pdf_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_slips_status_chk CHECK (status IN ('emitido','pago','vencido','cancelado'))
);
CREATE INDEX idx_payment_slips_student ON public.payment_slips(student_id);
CREATE INDEX idx_payment_slips_charge ON public.payment_slips(charge_id);
CREATE INDEX idx_payment_slips_status ON public.payment_slips(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_slips TO authenticated;
GRANT ALL ON public.payment_slips TO service_role;
ALTER TABLE public.payment_slips ENABLE ROW LEVEL SECURITY;

-- Triggers updated_at
CREATE TRIGGER trg_scholarships_updated_at BEFORE UPDATE ON public.scholarships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_student_scholarships_updated_at BEFORE UPDATE ON public.student_scholarships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tuition_charges_updated_at BEFORE UPDATE ON public.tuition_charges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_payment_slips_updated_at BEFORE UPDATE ON public.payment_slips FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Policies: scholarships
CREATE POLICY "scholarships_select_staff" ON public.scholarships FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "scholarships_select_own_student" ON public.scholarships FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.student_scholarships ss JOIN public.students s ON s.id=ss.student_id JOIN public.profiles p ON p.email=s.email WHERE ss.scholarship_id=scholarships.id AND p.id=auth.uid())
);
CREATE POLICY "scholarships_insert_finance" ON public.scholarships FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'financeiro')
);
CREATE POLICY "scholarships_update_finance" ON public.scholarships FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'financeiro')
);
CREATE POLICY "scholarships_delete_finance" ON public.scholarships FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'financeiro')
);

-- Policies: student_scholarships
CREATE POLICY "ss_select_staff" ON public.student_scholarships FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "ss_select_own" ON public.student_scholarships FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.students s JOIN public.profiles p ON p.email=s.email WHERE s.id=student_scholarships.student_id AND p.id=auth.uid())
);
CREATE POLICY "ss_insert_finance" ON public.student_scholarships FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'secretaria')
);
CREATE POLICY "ss_update_finance" ON public.student_scholarships FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'secretaria')
);
CREATE POLICY "ss_delete_finance" ON public.student_scholarships FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'financeiro')
);

-- Policies: tuition_charges
CREATE POLICY "tc_select_staff" ON public.tuition_charges FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "tc_select_own" ON public.tuition_charges FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.students s JOIN public.profiles p ON p.email=s.email WHERE s.id=tuition_charges.student_id AND p.id=auth.uid())
);
CREATE POLICY "tc_insert_finance" ON public.tuition_charges FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'financeiro')
);
CREATE POLICY "tc_update_finance" ON public.tuition_charges FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'financeiro')
);
CREATE POLICY "tc_delete_finance" ON public.tuition_charges FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'financeiro')
);

-- Policies: payment_slips
CREATE POLICY "ps_select_staff" ON public.payment_slips FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "ps_select_own" ON public.payment_slips FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.students s JOIN public.profiles p ON p.email=s.email WHERE s.id=payment_slips.student_id AND p.id=auth.uid())
);
CREATE POLICY "ps_insert_finance" ON public.payment_slips FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'financeiro')
);
CREATE POLICY "ps_update_finance" ON public.payment_slips FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'financeiro')
);
CREATE POLICY "ps_delete_finance" ON public.payment_slips FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'financeiro')
);

-- Função: marcar cobrança como paga (atualiza boleto)
CREATE OR REPLACE FUNCTION public.mark_charge_paid(
  _charge_id uuid, _paid_amount numeric, _method text, _paid_at timestamptz DEFAULT now()
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'financeiro')) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  UPDATE public.tuition_charges SET status='pago', paid_at=_paid_at, paid_amount=_paid_amount, payment_method=_method WHERE id=_charge_id;
  UPDATE public.payment_slips SET status='pago', paid_at=_paid_at WHERE charge_id=_charge_id AND status <> 'cancelado';
END; $$;
