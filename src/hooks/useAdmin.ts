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
  roles: { id: string; role: string; unit_id: string | null; is_active: boolean }[];
}

export function useAdminUsers(search?: string) {
  return useQuery({
    queryKey: ['admin-users', search ?? ''],
    queryFn: async (): Promise<AdminUserRow[]> => {
      let q = supabase
        .from('profiles')
        .select('id, email, full_name, status, is_super_admin, password_change_required, created_at, user_roles(id, role, unit_id, is_active)')
        .order('full_name')
        .limit(500);
      if (search && search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`full_name.ilike.${s},email.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        status: p.status,
        is_super_admin: p.is_super_admin,
        password_change_required: p.password_change_required,
        created_at: p.created_at,
        roles: (p.user_roles ?? []).filter((r: any) => r.is_active),
      }));
    },
  });
}

export function useAssignRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role, unitId }: { userId: string; role: UnigRole; unitId?: string | null }) => {
      const { data, error } = await supabase.rpc('admin_assign_role', {
        _user_id: userId, _role: role as any, _unit_id: unitId ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useRevokeRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userRoleId: string) => {
      const { error } = await supabase.rpc('admin_revoke_role', { _user_role_id: userRoleId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('admin_set_password_reset', { _user_id: userId });
      if (error) throw error;
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
      const { data, error } = await supabase.from('system_settings').select('*').order('key').limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: any; description?: string | null }) => {
      const { error } = await supabase.rpc('admin_upsert_setting', {
        _key: key, _value: value, _description: description ?? null,
      });
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
        .select('*')
        .order('role')
        .order('module')
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });
}
