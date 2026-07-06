import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ===== fiscal_settings =====
export function useFiscalSettings() {
  return useQuery({
    queryKey: ["fiscal_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fiscal_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertFiscalSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: u } = await supabase.auth.getUser();
      const { data: org } = await supabase.rpc("get_user_organization_id");
      const row = { ...payload, organization_id: org, created_by: u.user?.id };
      const { data, error } = await supabase
        .from("fiscal_settings")
        .upsert(row, { onConflict: "organization_id" })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fiscal_settings"] });
      toast.success("Configurações fiscais salvas");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ===== product_fiscal_data =====
export function useProductFiscalData(productId: string | undefined) {
  return useQuery({
    enabled: !!productId,
    queryKey: ["product_fiscal_data", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_fiscal_data")
        .select("*")
        .eq("product_id", productId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertProductFiscalData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: org } = await supabase.rpc("get_user_organization_id");
      const { data, error } = await supabase
        .from("product_fiscal_data")
        .upsert({ ...payload, organization_id: org }, { onConflict: "product_id" })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars: any) => {
      qc.invalidateQueries({ queryKey: ["product_fiscal_data", vars.product_id] });
      toast.success("Dados fiscais do produto salvos");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// customer_fiscal_data removed (sales module retired)
export function useFiscalInvoices(filters?: { status?: string; modelo?: string }) {
  return useQuery({
    queryKey: ["fiscal_invoices", filters],
    queryFn: async () => {
      let q = supabase.from("fiscal_invoices").select("*").order("created_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status as any);
      if (filters?.modelo) q = q.eq("modelo", filters.modelo as any);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFiscalInvoice(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ["fiscal_invoice", id],
    queryFn: async () => {
      const [{ data: inv, error: e1 }, { data: items, error: e2 }, { data: events, error: e3 }] =
        await Promise.all([
          supabase.from("fiscal_invoices").select("*").eq("id", id!).maybeSingle(),
          supabase.from("fiscal_invoice_items").select("*").eq("fiscal_invoice_id", id!).order("numero_item"),
          supabase.from("fiscal_events").select("*").eq("fiscal_invoice_id", id!).order("created_at", { ascending: false }),
        ]);
      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;
      return { invoice: inv, items: items ?? [], events: events ?? [] };
    },
  });
}

export function useEmitFiscalInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { referencia_tipo: string; referencia_id: string; modelo: "55" | "65" }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Sessão expirada");
      const { data, error } = await supabase.functions.invoke("fiscal-emit-invoice", { body: payload });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fiscal_invoices"] });
      toast.success("Nota fiscal enviada para emissão");
    },
    onError: (e: any) => toast.error("Erro ao emitir nota: " + e.message),
  });
}

export function useCancelFiscalInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { data, error } = await supabase.rpc("cancel_fiscal_invoice", { _id: id, _motivo: motivo });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fiscal_invoices"] });
      qc.invalidateQueries({ queryKey: ["fiscal_invoice"] });
      toast.success("Nota cancelada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// sales_returns removed (sales module retired)
export function usePurchaseReturns() {
  return useQuery({
    queryKey: ["purchase_returns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_returns")
        .select("*, purchase_orders(numero)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProcessPurchaseReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("process_purchase_return", { _return_id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase_returns"] });
      toast.success("Devolução processada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ===== Status check & email =====
export function useCheckFiscalStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Sessão expirada");
      const { data, error } = await supabase.functions.invoke("fiscal-check-status", { body: { fiscal_invoice_id: id } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fiscal_invoice"] });
      qc.invalidateQueries({ queryKey: ["fiscal_invoices"] });
      toast.success("Status atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSendFiscalEmail() {
  return useMutation({
    mutationFn: async ({ id, email }: { id: string; email?: string }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Sessão expirada");
      const { data, error } = await supabase.functions.invoke("send-fiscal-email", { body: { fiscal_invoice_id: id, email } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success("E-mail enviado"),
    onError: (e: any) => toast.error(e.message),
  });
}

// ===== purchase returns - create =====
export function useCreatePurchaseReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { purchase_order_id: string; motivo: string; items: any[] }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data: org } = await supabase.rpc("get_user_organization_id");
      const { data: ret, error } = await supabase
        .from("purchase_returns")
        .insert({
          organization_id: org,
          created_by: u.user?.id,
          purchase_order_id: payload.purchase_order_id,
          motivo: payload.motivo,
        })
        .select()
        .single();
      if (error) throw error;
      if (payload.items.length) {
        const items = payload.items.map((i) => ({ ...i, organization_id: org, purchase_return_id: ret.id }));
        const { error: e2 } = await supabase.from("purchase_return_items").insert(items);
        if (e2) throw e2;
      }
      return ret;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase_returns"] });
      toast.success("Devolução de compra criada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
