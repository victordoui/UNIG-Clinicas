import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function useActiveCart() {
  const { organization, user } = useAuth();
  const orgId = organization?.organization_id;
  return useQuery({
    queryKey: ['requester_cart_active', orgId, user?.id],
    enabled: !!orgId && !!user,
    queryFn: async () => {
      const { data: cart } = await (supabase as any)
        .from('requester_carts').select('*')
        .eq('organization_id', orgId).eq('user_id', user!.id).eq('status', 'rascunho')
        .maybeSingle();
      let cartRow = cart;
      if (!cartRow) {
        const { data, error } = await (supabase as any).from('requester_carts')
          .insert({ organization_id: orgId, user_id: user!.id, status: 'rascunho' })
          .select().single();
        if (error) throw error;
        cartRow = data;
      }
      const { data: items } = await (supabase as any)
        .from('requester_cart_items').select('*, products(name, sku, current_stock)')
        .eq('cart_id', cartRow.id).order('created_at');
      return { cart: cartRow, items: items ?? [] };
    },
  });
}

export function useCartActions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { organization, user } = useAuth();
  const orgId = organization?.organization_id;

  const addItem = useMutation({
    mutationFn: async ({ cartId, product }: { cartId: string; product: any }) => {
      if (!orgId) throw new Error('Sem organização');
      const { error } = await (supabase as any).from('requester_cart_items').insert({
        cart_id: cartId, organization_id: orgId,
        product_id: product.id, descricao: product.name, quantidade: 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requester_cart_active'] });
      toast({ title: 'Item adicionado ao carrinho' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, quantidade, observacao }: { id: string; quantidade?: number; observacao?: string }) => {
      const patch: any = {};
      if (quantidade !== undefined) patch.quantidade = quantidade;
      if (observacao !== undefined) patch.observacao = observacao;
      const { error } = await (supabase as any).from('requester_cart_items').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requester_cart_active'] }),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('requester_cart_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requester_cart_active'] }),
  });

  const updateCart = useMutation({
    mutationFn: async ({ cartId, patch }: { cartId: string; patch: any }) => {
      const { error } = await (supabase as any).from('requester_carts').update(patch).eq('id', cartId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requester_cart_active'] }),
  });

  const checkout = useMutation({
    mutationFn: async ({ cart, items }: { cart: any; items: any[] }) => {
      if (!orgId || !user) throw new Error('Sem organização');
      if (!items.length) throw new Error('Carrinho vazio');
      // Cria uma purchase_request consolidada com a descrição do primeiro item;
      // como purchase_requests é single-item no schema atual, agregamos descrição.
      const descricao = items.length === 1
        ? items[0].descricao
        : `${items[0].descricao} e mais ${items.length - 1} ${items.length === 2 ? 'item' : 'itens'}`;
      const qtdTotal = items.reduce((s, i) => s + Number(i.quantidade || 0), 0);
      const numero = `REQ-${Date.now()}`;
      const { data: req, error } = await (supabase as any).from('purchase_requests')
        .insert({
          organization_id: orgId, solicitante_id: user.id,
          numero, prioridade: 'media', categoria: 'material',
          item_descricao: descricao, quantidade: qtdTotal,
          justificativa: cart.justificativa ?? 'Solicitação via portal',
          cost_center_id: cart.cost_center_id ?? null,
          prazo_desejado: cart.prazo_desejado ?? null,
          observacoes: items.map((i) => `• ${i.descricao} — qtd ${i.quantidade}${i.observacao ? ` (${i.observacao})` : ''}`).join('\n'),
          status: 'pendente',
        })
        .select().single();
      if (error) throw error;
      const { error: e2 } = await (supabase as any).from('requester_carts')
        .update({ status: 'enviado', request_id: req.id, enviado_em: new Date().toISOString() })
        .eq('id', cart.id);
      if (e2) throw e2;
      return req;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requester_cart_active'] });
      toast({ title: 'Solicitação enviada com sucesso' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { addItem, updateItem, removeItem, updateCart, checkout };
}
