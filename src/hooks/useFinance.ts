import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStudentProfile } from '@/hooks/useStudentData';
import { applyScholarship, generateMockDigitableLine, generateSlipNumber, toMonthRef } from '@/lib/finance';

// ---------------- Scholarships ----------------
export function useScholarships(activeOnly = false) {
  return useQuery({
    queryKey: ['scholarships', activeOnly],
    queryFn: async () => {
      let q = supabase.from('scholarships').select('*').order('name');
      if (activeOnly) q = q.eq('active', true);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertScholarship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: any }) => {
      if (id) {
        const { data, error } = await supabase.from('scholarships').update(values).eq('id', id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from('scholarships').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scholarships'] }),
  });
}

export function useDeleteScholarship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scholarships').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scholarships'] }),
  });
}

// ---------------- Student scholarships ----------------
export function useStudentScholarships(studentId?: string) {
  return useQuery({
    queryKey: ['student-scholarships', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_scholarships')
        .select('*, scholarship:scholarships(*), student:students(id, full_name, registration, email)')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAllStudentScholarships(filters: { status?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ['all-student-scholarships', filters],
    queryFn: async () => {
      let q = supabase
        .from('student_scholarships')
        .select('*, scholarship:scholarships(*), student:students(id, full_name, registration, email, course:courses(id,name))');
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      const { data, error } = await q.order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      let list = data ?? [];
      if (filters.search) {
        const s = filters.search.toLowerCase();
        list = list.filter((r: any) =>
          r.student?.full_name?.toLowerCase().includes(s) ||
          r.student?.registration?.toLowerCase().includes(s) ||
          r.scholarship?.name?.toLowerCase().includes(s));
      }
      return list;
    },
  });
}

export function useAssignScholarship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { data, error } = await supabase.from('student_scholarships').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-scholarships'] });
      qc.invalidateQueries({ queryKey: ['all-student-scholarships'] });
    },
  });
}

export function useUpdateStudentScholarship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: any }) => {
      const { data, error } = await supabase.from('student_scholarships').update(values).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-scholarships'] });
      qc.invalidateQueries({ queryKey: ['all-student-scholarships'] });
    },
  });
}

// ---------------- Tuition charges ----------------
export interface ChargeFilters {
  studentId?: string;
  status?: string;
  referenceMonth?: string; // YYYY-MM-01
  courseId?: string;
  search?: string;
}

export function useTuitionCharges(filters: ChargeFilters = {}) {
  return useQuery({
    queryKey: ['tuition-charges', filters],
    queryFn: async () => {
      let q = supabase
        .from('tuition_charges')
        .select('*, student:students(id, full_name, registration, email, course_id), course:courses(id, name, code)');
      if (filters.studentId) q = q.eq('student_id', filters.studentId);
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters.referenceMonth) q = q.eq('reference_month', filters.referenceMonth);
      if (filters.courseId && filters.courseId !== 'all') q = q.eq('course_id', filters.courseId);
      const { data, error } = await q.order('due_date', { ascending: false }).limit(1000);
      if (error) throw error;
      let list = data ?? [];
      if (filters.search) {
        const s = filters.search.toLowerCase();
        list = list.filter((r: any) =>
          r.student?.full_name?.toLowerCase().includes(s) ||
          r.student?.registration?.toLowerCase().includes(s) ||
          r.description?.toLowerCase().includes(s));
      }
      return list;
    },
  });
}

export function useUpsertCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: any }) => {
      if (id) {
        const { data, error } = await supabase.from('tuition_charges').update(values).eq('id', id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from('tuition_charges').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tuition-charges'] });
      qc.invalidateQueries({ queryKey: ['my-charges'] });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });
}

export function useDeleteCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tuition_charges').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tuition-charges'] });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });
}

export function useMarkChargePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ chargeId, paidAmount, method, paidAt }: { chargeId: string; paidAmount: number; method: string; paidAt?: string }) => {
      const { data, error } = await supabase.rpc('mark_charge_paid', {
        _charge_id: chargeId,
        _paid_amount: paidAmount,
        _method: method,
        _paid_at: paidAt ?? new Date().toISOString(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tuition-charges'] });
      qc.invalidateQueries({ queryKey: ['payment-slips'] });
      qc.invalidateQueries({ queryKey: ['my-charges'] });
      qc.invalidateQueries({ queryKey: ['my-slips'] });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });
}

// Geração em lote de mensalidades para um mês/curso, aplicando bolsas ativas.
export function useBulkGenerateCharges() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      courseId,
      referenceMonth,
      dueDate,
      baseAmount,
      description,
    }: { courseId: string; referenceMonth: string; dueDate: string; baseAmount: number; description?: string }) => {
      // Buscar alunos do curso ativos
      const { data: students, error: sErr } = await supabase
        .from('students')
        .select('id')
        .eq('course_id', courseId)
        .eq('enrollment_status', 'active');
      if (sErr) throw sErr;
      if (!students?.length) return { inserted: 0, skipped: 0 };

      const ids = students.map((s: any) => s.id);

      // Bolsas ativas dos alunos
      const { data: ss, error: ssErr } = await supabase
        .from('student_scholarships')
        .select('student_id, scholarship:scholarships(discount_kind, discount_value, active)')
        .in('student_id', ids)
        .eq('status', 'ativa');
      if (ssErr) throw ssErr;

      // Cobranças já existentes nesse mês para evitar duplicar
      const { data: existing, error: eErr } = await supabase
        .from('tuition_charges')
        .select('student_id')
        .in('student_id', ids)
        .eq('reference_month', referenceMonth);
      if (eErr) throw eErr;
      const existingSet = new Set((existing ?? []).map((c: any) => c.student_id));

      const bolsaByStudent = new Map<string, any>();
      (ss ?? []).forEach((r: any) => {
        if (r.scholarship?.active) bolsaByStudent.set(r.student_id, r.scholarship);
      });

      const rows = ids
        .filter((id) => !existingSet.has(id))
        .map((sid) => {
          const b = bolsaByStudent.get(sid);
          const discount = b ? applyScholarship(baseAmount, b) : 0;
          return {
            student_id: sid,
            course_id: courseId,
            reference_month: referenceMonth,
            due_date: dueDate,
            base_amount: baseAmount,
            discount_amount: discount,
            description: description ?? null,
            status: 'pendente',
          };
        });

      if (rows.length === 0) return { inserted: 0, skipped: ids.length };
      const { error: iErr } = await supabase.from('tuition_charges').insert(rows);
      if (iErr) throw iErr;
      return { inserted: rows.length, skipped: ids.length - rows.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tuition-charges'] });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });
}

// ---------------- Payment slips ----------------
export interface SlipFilters { studentId?: string; status?: string; search?: string; }

export function usePaymentSlips(filters: SlipFilters = {}) {
  return useQuery({
    queryKey: ['payment-slips', filters],
    queryFn: async () => {
      let q = supabase
        .from('payment_slips')
        .select('*, student:students(id, full_name, registration, email), charge:tuition_charges(id, reference_month, description)');
      if (filters.studentId) q = q.eq('student_id', filters.studentId);
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      const { data, error } = await q.order('issued_at', { ascending: false }).limit(500);
      if (error) throw error;
      let list = data ?? [];
      if (filters.search) {
        const s = filters.search.toLowerCase();
        list = list.filter((r: any) =>
          r.slip_number?.toLowerCase().includes(s) ||
          r.student?.full_name?.toLowerCase().includes(s) ||
          r.student?.registration?.toLowerCase().includes(s));
      }
      return list;
    },
  });
}

export function useIssueSlip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ chargeId }: { chargeId: string }) => {
      // Buscar charge
      const { data: charge, error: cErr } = await supabase
        .from('tuition_charges').select('*').eq('id', chargeId).single();
      if (cErr) throw cErr;

      const seed = `${chargeId}-${charge.student_id}`;
      const slipNumber = generateSlipNumber(seed);
      const digitable = generateMockDigitableLine(seed);
      const barcode = digitable.replace(/[^0-9]/g, '');

      const { data, error } = await supabase.from('payment_slips').insert({
        charge_id: chargeId,
        student_id: charge.student_id,
        slip_number: slipNumber,
        barcode,
        digitable_line: digitable,
        amount: charge.net_amount,
        due_date: charge.due_date,
        status: 'emitido',
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-slips'] });
      qc.invalidateQueries({ queryKey: ['my-slips'] });
    },
  });
}

export function useCancelSlip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payment_slips').update({ status: 'cancelado' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-slips'] }),
  });
}

// ---------------- Aluno logado ----------------
export function useMyCharges() {
  const { data: student } = useStudentProfile();
  return useQuery({
    queryKey: ['my-charges', student?.id],
    enabled: !!student?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tuition_charges')
        .select('*, course:courses(id, name, code)')
        .eq('student_id', student!.id)
        .order('due_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMySlips() {
  const { data: student } = useStudentProfile();
  return useQuery({
    queryKey: ['my-slips', student?.id],
    enabled: !!student?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_slips')
        .select('*, charge:tuition_charges(id, reference_month, description)')
        .eq('student_id', student!.id)
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyScholarships() {
  const { data: student } = useStudentProfile();
  return useStudentScholarships(student?.id);
}

// ---------------- KPIs da tesouraria ----------------
export function useFinanceSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['finance-summary', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const now = new Date();
      const monthStart = toMonthRef(now);
      const [chargesRes, slipsRes, ssRes] = await Promise.all([
        supabase.from('tuition_charges').select('id, status, net_amount, due_date, reference_month, paid_at'),
        supabase.from('payment_slips').select('id, status'),
        supabase.from('student_scholarships').select('id, status'),
      ]);
      const charges = chargesRes.data ?? [];
      const slips = slipsRes.data ?? [];
      const ss = ssRes.data ?? [];

      const today = now.toISOString().slice(0, 10);
      const paidThisMonth = charges
        .filter((c: any) => c.status === 'pago' && c.paid_at && c.paid_at.slice(0, 7) === today.slice(0, 7))
        .reduce((s: number, c: any) => s + Number(c.net_amount ?? 0), 0);
      const toReceive = charges
        .filter((c: any) => c.status === 'pendente' || c.status === 'em_negociacao')
        .reduce((s: number, c: any) => s + Number(c.net_amount ?? 0), 0);
      const overdue = charges.filter((c: any) =>
        (c.status === 'pendente' || c.status === 'em_negociacao') && c.due_date && c.due_date < today
      );
      const overdueAmount = overdue.reduce((s: number, c: any) => s + Number(c.net_amount ?? 0), 0);
      const total = charges.length || 1;
      const defaultRate = (overdue.length / total) * 100;

      return {
        paidThisMonth,
        toReceive,
        overdueAmount,
        overdueCount: overdue.length,
        defaultRate,
        activeScholarships: ss.filter((r: any) => r.status === 'ativa').length,
        openSlips: slips.filter((s: any) => s.status === 'emitido').length,
        totalCharges: charges.length,
        monthRef: monthStart,
      };
    },
  });
}
