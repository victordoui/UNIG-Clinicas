import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SupplierInvitation {
  id: string;
  organization_id: string;
  email: string;
  nome_empresa: string | null;
  cnpj: string | null;
  tipo_fornecedor: string;
  categoria_esperada: string | null;
  observacao_interna: string | null;
  token: string;
  expires_at: string;
  status: "pendente" | "usado" | "expirado" | "cancelado";
  used_at: string | null;
  used_by_user_id: string | null;
  supplier_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useSupplierInvitations() {
  const { organization } = useAuth();
  const orgId = organization?.organization_id;
  return useQuery({
    queryKey: ["supplier-invitations", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      let query = (supabase as any)
        .from("supplier_invitations")
        .select("*")
        .order("created_at", { ascending: false });
      if (orgId) query = query.eq("organization_id", orgId);
      const { data, error } = await query;
      if (error) throw error;
      const now = Date.now();
      return (data ?? []).map((d: SupplierInvitation) =>
        d.status === "pendente" && new Date(d.expires_at).getTime() < now
          ? { ...d, status: "expirado" as const }
          : d
      ) as SupplierInvitation[];
    },
  });
}


async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Sessão expirada");
}

export function useCreateSupplierInvitation() {
  const qc = useQueryClient();
  const { organization } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      email: string;
      nome_empresa?: string;
      cnpj?: string;
      tipo_fornecedor: "produto" | "servico" | "ambos";
      categoria_esperada?: string;
      observacao_interna?: string;
      validade_dias?: number;
    }) => {
      await ensureSession();
      const { data, error } = await supabase.functions.invoke("create-supplier-invitation", {
        body: { ...input, organization_id: organization?.organization_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { invitation: SupplierInvitation; link: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier-invitations"] }),
  });
}

export function useResendSupplierInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { invitation_id: string; validade_dias?: number }) => {
      await ensureSession();
      const { data, error } = await supabase.functions.invoke("resend-supplier-invitation", { body: input });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { invitation: SupplierInvitation; link: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier-invitations"] }),
  });
}

export function useCancelSupplierInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invitation_id: string) => {
      await ensureSession();
      const { data, error } = await supabase.functions.invoke("cancel-supplier-invitation", {
        body: { invitation_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier-invitations"] }),
  });
}

export function buildInvitationLink(token: string) {
  return `${window.location.origin}/convite-fornecedor/${token}`;
}
