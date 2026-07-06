import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Warehouse {
  id: string;
  organization_id: string;
  nome: string;
  codigo: string | null;
  tipo: string;
  endereco: any;
  ativo: boolean;
  padrao: boolean;
  created_at: string;
  updated_at: string;
}

export function useWarehouses() {
  return useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses" as any)
        .select("*")
        .order("padrao", { ascending: false })
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as Warehouse[];
    },
  });
}

export function useUpsertWarehouse() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (payload: Partial<Warehouse> & { nome: string }) => {
      const { data: org } = await supabase.rpc("get_user_organization_id");
      const row: any = {
        ...payload,
        organization_id: org,
        created_by: payload.id ? undefined : profile?.id,
      };
      const { data, error } = await supabase
        .from("warehouses" as any)
        .upsert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("Local salvo");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
}

export function useDeleteWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, data } = await supabase
        .from("warehouses" as any)
        .delete()
        .eq("id", id)
        .select();
      if (error) throw error;
      if (!data?.length) throw new Error("Sem permissão para remover");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("Local removido");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });
}

export function useStockByLocation(productId?: string) {
  return useQuery({
    queryKey: ["stock_by_location", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_stock_by_location" as any)
        .select("*, warehouses(nome, codigo)")
        .eq("product_id", productId);
      if (error) throw error;
      return data ?? [];
    },
  });
}
