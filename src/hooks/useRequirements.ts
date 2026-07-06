import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { generateProtocol, addDays } from '@/lib/requirements';

const REQ_SELECT = `
  id, protocol_number, title, description, status, priority, due_date,
  created_at, updated_at, completed_at, response, assigned_to, student_id, category_id,
  category:requirement_categories(id, code, name, department, sla_days, requires_attachment),
  student:students(id, full_name, registration_number, email, course_id, course:courses(name))
`;

export interface RequirementFilters {
  status?: string;
  priority?: string;
  categoryId?: string;
  overdueOnly?: boolean;
  mineOnly?: boolean;
  search?: string;
}

export function useRequirementsList(opts: { scope: 'mine' | 'all'; studentId?: string; filters?: RequirementFilters }) {
  const { user } = useAuth();
  const { scope, studentId, filters } = opts;
  return useQuery({
    queryKey: ['requirements', scope, studentId, filters, user?.id],
    enabled: scope === 'all' || !!studentId,
    queryFn: async () => {
      let q = supabase.from('student_requirements').select(REQ_SELECT);
      if (scope === 'mine' && studentId) q = q.eq('student_id', studentId);
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters?.priority && filters.priority !== 'all') q = q.eq('priority', filters.priority);
      if (filters?.categoryId && filters.categoryId !== 'all') q = q.eq('category_id', filters.categoryId);
      if (filters?.mineOnly && user?.id) q = q.eq('assigned_to', user.id);
      if (filters?.search) q = q.or(`title.ilike.%${filters.search}%,protocol_number.ilike.%${filters.search}%`);
      q = q.order('created_at', { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      let rows = data ?? [];
      if (filters?.overdueOnly) {
        const now = new Date();
        rows = rows.filter((r: any) => r.due_date && new Date(r.due_date) < now && r.status !== 'completed' && r.status !== 'rejected');
      }
      return rows;
    },
  });
}

export function useRequirementDetail(id?: string) {
  return useQuery({
    queryKey: ['requirement', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_requirements')
        .select(REQ_SELECT)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useRequirementComments(requirementId?: string) {
  return useQuery({
    queryKey: ['requirement-comments', requirementId],
    enabled: !!requirementId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requirement_comments')
        .select('*')
        .eq('requirement_id', requirementId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRequirementAttachments(requirementId?: string) {
  return useQuery({
    queryKey: ['requirement-attachments', requirementId],
    enabled: !!requirementId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requirement_attachments')
        .select('*')
        .eq('requirement_id', requirementId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface CreateRequirementInput {
  studentId: string;
  categoryId: string;
  title: string;
  description?: string;
  priority?: string;
  slaDays: number;
}

export function useCreateRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRequirementInput) => {
      const due = addDays(new Date(), input.slaDays).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('student_requirements')
        .insert({
          student_id: input.studentId,
          category_id: input.categoryId,
          title: input.title,
          description: input.description ?? null,
          priority: input.priority ?? 'normal',
          status: 'open',
          protocol_number: generateProtocol(),
          due_date: due,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requirements'] });
      qc.invalidateQueries({ queryKey: ['student-requirements'] });
    },
  });
}

export function useUpdateRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const finalPatch = { ...patch };
      if (patch.status === 'completed' && !patch.completed_at) finalPatch.completed_at = new Date().toISOString();
      const { data, error } = await supabase.from('student_requirements').update(finalPatch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['requirement', v.id] });
      qc.invalidateQueries({ queryKey: ['requirements'] });
    },
  });
}

export function useAddRequirementComment() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requirementId, body, isInternal }: { requirementId: string; body: string; isInternal?: boolean }) => {
      const { data, error } = await supabase
        .from('requirement_comments')
        .insert({
          requirement_id: requirementId,
          author_id: user?.id ?? null,
          author_name: profile?.full_name ?? profile?.email ?? 'Usuário',
          body,
          is_internal: isInternal ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['requirement-comments', v.requirementId] }),
  });
}

export function useUploadRequirementAttachment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requirementId, file }: { requirementId: string; file: File }) => {
      const path = `${requirementId}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from('requirement-attachments').upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const { data, error } = await supabase.from('requirement_attachments').insert({
        requirement_id: requirementId,
        uploaded_by: user?.id ?? null,
        file_name: file.name,
        file_path: path,
        mime_type: file.type,
        size_bytes: file.size,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['requirement-attachments', v.requirementId] }),
  });
}

export function useDownloadAttachment() {
  return useMutation({
    mutationFn: async (path: string) => {
      const { data, error } = await supabase.storage.from('requirement-attachments').createSignedUrl(path, 60);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
      return data.signedUrl;
    },
  });
}

export function useStaffList() {
  return useQuery({
    queryKey: ['staff-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role, profile:profiles!inner(id, full_name, email)')
        .eq('is_active', true)
        .in('role', ['secretaria', 'coordenacao', 'atendimento', 'administrador', 'super_admin']);
      if (error) throw error;
      const map = new Map<string, any>();
      (data ?? []).forEach((r: any) => { if (!map.has(r.user_id)) map.set(r.user_id, r.profile); });
      return Array.from(map.values());
    },
  });
}

export function useStudentSearch(q: string) {
  return useQuery({
    queryKey: ['student-search', q],
    enabled: q.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, registration_number, email, course:courses(name)')
        .or(`full_name.ilike.%${q}%,registration_number.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}
