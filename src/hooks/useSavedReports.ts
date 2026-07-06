import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type ReportTipo = "estoque" | "compras" | "financeiro" | "fornecedores" | "consumo";

export interface SavedReport {
  id: string;
  organization_id: string;
  nome: string;
  tipo: ReportTipo;
  filtros: Record<string, any>;
  colunas: string[];
  agendamento: { frequencia?: string; emails?: string[] } | null;
  ultima_execucao: string | null;
  created_by: string;
  created_at: string;
}

export function useSavedReports() {
  return useQuery({
    queryKey: ["saved_reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SavedReport[];
    },
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  const { user, organization } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      nome: string;
      tipo: ReportTipo;
      filtros?: Record<string, any>;
      colunas?: string[];
      agendamento?: { frequencia: string; emails: string[] } | null;
    }) => {
      if (!user || !organization) throw new Error("Sem sessão");
      const { error } = await supabase.from("saved_reports").insert({
        organization_id: organization.organization_id,
        created_by: user.id,
        nome: input.nome,
        tipo: input.tipo,
        filtros: input.filtros ?? {},
        colunas: input.colunas ?? [],
        agendamento: input.agendamento ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved_reports"] });
      toast.success("Relatório salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, data } = await supabase.from("saved_reports").delete().eq("id", id).select();
      if (error) throw error;
      if (!data?.length) throw new Error("Sem permissão para excluir");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved_reports"] });
      toast.success("Excluído");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRunReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("saved_reports")
        .update({ ultima_execucao: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved_reports"] });
      toast.success("Relatório executado");
    },
  });
}
