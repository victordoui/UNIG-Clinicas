import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderTree, Plus, Tag } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useAssetCategories, useAssetTypes, useSaveCategory, useSaveType } from "@/hooks/useAssets";

export default function PatrimonioCategorias() {
  const { data: cats = [] } = useAssetCategories();
  const saveCat = useSaveCategory();
  const saveType = useSaveType();
  const [open, setOpen] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", color: "#3B82F6" });
  const [selCat, setSelCat] = useState<string | null>(null);
  const [newType, setNewType] = useState("");
  const { data: types = [] } = useAssetTypes(selCat ?? undefined);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
        <PageHeader icon={FolderTree} title="Categorias e Tipos"
          description="Organize os patrimônios em categorias e tipos."
          actions={
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Nova categoria</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova categoria</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nome</Label><Input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} /></div>
                  <div><Label>Cor</Label><Input type="color" value={newCat.color} onChange={(e) => setNewCat({ ...newCat, color: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button onClick={async () => { await saveCat.mutateAsync(newCat); setOpen(false); setNewCat({ name: "", color: "#3B82F6" }); }}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Categorias</h3>
            <div className="space-y-1">
              {cats.map((c: any) => {
                const Icon = (c.icon && (LucideIcons as any)[c.icon]) || Tag;
                return (
                  <button key={c.id} onClick={() => setSelCat(c.id)}
                    className={`w-full text-left p-2 rounded hover:bg-muted flex items-center gap-2 ${selCat === c.id ? "bg-muted" : ""}`}>
                    <Icon className="h-4 w-4 shrink-0" style={c.color ? { color: c.color } : undefined} />
                    <span className="text-sm">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Tipos {selCat && `— ${cats.find((c: any) => c.id === selCat)?.name}`}</h3>
            {!selCat ? <p className="text-sm text-muted-foreground">Selecione uma categoria à esquerda.</p> : (
              <>
                <div className="flex gap-2 mb-3">
                  <Input placeholder="Novo tipo" value={newType} onChange={(e) => setNewType(e.target.value)} />
                  <Button size="sm" onClick={async () => { if (!newType) return; await saveType.mutateAsync({ category_id: selCat, name: newType }); setNewType(""); }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {types.map((t: any) => <div key={t.id} className="p-2 rounded bg-muted/40 text-sm">{t.name}</div>)}
                  {types.length === 0 && <p className="text-xs text-muted-foreground">Sem tipos ainda.</p>}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
