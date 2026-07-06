import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useWarehouses, useUpsertWarehouse, useDeleteWarehouse, Warehouse } from "@/hooks/useWarehouses";
import { Plus, Pencil, Trash2, Warehouse as WarehouseIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";

export default function Locais() {
  const { data: list = [], isLoading } = useWarehouses();
  const upsert = useUpsertWarehouse();
  const del = useDeleteWarehouse();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<Warehouse> | null>(null);

  const openNew = () => { setEdit({ nome: "", tipo: "cd", ativo: true, padrao: false }); setOpen(true); };
  const openEdit = (w: Warehouse) => { setEdit(w); setOpen(true); };

  const save = async () => {
    if (!edit?.nome) return;
    await upsert.mutateAsync(edit as any);
    setOpen(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><WarehouseIcon className="h-6 w-6 text-primary" /> Locais</h1>
            <p className="text-muted-foreground mt-1">Depósitos, lojas e obras da sua organização</p>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo local</Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Locais cadastrados</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : list.length === 0 ? (
              <EmptyState icon={WarehouseIcon} title="Nenhum local" description="Crie seu primeiro depósito ou loja." />
            ) : (
              <div className="divide-y">
                {list.map((w) => (
                  <div key={w.id} className="flex items-center justify-between py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{w.nome}</span>
                        {w.padrao && <Badge variant="secondary">Padrão</Badge>}
                        {!w.ativo && <Badge variant="outline">Inativo</Badge>}
                        <Badge variant="outline" className="capitalize">{w.tipo}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{w.codigo ?? "—"}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(w)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Remover este local?")) del.mutate(w.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Editar local" : "Novo local"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={edit?.nome ?? ""} onChange={(e) => setEdit({ ...edit!, nome: e.target.value })} />
            </div>
            <div>
              <Label>Código</Label>
              <Input value={edit?.codigo ?? ""} onChange={(e) => setEdit({ ...edit!, codigo: e.target.value })} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={edit?.tipo ?? "cd"} onValueChange={(v) => setEdit({ ...edit!, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cd">Centro de Distribuição</SelectItem>
                  <SelectItem value="loja">Loja</SelectItem>
                  <SelectItem value="obra">Obra</SelectItem>
                  <SelectItem value="transito">Trânsito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2">
              <Checkbox checked={!!edit?.padrao} onCheckedChange={(v) => setEdit({ ...edit!, padrao: !!v })} />
              <span>Local padrão</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={edit?.ativo !== false} onCheckedChange={(v) => setEdit({ ...edit!, ativo: !!v })} />
              <span>Ativo</span>
            </label>
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
