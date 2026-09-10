import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UnigRole } from '@/lib/unigRoles';

// ---------- Users + roles ----------
export interface AdminUserRow {
  id: string;
  email: string | null;
  full_name: string;
  status: string;
  is_super_admin: boolean;
  password_change_required: boolean;
  created_at: string;
  roles: { id: string; role: string; organization_id: string; is_active: boolean; scopes: { id: string; clinic_id: string; clinic_name: string; revoked_at: string | null }[] }[];
}

export function useAdminUsers(search?: string) {
  return useQuery({
    queryKey: ['admin-users', search ?? ''],
    queryFn: async (): Promise<AdminUserRow[]> => {
      const [profiles, assignments, scopes] = await Promise.all([
        (supabase.from('profiles') as any).select('id, email, full_name, created_at, status, is_super_admin, password_change_required').order('full_name').limit(500),
        supabase.from('user_roles').select('id, user_id, organization_id, is_active, role:roles(code)').limit(2000),
        (supabase.from('user_clinic_scopes') as any).select('id,user_role_id,clinic_id,revoked_at,clinic:clinics(name)').limit(4000),
      ]);
      if (profiles.error) throw profiles.error;
      if (assignments.error) throw assignments.error;
      if (scopes.error) throw scopes.error;
      const scopesByRole = new Map<string, any[]>();
      for (const scope of (scopes.data ?? []) as any[]) {
        const rows = scopesByRole.get(scope.user_role_id) ?? [];
        rows.push({ id: scope.id, clinic_id: scope.clinic_id, clinic_name: scope.clinic?.name ?? 'Clínica', revoked_at: scope.revoked_at ?? null });
        scopesByRole.set(scope.user_role_id, rows);
      }
      const rolesByUser = new Map<string, any[]>();
      for (const role of (assignments.data ?? []) as any[]) {
        const rows = rolesByUser.get(role.user_id) ?? [];
        if (role.is_active) rows.push({ ...role, role: role.role?.code ?? 'visitante', scopes: scopesByRole.get(role.id) ?? [] });
        rolesByUser.set(role.user_id, rows);
      }
      const normalized = (profiles.data ?? []).map((p: any) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        status: p.status ?? 'ativo',
        is_super_admin: Boolean(p.is_super_admin),
        password_change_required: Boolean(p.password_change_required),
        created_at: p.created_at,
        roles: rolesByUser.get(p.id) ?? [],
      }));
      if (!search?.trim()) return normalized;
      const term = search.trim().toLowerCase();
      return normalized.filter((user) => `${user.full_name} ${user.email ?? ''}`.toLowerCase().includes(term));
    },
  });
}

export function useAssignRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role, clinicId }: { userId: string; role: UnigRole; clinicId?: string | null }) => {
      const dbRoleByUi: Record<string, string> = { super_admin: 'super_admin', administrador: 'organization_admin', gestor_unidade: 'clinic_manager', professor: 'clinician', coordenacao: 'academic_supervisor', aluno: 'student', atendimento: 'receptionist', financeiro: 'auditor' };
      const dbCode = dbRoleByUi[role] ?? role;
      const [{ data: roleRow, error: roleError }, { data: scopeTarget, error: scopeError }] = await Promise.all([
        supabase.from('roles').select('id').eq('code', dbCode).single(),
        clinicId ? supabase.from('clinics').select('organization_id').eq('id', clinicId).single() : supabase.from('organizations').select('id').limit(1).single(),
      ]);
      if (roleError) throw roleError; if (scopeError) throw scopeError;
      const organizationId = clinicId ? scopeTarget.organization_id : scopeTarget.id;
      const { data, error } = await (supabase.from('user_roles') as any).upsert({ user_id: userId, role_id: roleRow.id, organization_id: organizationId, is_active: true }, { onConflict: 'user_id,organization_id,role_id' }).select().single();
      if (error) throw error;
      if (clinicId) {
        const { error: scopeInsertError } = await (supabase.from('user_clinic_scopes') as any).upsert({ user_role_id: data.id, clinic_id: clinicId, revoked_at: null }, { onConflict: 'user_role_id,clinic_id' });
        if (scopeInsertError) throw scopeInsertError;
      } else {
        // A global assignment must not retain stale clinic scopes. Revoke them
        // instead of deleting the history, so the role really becomes global.
        const { error: scopeRevokeError } = await (supabase.from('user_clinic_scopes') as any)
          .update({ revoked_at: new Date().toISOString() })
          .eq('user_role_id', data.id)
          .is('revoked_at', null);
        if (scopeRevokeError) throw scopeRevokeError;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useRevokeRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userRoleId: string) => {
      const { error } = await (supabase.from('user_roles') as any).update({ is_active: false }).eq('id', userRoleId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      throw new Error('Redefinição de senha deve ser feita pelo fluxo seguro de recuperação do Auth.');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

// ---------- Units ----------
export function useAdminUnits() {
  return useQuery({
    queryKey: ['admin-units'],
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('*').order('name').limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRevokeClinicScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scopeId: string) => {
      const { error } = await (supabase.from('user_clinic_scopes') as any).update({ revoked_at: new Date().toISOString() }).eq('id', scopeId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useAdminClinics() {
  return useQuery({
    queryKey: ['admin-clinics'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clinics').select('id, name, organization_id').eq('is_active', true).order('name').limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface UnitInput {
  code: string; name: string; city: string; state: string;
  address?: string | null; phone?: string | null; email?: string | null; is_active?: boolean;
}

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (u: UnitInput) => {
      const { data, error } = await supabase.from('units').insert(u as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-units'] }),
  });
}

export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: UnitInput & { id: string }) => {
      const { data, error } = await supabase.from('units').update(u as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-units'] }),
  });
}

export function useToggleUnitStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('units').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-units'] }),
  });
}

// ---------- Settings ----------
export function useSystemSettings() {
  return useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data: organization, error: organizationError } = await supabase.from('organizations').select('id').limit(1).single();
      if (organizationError) throw organizationError;
      const { data, error } = await (supabase as any).from('organization_settings').select('*').eq('organization_id', organization.id).order('key').limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: any; description?: string | null }) => {
      const { data: organization, error: organizationError } = await supabase.from('organizations').select('id').limit(1).single();
      if (organizationError) throw organizationError;
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from('organization_settings').upsert({ organization_id: organization.id, key, value, description: description ?? null, updated_by: auth.user?.id }, { onConflict: 'organization_id,key' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-settings'] }),
  });
}

// ---------- Audit logs ----------
export interface AuditLogFilters {
  action?: string;
  entity_table?: string;
  actor_id?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery({
    queryKey: ['admin-audit-logs', filters],
    queryFn: async () => {
      let q = supabase
        .from('audit_logs')
        .select('id, actor_id, action, entity_table, entity_id, metadata, created_at, actor:profiles!audit_logs_actor_id_fkey(id, full_name, email)')
        .order('created_at', { ascending: false })
        .limit(filters.limit ?? 200);
      if (filters.action) q = q.ilike('action', `%${filters.action}%`);
      if (filters.entity_table) q = q.eq('entity_table', filters.entity_table);
      if (filters.actor_id) q = q.eq('actor_id', filters.actor_id);
      if (filters.from) q = q.gte('created_at', filters.from);
      if (filters.to) q = q.lte('created_at', filters.to);
      const { data, error } = await q;
      if (error) {
        // Fallback without embed if FK name differs
        let q2 = supabase.from('audit_logs')
          .select('id, actor_id, action, entity_table, entity_id, metadata, created_at')
          .order('created_at', { ascending: false }).limit(filters.limit ?? 200);
        if (filters.action) q2 = q2.ilike('action', `%${filters.action}%`);
        if (filters.entity_table) q2 = q2.eq('entity_table', filters.entity_table);
        if (filters.actor_id) q2 = q2.eq('actor_id', filters.actor_id);
        if (filters.from) q2 = q2.gte('created_at', filters.from);
        if (filters.to) q2 = q2.lte('created_at', filters.to);
        const { data: d2, error: e2 } = await q2;
        if (e2) throw e2;
        return d2 ?? [];
      }
      return data ?? [];
    },
  });
}

// ---------- Permissions matrix ----------
export function useRolePermissions() {
  return useQuery({
    queryKey: ['admin-role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role:roles(code,name), permission:permissions(code,name,description)')
        .limit(1000);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({ role: row.role?.code ?? '—', role_name: row.role?.name ?? '—', permission: row.permission?.code ?? '—', permission_name: row.permission?.name ?? '—', description: row.permission?.description ?? null }));
    },
  });
}
