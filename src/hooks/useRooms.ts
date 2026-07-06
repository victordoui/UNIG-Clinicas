import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { overlaps } from '@/lib/rooms';

// ---------- Rooms ----------
export interface RoomFilters {
  search?: string;
  unitId?: string;
  status?: string;
  roomType?: string;
}

export function useRooms(filters: RoomFilters = {}) {
  return useQuery({
    queryKey: ['rooms', filters],
    queryFn: async () => {
      let q = supabase.from('rooms').select('*, unit:units(id,name,code)');
      if (filters.unitId && filters.unitId !== 'all') q = q.eq('unit_id', filters.unitId);
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters.roomType && filters.roomType !== 'all') q = q.eq('room_type', filters.roomType);
      if (filters.search) q = q.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      const { data, error } = await q.order('code').limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRoom(id?: string) {
  return useQuery({
    queryKey: ['room', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('rooms').select('*, unit:units(id,name,code)').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: any }) => {
      if (id) {
        const { data, error } = await supabase.from('rooms').update(values).eq('id', id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from('rooms').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rooms'] }); qc.invalidateQueries({ queryKey: ['room'] }); },
  });
}

export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rooms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  });
}

// ---------- Reservations ----------
export interface ReservationFilters {
  roomId?: string;
  status?: string;
  from?: string; // ISO
  to?: string;   // ISO
  requesterId?: string;
  search?: string;
}

export function useReservations(filters: ReservationFilters = {}) {
  return useQuery({
    queryKey: ['reservations', filters],
    queryFn: async () => {
      let q = supabase.from('room_reservations').select(
        '*, room:rooms(id,name,code,room_type,capacity,unit_id), unit:units(id,name,code), requester:profiles!room_reservations_requester_id_fkey(id,full_name,email)'
      );
      if (filters.roomId && filters.roomId !== 'all') q = q.eq('room_id', filters.roomId);
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters.requesterId) q = q.eq('requester_id', filters.requesterId);
      if (filters.from) q = q.gte('start_datetime', filters.from);
      if (filters.to) q = q.lte('start_datetime', filters.to);
      if (filters.search) q = q.ilike('title', `%${filters.search}%`);
      const { data, error } = await q.order('start_datetime', { ascending: true }).limit(500);
      if (error) {
        // Fallback caso a FK profile não exista com esse nome
        let q2 = supabase.from('room_reservations').select('*, room:rooms(id,name,code,room_type,capacity,unit_id), unit:units(id,name,code)');
        if (filters.roomId && filters.roomId !== 'all') q2 = q2.eq('room_id', filters.roomId);
        if (filters.status && filters.status !== 'all') q2 = q2.eq('status', filters.status);
        if (filters.requesterId) q2 = q2.eq('requester_id', filters.requesterId);
        if (filters.from) q2 = q2.gte('start_datetime', filters.from);
        if (filters.to) q2 = q2.lte('start_datetime', filters.to);
        if (filters.search) q2 = q2.ilike('title', `%${filters.search}%`);
        const { data: d2, error: e2 } = await q2.order('start_datetime', { ascending: true }).limit(500);
        if (e2) throw e2;
        return d2 ?? [];
      }
      return data ?? [];
    },
  });
}

export function useRoomAgenda(roomId?: string, weekStart?: Date) {
  const from = weekStart ? new Date(weekStart) : undefined;
  const to = weekStart ? new Date(weekStart) : undefined;
  if (to) to.setDate(to.getDate() + 7);
  return useQuery({
    queryKey: ['room-agenda', roomId, from?.toISOString(), to?.toISOString()],
    enabled: !!roomId && !!from && !!to,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_reservations')
        .select('*')
        .eq('room_id', roomId!)
        .gte('start_datetime', from!.toISOString())
        .lt('start_datetime', to!.toISOString())
        .in('status', ['solicitada', 'aprovada'])
        .order('start_datetime');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyReservations(userId?: string) {
  return useQuery({
    queryKey: ['my-reservations', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_reservations')
        .select('*, room:rooms(id,name,code,room_type,unit_id), unit:units(id,name,code)')
        .eq('requester_id', userId!)
        .order('start_datetime', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

async function fetchConflicts(roomId: string, startISO: string, endISO: string, excludeId?: string) {
  let q = supabase
    .from('room_reservations')
    .select('id, title, start_datetime, end_datetime, status')
    .eq('room_id', roomId)
    .in('status', ['solicitada', 'aprovada'])
    .lt('start_datetime', endISO)
    .gt('end_datetime', startISO);
  if (excludeId) q = q.neq('id', excludeId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).filter((r: any) => overlaps(r.start_datetime, r.end_datetime, startISO, endISO));
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const conflicts = await fetchConflicts(values.room_id, values.start_datetime, values.end_datetime);
      if (conflicts.length > 0) {
        throw new Error('Já existe reserva neste horário para esta sala.');
      }
      const { data, error } = await supabase.from('room_reservations').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['room-agenda'] });
      qc.invalidateQueries({ queryKey: ['my-reservations'] });
    },
  });
}

export function useUpdateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: any }) => {
      if (values.start_datetime && values.end_datetime && values.room_id) {
        const conflicts = await fetchConflicts(values.room_id, values.start_datetime, values.end_datetime, id);
        if (conflicts.length > 0) throw new Error('Já existe reserva neste horário para esta sala.');
      }
      const { data, error } = await supabase.from('room_reservations').update(values).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['room-agenda'] });
      qc.invalidateQueries({ queryKey: ['my-reservations'] });
    },
  });
}

export function useApproveReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, approverId, notes }: { id: string; approverId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('room_reservations')
        .update({ status: 'aprovada', approved_by: approverId, approval_notes: notes ?? null })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['room-agenda'] });
      qc.invalidateQueries({ queryKey: ['my-reservations'] });
    },
  });
}

export function useRejectReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, approverId, notes }: { id: string; approverId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('room_reservations')
        .update({ status: 'rejeitada', approved_by: approverId, approval_notes: notes ?? null })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['room-agenda'] });
      qc.invalidateQueries({ queryKey: ['my-reservations'] });
    },
  });
}

export function useCancelReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('room_reservations')
        .update({ status: 'cancelada' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['room-agenda'] });
      qc.invalidateQueries({ queryKey: ['my-reservations'] });
    },
  });
}

export function useDeleteReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('room_reservations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['room-agenda'] });
    },
  });
}
