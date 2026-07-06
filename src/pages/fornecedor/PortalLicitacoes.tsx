import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, Upload, Calendar, Truck, Tag, DollarSign } from "lucide-react";

interface QuoteForm {
  marca: string;
  modelo: string;
  valor_unitario: string;
  quantidade: string;
  valor_frete: string;
  valor_total: string;
  prazo_entrega_dias: string;
  validade_proposta: string;
  condicao_pagamento: string;
  garantia: string;
  observacoes: string;
  anexo?: File | null;
}

const EMPTY: QuoteForm = {
  marca: "", modelo: "", valor_unitario: "", quantidade: "", valor_frete: "0",
  valor_total: "", prazo_entrega_dias: "", validade_proposta: "",
  condicao_pagamento: "", garantia: "", observacoes: "", anexo: null,
};

export default function PortalLicitacoes() {
  const { supplierLink } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<QuoteForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!supplierLink) return;
    setLoading(true);
    const { data } = await supabase
      .from("purchase_quotes")
      .select("*, purchase_requests(numero, item_descricao, quantidade, categoria, prazo_desejado)")
      .eq("supplier_id", supplierLink.supplier_id)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [supplierLink]);

  const openSend = (q: any) => {
    const qty = q.purchase_requests?.quantidade ?? q.quantidade ?? 1;
    const unit = q.valor_total && qty ? (Number(q.valor_total) / qty).toFixed(2) : "";
    setSelected(q);
    setForm({
      ...EMPTY,
      quantidade: String(qty),
      valor_unitario: unit,
      valor_total: q.valor_total ? String(q.valor_total) : "",
      prazo_entrega_dias: q.prazo_entrega_dias ? String(q.prazo_entrega_dias) : "",
      condicao_pagamento: q.condicao_pagamento ?? "",
    });
  };

  // Auto-calc total = unitário * qtd + frete
  const handleField = (field: keyof QuoteForm, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "valor_unitario" || field === "quantidade" || field === "valor_frete") {
        const u = parseFloat(next.valor_unitario) || 0;
        const q = parseFloat(next.quantidade) || 0;
        const f = parseFloat(next.valor_frete) || 0;
        if (u && q) next.valor_total = (u * q + f).toFixed(2);
      }
      return next;
    });
  };

  const submit = async () => {
    if (!selected) return;
    if (!form.valor_total || Number(form.valor_total) <= 0) {
      toast({ title: "Valor obrigatório", description: "Informe o valor total da proposta.", variant: "destructive" });
      return;
    }
    if (!form.prazo_entrega_dias) {
      toast({ title: "Prazo obrigatório", description: "Informe o prazo de entrega.", variant: "destructive" });
      return;
    }
    setSaving(true);

    let anexoPath: string | null = null;
    if (form.anexo && supplierLink) {
      const ext = form.anexo.name.split(".").pop() || "pdf";
      const path = `${supplierLink.supplier_id}/proposta-${selected.id}-${Date.now()}.${ext}`;
      const up = await supabase.storage
        .from("supplier-invoices")
        .upload(path, form.anexo, { upsert: false, contentType: form.anexo.type });
      if (up.error) {
        setSaving(false);
        toast({ title: "Erro ao enviar anexo", description: up.error.message, variant: "destructive" });
        return;
      }
      anexoPath = path;
    }

    const observacoes = [
      form.marca && `Marca: ${form.marca}`,
      form.modelo && `Modelo: ${form.modelo}`,
      form.valor_unitario && `Valor unitário: R$ ${Number(form.valor_unitario).toFixed(2)}`,
      form.valor_frete && `Frete: R$ ${Number(form.valor_frete).toFixed(2)}`,
      form.validade_proposta && `Validade: ${form.validade_proposta}`,
      form.garantia && `Garantia: ${form.garantia}`,
      anexoPath && `Anexo: ${anexoPath}`,
      form.observacoes,
    ].filter(Boolean).join("\n");

    const { error } = await supabase
      .from("purchase_quotes")
      .update({
        valor_total: Number(form.valor_total),
        prazo_entrega_dias: Number(form.prazo_entrega_dias) || null,
        condicao_pagamento: form.condicao_pagamento || null,
        observacoes,
        status: "enviada",
      })
      .eq("id", selected.id)
      .select();

    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Proposta enviada", description: "Sua cotação foi registrada com sucesso." });
    setSelected(null);
    load();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Licitações / Cotações</h1>
        <p className="text-muted-foreground text-sm">Envie sua proposta detalhada para as cotações abertas.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhuma cotação disponível no momento.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {items.map((q) => (
            <Card key={q.id} className="rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{q.purchase_requests?.numero ?? "Cotação"}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{q.purchase_requests?.item_descricao}</p>
                  </div>
                  <Badge variant={q.status === "enviada" ? "default" : "secondary"}>{q.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
                <div><span className="text-muted-foreground">Qtd:</span> {q.purchase_requests?.quantidade ?? q.quantidade ?? "-"}</div>
                <div><span className="text-muted-foreground">Categoria:</span> {q.purchase_requests?.categoria ?? "-"}</div>
                <div><span className="text-muted-foreground">Prazo desejado:</span> {q.purchase_requests?.prazo_desejado ?? "-"}</div>
                <div><span className="text-muted-foreground">Sua proposta:</span> {q.valor_total ? `R$ ${Number(q.valor_total).toFixed(2)}` : "—"}</div>
                <div className="text-right">
                  <Button size="sm" onClick={() => openSend(q)} disabled={q.status === "escolhida" || q.status === "descartada"}>
                    {q.status === "enviada" ? "Atualizar" : "Enviar proposta"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enviar proposta — {selected?.purchase_requests?.numero}</DialogTitle>
            <DialogDescription>
              {selected?.purchase_requests?.item_descricao}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> Marca</Label>
                <Input value={form.marca} onChange={(e) => handleField("marca", e.target.value)} />
              </div>
              <div>
                <Label>Modelo</Label>
                <Input value={form.modelo} onChange={(e) => handleField("modelo", e.target.value)} />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label>Quantidade</Label>
                <Input type="number" value={form.quantidade} onChange={(e) => handleField("quantidade", e.target.value)} />
              </div>
              <div>
                <Label className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Unitário (R$)</Label>
                <Input type="number" step="0.01" value={form.valor_unitario} onChange={(e) => handleField("valor_unitario", e.target.value)} />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Frete (R$)</Label>
                <Input type="number" step="0.01" value={form.valor_frete} onChange={(e) => handleField("valor_frete", e.target.value)} />
              </div>
              <div>
                <Label>Total (R$) *</Label>
                <Input type="number" step="0.01" value={form.valor_total} onChange={(e) => handleField("valor_total", e.target.value)} className="font-semibold" />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Prazo entrega (dias) *</Label>
                <Input type="number" value={form.prazo_entrega_dias} onChange={(e) => handleField("prazo_entrega_dias", e.target.value)} />
              </div>
              <div>
                <Label>Validade da proposta</Label>
                <Input type="date" value={form.validade_proposta} onChange={(e) => handleField("validade_proposta", e.target.value)} />
              </div>
              <div>
                <Label>Condição de pagamento</Label>
                <Input value={form.condicao_pagamento} onChange={(e) => handleField("condicao_pagamento", e.target.value)} placeholder="Ex: 30/60/90 dias" />
              </div>
              <div>
                <Label>Garantia</Label>
                <Input value={form.garantia} onChange={(e) => handleField("garantia", e.target.value)} placeholder="Ex: 12 meses" />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea rows={3} value={form.observacoes} onChange={(e) => handleField("observacoes", e.target.value)} />
            </div>

            <div>
              <Label className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Anexo (proposta em PDF)</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                onChange={(e) => setForm((p) => ({ ...p, anexo: e.target.files?.[0] ?? null }))}
              />
              {form.anexo && (
                <p className="text-xs text-muted-foreground mt-1">
                  <Upload className="h-3 w-3 inline mr-1" />{form.anexo.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Enviar proposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
