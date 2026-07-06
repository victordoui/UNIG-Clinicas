import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useTransfers(filters: { status?: string } = {}) {
  return useQuery({
    queryKey: ["stock_transfers", filters],
    queryFn: async () => {
      let q = supabase
        .from("stock_transfers" as any)
        .select("*, origem:warehouses!stock_transfers_origem_id_fkey(nome), destino:warehouses!stock_transfers_destino_id_fkey(nome)")
        .order("created_at", { ascending: false });
      if (filters.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTransfer(id?: string) {
  return useQuery({
    queryKey: ["stock_transfer", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_transfers" as any)
        .select("*, origem:warehouses!stock_transfers_origem_id_fkey(nome), destino:warehouses!stock_transfers_destino_id_fkey(nome), items:stock_transfer_items(*, products(name, sku))")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (payload: { origem_id: string; destino_id: string; observacao?: string; items: { product_id: string; quantidade_enviada: number; batch_id?: string | null }[] }) => {
      const { data: org } = await supabase.rpc("get_user_organization_id");
      const { data: t, error } = await supabase
        .from("stock_transfers" as any)
        .insert({
          organization_id: org,
          origem_id: payload.origem_id,
          destino_id: payload.destino_id,
          observacao: payload.observacao,
          created_by: profile?.id,
        })
        .select()
        .single();
      if (error) throw error;
      const transfer: any = t;
      if (payload.items.length) {
        const { error: e2 } = await supabase.from("stock_transfer_items" as any).insert(
          payload.items.map((it) => ({
            organization_id: org,
            transfer_id: transfer.id,
            product_id: it.product_id,
            batch_id: it.batch_id ?? null,
            quantidade_enviada: it.quantidade_enviada,
          }))
        );
        if (e2) throw e2;
      }
      return transfer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock_transfers"] });
      toast.success("Transferência criada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar"),
  });
}

export function useSendTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("transfer_send" as any, { _transfer_id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock_transfers"] });
      qc.invalidateQueries({ queryKey: ["stock_transfer"] });
      toast.success("Transferência enviada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao enviar"),
  });
}

export function useReceiveTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, items }: { id: string; items: Record<string, { quantidade_recebida: number }> }) => {
      const { data, error } = await supabase.rpc("transfer_receive" as any, { _transfer_id: id, _items: items });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock_transfers"] });
      qc.invalidateQueries({ queryKey: ["stock_transfer"] });
      toast.success("Transferência recebida");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao receber"),
  });
}
