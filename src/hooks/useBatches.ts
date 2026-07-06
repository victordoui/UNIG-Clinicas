import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useBatches(filters: { vencendoEmDias?: number; productId?: string } = {}) {
  return useQuery({
    queryKey: ["product_batches", filters],
    queryFn: async () => {
      let q = supabase
        .from("product_batches" as any)
        .select("*, products(name, sku)")
        .order("validade", { ascending: true, nullsFirst: false });
      if (filters.productId) q = q.eq("product_id", filters.productId);
      if (filters.vencendoEmDias) {
        const limite = new Date();
        limite.setDate(limite.getDate() + filters.vencendoEmDias);
        q = q.lte("validade", limite.toISOString().slice(0, 10));
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertBatch() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: org } = await supabase.rpc("get_user_organization_id");
      const row = {
        ...payload,
        organization_id: org,
        created_by: payload.id ? undefined : profile?.id,
      };
      const { data, error } = await supabase
        .from("product_batches" as any)
        .upsert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product_batches"] });
      toast.success("Lote salvo");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
}
