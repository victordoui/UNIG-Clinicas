import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type InsightStatus = "novo" | "visto" | "acionado" | "descartado";
export type InsightTipo = "anomalia" | "tendencia" | "oportunidade" | "risco";
export type InsightSeveridade = "baixa" | "media" | "alta";

export interface AIInsight {
  id: string;
  organization_id: string;
  tipo: InsightTipo;
  titulo: string;
  descricao: string;
  severidade: InsightSeveridade;
  entidade: string | null;
  entidade_id: string | null;
  dados: Record<string, any>;
  status: InsightStatus;
  gerado_em: string;
  decidido_por: string | null;
  decidido_em: string | null;
}

export function useAIInsights(filters?: { tipo?: InsightTipo; status?: InsightStatus }) {
  return useQuery({
    queryKey: ["ai_insights", filters],
    queryFn: async () => {
      let q = supabase.from("ai_insights").select("*").order("gerado_em", { ascending: false });
      if (filters?.tipo) q = q.eq("tipo", filters.tipo);
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AIInsight[];
    },
  });
}

export function useUpdateInsightStatus() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InsightStatus }) => {
      const { error } = await supabase
        .from("ai_insights")
        .update({ status, decidido_por: user?.id, decidido_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_insights"] });
      toast.success("Insight atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useGenerateInsights() {
  const qc = useQueryClient();
  const { organization } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!organization) throw new Error("Sem organização");
      const [a, b] = await Promise.all([
        supabase.rpc("detect_consumption_anomalies", { _org: organization.organization_id }),
        supabase.rpc("detect_budget_overruns", { _org: organization.organization_id }),
      ]);
      if (a.error) throw a.error;
      if (b.error) throw b.error;
      return (a.data ?? 0) + (b.data ?? 0);
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["ai_insights"] });
      toast.success(`${count} novos insights gerados`);
    },
    onError: (e: any) => toast.error(e.message),
  });
}
