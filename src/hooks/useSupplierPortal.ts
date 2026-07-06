import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_DOCUMENT_TEMPLATES } from "@/lib/supplierLabels";

/* ------------------------------------------------------------- */
/* useMySupplier — fornecedor logado, cadastro completo           */
/* ------------------------------------------------------------- */
export function useMySupplier() {
  const { supplierLink } = useAuth();
  return useQuery({
    queryKey: ["my-supplier", supplierLink?.supplier_id],
    enabled: !!supplierLink?.supplier_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", supplierLink!.supplier_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateMySupplier() {
  const qc = useQueryClient();
  const { supplierLink } = useAuth();
  return useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      if (!supplierLink) throw new Error("Sem vínculo de fornecedor");
      const { error } = await supabase
        .from("suppliers")
        .update(patch as any)
        .eq("id", supplierLink.supplier_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-supplier"] }),
  });
}

/* ------------------------------------------------------------- */
/* Documentos                                                    */
/* ------------------------------------------------------------- */
export function useSupplierDocuments() {
  const { supplierLink } = useAuth();
  return useQuery({
    queryKey: ["supplier-documents", supplierLink?.supplier_id],
    enabled: !!supplierLink?.supplier_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_documents")
        .select("*")
        .eq("supplier_id", supplierLink!.supplier_id)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Garante que todos os templates obrigatórios apareçam (mesmo sem registro)
      const byTipo = new Map((data ?? []).map((d: any) => [d.tipo, d]));
      const merged = DEFAULT_DOCUMENT_TEMPLATES.map((t) => {
        const existing = byTipo.get(t.tipo);
        if (existing) return { ...existing, _template: t };
        return {
          id: null,
          tipo: t.tipo,
          nome: t.nome,
          obrigatorio: t.obrigatorio,
          status: "nao_enviado" as const,
          file_path: null,
          file_name: null,
          validade: null,
          observacao_analise: null,
          enviado_em: null,
          _template: t,
        };
      });
      // adiciona quaisquer docs extras (não em templates)
      (data ?? []).forEach((d: any) => {
        if (!DEFAULT_DOCUMENT_TEMPLATES.find((t) => t.tipo === d.tipo)) {
          merged.push({ ...d, _template: null });
        }
      });
      return merged;
    },
  });
}

export function useUploadSupplierDocument() {
  const qc = useQueryClient();
  const { supplierLink } = useAuth();
  return useMutation({
    mutationFn: async (args: {
      tipo: string;
      nome: string;
      obrigatorio: boolean;
      file: File;
      validade?: string | null;
    }) => {
      if (!supplierLink) throw new Error("Sem vínculo de fornecedor");
      const ext = args.file.name.split(".").pop() || "bin";
      const path = `${supplierLink.supplier_id}/${args.tipo}-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("supplier-docs").upload(path, args.file, {
        upsert: true,
        contentType: args.file.type || "application/octet-stream",
      });
      if (up.error) throw up.error;

      const { data: user } = await supabase.auth.getUser();
      const payload = {
        supplier_id: supplierLink.supplier_id,
        organization_id: supplierLink.organization_id,
        tipo: args.tipo,
        nome: args.nome,
        obrigatorio: args.obrigatorio,
        file_path: path,
        file_name: args.file.name,
        validade: args.validade || null,
        status: "enviado" as const,
        enviado_em: new Date().toISOString(),
        enviado_por: user.user?.id,
      };

      const { data: existing } = await supabase
        .from("supplier_documents")
        .select("id")
        .eq("supplier_id", supplierLink.supplier_id)
        .eq("tipo", args.tipo)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from("supplier_documents")
          .update({ ...payload, status: "enviado" })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("supplier_documents").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier-documents"] }),
  });
}

export async function getSupplierDocSignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("supplier-docs")
    .createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}

/* ------------------------------------------------------------- */
/* Notas fiscais do fornecedor                                   */
/* ------------------------------------------------------------- */
export function useSupplierInvoices() {
  const { supplierLink } = useAuth();
  return useQuery({
    queryKey: ["supplier-invoices", supplierLink?.supplier_id],
    enabled: !!supplierLink?.supplier_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_invoices")
        .select("*, purchase_orders(numero)")
        .eq("supplier_id", supplierLink!.supplier_id)
        .order("enviado_em", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUploadSupplierInvoice() {
  const qc = useQueryClient();
  const { supplierLink } = useAuth();
  return useMutation({
    mutationFn: async (args: {
      purchase_order_id?: string | null;
      numero_nf: string;
      serie?: string;
      valor: number;
      file: File;
      chave_acesso?: string;
      observacao?: string;
    }) => {
      if (!supplierLink) throw new Error("Sem vínculo de fornecedor");
      const ext = args.file.name.split(".").pop() || "pdf";
      const path = `${supplierLink.supplier_id}/nf-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("supplier-invoices").upload(path, args.file, {
        upsert: false,
        contentType: args.file.type || "application/pdf",
      });
      if (up.error) throw up.error;

      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("supplier_invoices").insert({
        supplier_id: supplierLink.supplier_id,
        organization_id: supplierLink.organization_id,
        purchase_order_id: args.purchase_order_id || null,
        numero_nf: args.numero_nf,
        serie: args.serie || null,
        valor: args.valor,
        file_path: path,
        file_name: args.file.name,
        chave_acesso: args.chave_acesso || null,
        observacao: args.observacao || null,
        status: "enviada",
        enviado_por: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier-invoices"] }),
  });
}

export async function getSupplierInvoiceSignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("supplier-invoices")
    .createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}

/* ------------------------------------------------------------- */
/* Bank accounts                                                 */
/* ------------------------------------------------------------- */
export function useSupplierBankAccounts() {
  const { supplierLink } = useAuth();
  return useQuery({
    queryKey: ["supplier-banks", supplierLink?.supplier_id],
    enabled: !!supplierLink?.supplier_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_bank_accounts")
        .select("*")
        .eq("supplier_id", supplierLink!.supplier_id);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ------------------------------------------------------------- */
/* Solicitações de alteração (campos críticos)                   */
/* ------------------------------------------------------------- */
export function useSupplierChangeRequests() {
  const { supplierLink } = useAuth();
  return useQuery({
    queryKey: ["supplier-changes", supplierLink?.supplier_id],
    enabled: !!supplierLink?.supplier_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_change_requests")
        .select("*")
        .eq("supplier_id", supplierLink!.supplier_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateChangeRequest() {
  const qc = useQueryClient();
  const { supplierLink } = useAuth();
  return useMutation({
    mutationFn: async (args: { campo: string; valor_antigo: any; valor_novo: any; justificativa?: string }) => {
      if (!supplierLink) throw new Error("Sem vínculo");
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("supplier_change_requests").insert({
        supplier_id: supplierLink.supplier_id,
        organization_id: supplierLink.organization_id,
        campo: args.campo,
        valor_antigo: args.valor_antigo,
        valor_novo: args.valor_novo,
        justificativa: args.justificativa || null,
        requested_by: user.user!.id,
        status: "pendente",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier-changes"] }),
  });
}

/* ------------------------------------------------------------- */
/* Pendências agregadas para o dashboard                         */
/* ------------------------------------------------------------- */
export function useSupplierPendencias() {
  const { data: supplier } = useMySupplier();
  const { data: docs = [] } = useSupplierDocuments();
  const { data: invoices = [] } = useSupplierInvoices();

  const today = new Date();
  const docsVencidos = docs.filter((d: any) => {
    if (d.status === "vencido") return true;
    if (d.validade && new Date(d.validade) < today) return true;
    return false;
  }).length;
  const docsPendentes = docs.filter(
    (d: any) => d.obrigatorio && (d.status === "nao_enviado" || d.status === "reprovado")
  ).length;
  const nfsRecusadas = invoices.filter((i: any) => i.status === "recusada").length;
  const cadastroPendente =
    supplier?.status === "pendente_correcao" || supplier?.status === "rascunho";

  const total = docsVencidos + docsPendentes + nfsRecusadas + (cadastroPendente ? 1 : 0);
  return { total, docsVencidos, docsPendentes, nfsRecusadas, cadastroPendente, supplier };
}
