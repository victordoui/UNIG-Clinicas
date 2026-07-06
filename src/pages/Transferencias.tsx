import { useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTransfers, useCreateTransfer } from "@/hooks/useTransfers";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ArrowLeftRight, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const statusBadge: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  rascunho: "outline",
  em_transito: "secondary",
  recebida: "default",
  cancelada: "destructive",
};

export default function Transferencias() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: list = [], isLoading } = useTransfers({ status: statusFilter || undefined });
  const { data: warehouses = [] } = useWarehouses();
  const create = useCreateTransfer();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [items, setItems] = useState<{ product_id: string; quantidade_enviada: number }[]>([]);
  const [obs, setObs] = useState("");

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos_transfer"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, sku").order("name").limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const addItem = () => setItems([...items, { product_id: produtos[0]?.id ?? "", quantidade_enviada: 1 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!origem || !destino) return toast.error("Selecione origem e destino");
    if (origem === destino) return toast.error("Origem e destino devem ser diferentes");
    if (items.length === 0) return toast.error("Adicione ao menos um item");
    const t = await create.mutateAsync({ origem_id: origem, destino_id: destino, observacao: obs, items });
    setOpen(false);
    setItems([]); setObs(""); setOrigem(""); setDestino("");
    nav(`/transferencias/${(t as any).id}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><ArrowLeftRight className="h-6 w-6 text-primary" /> Transferências</h1>
            <p className="text-muted-foreground mt-1">Movimentação de estoque entre locais</p>
          </div>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nova transferência</Button>
        </div>

        <div className="flex gap-2">
          {[["", "Todas"], ["rascunho", "Rascunho"], ["em_transito", "Em trânsito"], ["recebida", "Recebidas"]].map(([v, l]) => (
            <Button key={v} variant={statusFilter === v ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(v)}>{l}</Button>
          ))}
        </div>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? <div className="text-sm text-muted-foreground">Carregando...</div>
              : list.length === 0 ? <EmptyState icon={ArrowLeftRight} title="Nenhuma transferência" description="Crie a primeira movimentação entre locais." />
              : (
                <div className="divide-y">
                  {list.map((t: any) => (
                    <Link key={t.id} to={`/transferencias/${t.id}`} className="flex items-center justify-between py-3 hover:bg-muted/40 px-2 rounded">
                      <div>
                        <div className="font-medium">{t.numero ?? t.id.slice(0, 8)}</div>
                        <div className="text-xs text-muted-foreground">{t.origem?.nome} → {t.destino?.nome}</div>
                      </div>
                      <Badge variant={statusBadge[t.status] ?? "outline"} className="capitalize">{t.status.replace("_", " ")}</Badge>
                    </Link>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nova transferência</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Origem</Label>
                <Select value={origem} onValueChange={setOrigem}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (<SelectItem key={w.id} value={w.id}>{w.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Destino</Label>
                <Select value={destino} onValueChange={setDestino}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (<SelectItem key={w.id} value={w.id}>{w.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observação</Label>
              <Input value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>

            <div className="border rounded-md p-3 space-y-2">
              <div className="flex justify-between items-center">
                <Label className="m-0">Itens</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Item</Button>
              </div>
              {items.length === 0 && <div className="text-sm text-muted-foreground">Nenhum item.</div>}
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_auto] gap-2 items-center">
                  <Select value={it.product_id} onValueChange={(v) => { const c = [...items]; c[i].product_id = v; setItems(c); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {produtos.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Input type="number" min={1} value={it.quantidade_enviada}
                    onChange={(e) => { const c = [...items]; c[i].quantidade_enviada = Number(e.target.value) || 0; setItems(c); }} />
                  <Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <LoadingButton loading={create.isPending} onClick={submit}>Criar</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
