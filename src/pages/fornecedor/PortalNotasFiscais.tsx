import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Receipt, Upload, Eye, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useSupplierInvoices,
  useUploadSupplierInvoice,
  getSupplierInvoiceSignedUrl,
} from "@/hooks/useSupplierPortal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { INVOICE_STATUS_BADGE, INVOICE_STATUS_LABEL, type SupplierInvoiceStatus } from "@/lib/supplierLabels";
import { format } from "date-fns";

export default function PortalNotasFiscais() {
  const { data: invoices = [], isLoading } = useSupplierInvoices();
  const { supplierLink } = useAuth();
  const upload = useUploadSupplierInvoice();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    purchase_order_id: "",
    numero_nf: "",
    serie: "",
    valor: "",
    chave_acesso: "",
    observacao: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [refusal, setRefusal] = useState<any | null>(null);

  // Pedidos disponíveis para vincular NF (sem NF ou recusada)
  const { data: orders = [] } = useQuery({
    queryKey: ["supplier-orders-without-invoice", supplierLink?.supplier_id],
    enabled: !!supplierLink?.supplier_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id, numero, valor_total")
        .eq("supplier_id", supplierLink!.supplier_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleSubmit = async () => {
    if (!file || !form.numero_nf || !form.valor) {
      toast({ variant: "destructive", title: "Preencha os campos obrigatórios" });
      return;
    }
    try {
      await upload.mutateAsync({
        purchase_order_id: form.purchase_order_id || null,
        numero_nf: form.numero_nf,
        serie: form.serie || undefined,
        valor: Number(form.valor),
        file,
        chave_acesso: form.chave_acesso || undefined,
        observacao: form.observacao || undefined,
      });
      toast({ title: "Nota fiscal enviada" });
      setOpen(false); setFile(null);
      setForm({ purchase_order_id: "", numero_nf: "", serie: "", valor: "", chave_acesso: "", observacao: "" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  const view = async (path: string) => {
    try {
      const url = await getSupplierInvoiceSignedUrl(path);
      window.open(url, "_blank");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6" /> Notas fiscais</h1>
          <p className="text-sm text-muted-foreground">
            Envie e acompanhe a análise das notas fiscais vinculadas aos pedidos.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}><Upload className="h-4 w-4 mr-2" /> Enviar nova NF</Button>
      </header>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-center text-muted-foreground">Carregando…</p>
          ) : invoices.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">Nenhuma nota fiscal enviada ainda.</p>
          ) : (
            <div className="divide-y">
              {invoices.map((inv: any) => (
                <div key={inv.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">NF {inv.numero_nf}{inv.serie ? ` / ${inv.serie}` : ""}</p>
                      {inv.purchase_orders?.numero && (
                        <Badge variant="outline" className="text-[10px] font-mono">Pedido {inv.purchase_orders.numero}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-3">
                      <span>R$ {Number(inv.valor).toFixed(2)}</span>
                      <span>Enviada: {format(new Date(inv.enviado_em), "dd/MM/yyyy HH:mm")}</span>
                      {inv.motivo_recusa && (
                        <button onClick={() => setRefusal(inv)} className="text-red-600 hover:underline inline-flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> ver motivo da recusa
                        </button>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={INVOICE_STATUS_BADGE[inv.status as SupplierInvoiceStatus]}>
                    {INVOICE_STATUS_LABEL[inv.status as SupplierInvoiceStatus]}
                  </Badge>
                  <div className="flex gap-2">
                    {inv.file_path && (
                      <Button size="sm" variant="outline" onClick={() => view(inv.file_path)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Ver NF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar nota fiscal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Pedido vinculado (opcional)</Label>
              <Select value={form.purchase_order_id} onValueChange={(v) => setForm({ ...form, purchase_order_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione um pedido" /></SelectTrigger>
                <SelectContent>
                  {orders.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>{o.numero} — R$ {Number(o.valor_total ?? 0).toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Número da NF *</Label>
                <Input value={form.numero_nf} onChange={(e) => setForm({ ...form, numero_nf: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Série</Label>
                <Input value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$) *</Label>
              <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Chave de acesso (44 dígitos)</Label>
              <Input value={form.chave_acesso} onChange={(e) => setForm({ ...form, chave_acesso: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Arquivo (PDF) *</Label>
              <Input type="file" accept=".pdf,.xml" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observação</Label>
              <Textarea rows={2} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={upload.isPending}>
              {upload.isPending ? "Enviando…" : "Enviar NF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!refusal} onOpenChange={(v) => !v && setRefusal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Motivo da recusa</DialogTitle></DialogHeader>
          <p className="text-sm whitespace-pre-wrap">{refusal?.motivo_recusa || "—"}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
