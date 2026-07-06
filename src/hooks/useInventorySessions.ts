import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface InventorySession {
  id: string;
  organization_id: string;
  nome: string;
  tipo: "total" | "ciclico" | "amostragem";
  status: "aberta" | "em_contagem" | "fechada";
  escopo: any;
  iniciada_em: string | null;
  fechada_em: string | null;
  fechada_por: string | null;
  created_by: string;
  created_at: string;
}

export interface InventoryCount {
  id: string;
  session_id: string;
  organization_id: string;
  product_id: string;
  contado: number;
  sistema: number;
  divergencia: number;
  observacao: string | null;
  contado_por: string;
  contado_em: string;
  product?: { name: string; sku: string; current_stock: number };
}

export function useInventorySessions() {
  return useQuery({
    queryKey: ["inventory_sessions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inventory_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InventorySession[];
    },
  });
}

export function useInventorySession(id: string | undefined) {
  return useQuery({
    queryKey: ["inventory_session", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inventory_sessions")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as InventorySession;
    },
  });
}

export function useInventoryCounts(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["inventory_counts", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inventory_counts")
        .select("*, product:products(name, sku, current_stock)")
        .eq("session_id", sessionId)
        .order("contado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InventoryCount[];
    },
  });
}

export function useCreateInventorySession() {
  const qc = useQueryClient();
  const { user, organization } = useAuth();
  return useMutation({
    mutationFn: async ({ nome, tipo, escopo }: { nome: string; tipo: string; escopo?: any }) => {
      if (!user || !organization) throw new Error("Sem sessão");
      const { data, error } = await (supabase as any)
        .from("inventory_sessions")
        .insert({
          organization_id: organization.organization_id,
          created_by: user.id,
          nome,
          tipo,
          escopo: escopo ?? {},
          iniciada_em: new Date().toISOString(),
          status: "em_contagem",
        })
        .select()
        .single();
      if (error) throw error;
      return data as InventorySession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory_sessions"] });
      toast.success("Sessão de inventário criada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAddInventoryCount(sessionId: string) {
  const qc = useQueryClient();
  const { user, organization } = useAuth();
  return useMutation({
    mutationFn: async ({
      product_id,
      contado,
      sistema,
      observacao,
    }: {
      product_id: string;
      contado: number;
      sistema: number;
      observacao?: string;
    }) => {
      if (!user || !organization) throw new Error("Sem sessão");
      const { error } = await (supabase as any).from("inventory_counts").insert({
        session_id: sessionId,
        organization_id: organization.organization_id,
        product_id,
        contado,
        sistema,
        observacao,
        contado_por: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory_counts", sessionId] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCloseInventorySession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await (supabase as any).rpc("close_inventory_session", {
        _session_id: sessionId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["inventory_sessions"] });
      qc.invalidateQueries({ queryKey: ["inventory_counts"] });
      toast.success(`Sessão fechada — ${data?.ajustes ?? 0} ajustes aplicados`);
    },
    onError: (e: any) => toast.error(e.message),
  });
}
