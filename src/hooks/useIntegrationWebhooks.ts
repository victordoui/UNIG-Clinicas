import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface IntegrationWebhook {
  id: string;
  organization_id: string;
  nome: string;
  url: string;
  evento: string;
  headers: Record<string, string>;
  secret: string | null;
  ativo: boolean;
  ultima_chamada: string | null;
  ultimo_status: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrationLog {
  id: string;
  webhook_id: string | null;
  evento: string;
  payload: any;
  status_http: number | null;
  resposta: string | null;
  tentativa: number;
  created_at: string;
}

export const WEBHOOK_EVENTS = [
  { value: 'pedido.emitido', label: 'Pedido emitido' },
  { value: 'recebimento.confirmado', label: 'Recebimento confirmado' },
  { value: 'pagamento.registrado', label: 'Pagamento registrado' },
];

export function useIntegrationWebhooks() {
  return useQuery({
    queryKey: ['integration_webhooks'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('integration_webhooks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as IntegrationWebhook[];
    },
  });
}

export function useIntegrationLogs(webhookId?: string) {
  return useQuery({
    queryKey: ['integration_logs', webhookId],
    queryFn: async () => {
      let q = (supabase as any)
        .from('integration_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (webhookId) q = q.eq('webhook_id', webhookId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as IntegrationLog[];
    },
  });
}

export function useSaveWebhook() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user, organization } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<IntegrationWebhook> & { id?: string }) => {
      const orgId = organization?.organization_id;
      if (!orgId || !user) throw new Error('Sessão inválida');
      if (input.id) {
        const { error } = await (supabase as any)
          .from('integration_webhooks')
          .update({
            nome: input.nome,
            url: input.url,
            evento: input.evento,
            ativo: input.ativo ?? true,
            secret: input.secret ?? null,
            headers: input.headers ?? {},
          })
          .eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('integration_webhooks').insert({
          organization_id: orgId,
          created_by: user.id,
          nome: input.nome!,
          url: input.url!,
          evento: input.evento!,
          ativo: input.ativo ?? true,
          secret: input.secret ?? null,
          headers: input.headers ?? {},
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integration_webhooks'] });
      toast({ title: 'Webhook salvo' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('integration_webhooks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integration_webhooks'] });
      toast({ title: 'Webhook removido' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
