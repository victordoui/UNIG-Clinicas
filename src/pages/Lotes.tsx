import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBatches, useUpsertBatch } from "@/hooks/useBatches";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Boxes } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";

export default function Lotes() {
  const [filtro, setFiltro] = useState<"todos" | "vencendo" | "vencidos">("todos");
  const opts = filtro === "vencendo" ? { vencendoEmDias: 30 } : {};
  const { data: list = [], isLoading } = useBatches(opts);
  const upsert = useUpsertBatch();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos_lote"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, sku").order("name").limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const hoje = new Date().toISOString().slice(0, 10);
  const filtered = filtro === "vencidos" ? list.filter((b: any) => b.validade && b.validade < hoje) : list;

  const openNew = () => { setEdit({ lote: "", validade: null, product_id: produtos[0]?.id }); setOpen(true); };
  const save = async () => {
    if (!edit?.lote || !edit?.product_id) return;
    await upsert.mutateAsync(edit);
    setOpen(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Boxes className="h-6 w-6 text-primary" /> Lotes</h1>
            <p className="text-muted-foreground mt-1">Rastreabilidade por lote com controle de validade</p>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo lote</Button>
        </div>

        <div className="flex gap-2">
          {(["todos", "vencendo", "vencidos"] as const).map((f) => (
            <Button key={f} variant={filtro === f ? "default" : "outline"} size="sm" onClick={() => setFiltro(f)}>
              {f === "todos" ? "Todos" : f === "vencendo" ? "Vence em 30 dias" : "Vencidos"}
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Lotes</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={Boxes} title="Nenhum lote" description="Cadastre lotes com data de validade." />
            ) : (
              <div className="divide-y">
                {filtered.map((b: any) => {
                  const venc = b.validade ? new Date(b.validade) : null;
                  const vencido = venc && venc < new Date();
                  return (
                    <div key={b.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{b.products?.name} <span className="text-muted-foreground text-sm">· Lote {b.lote}</span></div>
                        <div className="text-xs text-muted-foreground">SKU: {b.products?.sku ?? "—"}</div>
                      </div>
                      {b.validade && (
                        <Badge variant={vencido ? "destructive" : "outline"}>
                          {vencido ? "Vencido" : "Vence"} em {new Date(b.validade).toLocaleDateString("pt-BR")}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo lote</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Produto</Label>
              <Select value={edit?.product_id ?? ""} onValueChange={(v) => setEdit({ ...edit, product_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {produtos.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lote</Label>
              <Input value={edit?.lote ?? ""} onChange={(e) => setEdit({ ...edit, lote: e.target.value })} />
            </div>
            <div>
              <Label>Validade</Label>
              <Input type="date" value={edit?.validade ?? ""} onChange={(e) => setEdit({ ...edit, validade: e.target.value })} />
            </div>
            <div>
              <Label>Fabricação</Label>
              <Input type="date" value={edit?.fabricacao ?? ""} onChange={(e) => setEdit({ ...edit, fabricacao: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <LoadingButton loading={upsert.isPending} onClick={save}>Salvar</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
