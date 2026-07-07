import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Audience, CommChannel, CommPriority, CommStatus, CommTargetType } from '@/lib/communication';

// ---------------- Announcements ----------------
export function useAnnouncements(filters?: { audience?: Audience | 'all' }) {
  return useQuery({
    queryKey: ['announcements', filters],
    queryFn: async () => {
      let q = supabase.from('announcements').select('*').order('published_at', { ascending: false });
      if (filters?.audience && filters.audience !== 'all') q = q.eq('audience', filters.audience);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: any }) => {
      if (id) {
        const { data, error } = await supabase.from('announcements').update(values).eq('id', id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from('announcements').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

export function useBroadcastAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (announcementId: string) => {
      const { data, error } = await supabase.rpc('broadcast_announcement' as any, { _announcement_id: announcementId });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// ---------------- Communications (targeted) ----------------
export function useCommunications(filters?: { status?: CommStatus; channel?: CommChannel }) {
  return useQuery({
    queryKey: ['communications', filters],
    queryFn: async () => {
      let q = supabase.from('communications').select('*').order('created_at', { ascending: false });
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.channel) q = q.eq('channel', filters.channel);
      const { data, error } = await q.limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateCommunication() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: {
      title: string; message: string; target_type: CommTargetType; target_id?: string | null;
      channel: CommChannel; priority: CommPriority; scheduled_at?: string | null; status: CommStatus;
    }) => {
      const payload: any = { ...values, created_by: user?.id ?? null };
      if (values.status === 'enviado') payload.sent_at = new Date().toISOString();
      const { data, error } = await supabase.from('communications').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communications'] }),
  });
}

// ---------------- Notifications ----------------
export function useMyNotifications(onlyUnread = false) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['notifications', user?.id, onlyUnread],
    enabled: !!user?.id,
    queryFn: async () => {
      let query = supabase.from('notifications').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
      if (onlyUnread) query = query.is('read_at', null);
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ['notifications', user.id] });
        qc.invalidateQueries({ queryKey: ['notifications-unread', user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  return q;
}

export function useUnreadNotificationCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications-unread', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('mark_notification_read' as any, { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('mark_all_notifications_read' as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}

// ---------------- Direct messages ----------------
export interface DirectMessageRow {
  id: string; sender_id: string; recipient_id: string;
  subject: string | null; body: string; parent_id: string | null;
  read_at: string | null; created_at: string; updated_at: string;
}

export function useMyMessages() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['direct-messages', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('direct_messages' as any)
        .select('*')
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as DirectMessageRow[];
    },
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`dm-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, () => {
        qc.invalidateQueries({ queryKey: ['direct-messages', user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  return q;
}

export function useConversation(otherUserId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['conversation', user?.id, otherUserId],
    enabled: !!user?.id && !!otherUserId,
    queryFn: async () => {
      const uid = user!.id;
      const { data, error } = await supabase
        .from('direct_messages' as any)
        .select('*')
        .or(`and(sender_id.eq.${uid},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${uid})`)
        .order('created_at', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as DirectMessageRow[];
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: { recipient_id: string; body: string; subject?: string; parent_id?: string | null }) => {
      const { data, error } = await supabase
        .from('direct_messages' as any)
        .insert({ ...values, sender_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['direct-messages'] });
      qc.invalidateQueries({ queryKey: ['conversation'] });
    },
  });
}

export function useMarkMessageRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('direct_messages' as any)
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['direct-messages'] });
      qc.invalidateQueries({ queryKey: ['conversation'] });
    },
  });
}

// ---------------- Profiles (para seletor de destinatário) ----------------
export function useProfilesSearch(term: string) {
  return useQuery({
    queryKey: ['profiles-search', term],
    queryFn: async () => {
      let q = supabase.from('profiles').select('id, full_name, email').order('full_name').limit(30);
      if (term.trim()) q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}
