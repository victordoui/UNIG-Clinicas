import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface PickingWave {
  id: string; organization_id: string; numero: string; data_onda: string;
  status: 'aberta' | 'separando' | 'concluida' | 'cancelada';
  separador_id: string | null; warehouse_id: string | null; observacoes: string | null;
  iniciada_em: string | null; concluida_em: string | null;
  created_at: string; updated_at: string;
}

export function usePickingWavesDashboard() {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ['picking_waves_dashboard', organization?.organization_id],
    enabled: !!organization?.organization_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_picking_waves_dashboard');
      if (error) throw error;
      return data?.[0] ?? { abertas: 0, separando: 0, concluidas_hoje: 0, itens_pendentes: 0 };
    },
  });
}

export function usePickingWaves(status?: string) {
  const { organization } = useAuth();
  const orgId = organization?.organization_id;
  return useQuery({
    queryKey: ['picking_waves', orgId, status],
    enabled: !!orgId,
    queryFn: async () => {
      let q = (supabase as any).from('picking_waves').select('*').eq('organization_id', orgId)
        .order('created_at', { ascending: false }).limit(200);
      if (status && status !== 'todos') q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PickingWave[];
    },
  });
}

export function usePickingWaveItems(waveId: string | null) {
  return useQuery({
    queryKey: ['picking_wave_items', waveId],
    enabled: !!waveId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('picking_wave_items').select('*, warehouse_zones(codigo, nome, rota)')
        .eq('wave_id', waveId).order('ordem_rota', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePickingWaveActions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { organization, user } = useAuth();
  const orgId = organization?.organization_id;

  const createWave = useMutation({
    mutationFn: async (input: { numero: string; warehouse_id?: string | null; observacoes?: string }) => {
      if (!orgId || !user) throw new Error('Sem organização');
      const { data, error } = await (supabase as any).from('picking_waves')
        .insert({ ...input, organization_id: orgId, created_by: user.id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Onda criada' });
      qc.invalidateQueries({ queryKey: ['picking_waves'] });
      qc.invalidateQueries({ queryKey: ['picking_waves_dashboard'] });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const addItem = useMutation({
    mutationFn: async (input: { wave_id: string; descricao: string; qtd_solicitada: number; product_id?: string; zone_id?: string | null; ordem_rota?: number }) => {
      if (!orgId || !user) throw new Error('Sem organização');
      const { error } = await (supabase as any).from('picking_wave_items')
        .insert({ ...input, organization_id: orgId, created_by: user.id });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['picking_wave_items', v.wave_id] });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { error } = await (supabase as any).from('picking_wave_items').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['picking_wave_items'] });
      qc.invalidateQueries({ queryKey: ['picking_waves_dashboard'] });
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PickingWave['status'] }) => {
      const patch: any = { status };
      if (status === 'separando') patch.iniciada_em = new Date().toISOString();
      if (status === 'concluida') patch.concluida_em = new Date().toISOString();
      const { error } = await (supabase as any).from('picking_waves').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['picking_waves'] });
      qc.invalidateQueries({ queryKey: ['picking_waves_dashboard'] });
      toast({ title: 'Status atualizado' });
    },
  });

  return { createWave, addItem, updateItem, setStatus };
}
