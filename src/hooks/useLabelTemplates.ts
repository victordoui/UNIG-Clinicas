import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface LabelTemplate {
  id: string;
  organization_id: string;
  nome: string;
  largura_mm: number;
  altura_mm: number;
  layout: { campos?: string[] };
  padrao: boolean;
  created_by: string;
  created_at: string;
}

export function useLabelTemplates() {
  return useQuery({
    queryKey: ["label_templates"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("label_templates")
        .select("*")
        .order("padrao", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LabelTemplate[];
    },
  });
}

export function useCreateLabelTemplate() {
  const qc = useQueryClient();
  const { user, organization } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      nome: string;
      largura_mm: number;
      altura_mm: number;
      campos: string[];
      padrao?: boolean;
    }) => {
      if (!user || !organization) throw new Error("Sem sessão");
      const { error } = await (supabase as any).from("label_templates").insert({
        organization_id: organization.organization_id,
        created_by: user.id,
        nome: input.nome,
        largura_mm: input.largura_mm,
        altura_mm: input.altura_mm,
        layout: { campos: input.campos },
        padrao: input.padrao ?? false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["label_templates"] });
      toast.success("Template criado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
