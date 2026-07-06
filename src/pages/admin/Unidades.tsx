import { useMemo, useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2, Plus, Search, Eye, Pencil, Trash2, List, Compass, School, Building, GraduationCap,
} from "lucide-react";
import { UnitLabel } from "@/components/ui/UnitLabel";
import { UnitStatusBadge } from "@/components/ui/UnitStatusBadge";
import { UnitDetailDialog } from "@/components/admin/UnitDetailDialog";
import { UnitExplorer } from "@/components/admin/UnitExplorer";
import { useUnitsManagement, type Unit } from "@/hooks/useUnitsManagement";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const VIEW_STORAGE_KEY = "units-management-view";

const ICON_OPTIONS = [
  { key: "building", label: "Faculdade", icon: Building },
  { key: "school", label: "Colégio", icon: School },
  { key: "graduation", label: "Universidade", icon: GraduationCap },
] as const;

export default function Unidades() {
  const [viewMode, setViewMode] = useState<"list" | "explore">(() => {
    if (typeof window === "undefined") return "list";
    return localStorage.getItem(VIEW_STORAGE_KEY) === "explore" ? "explore" : "list";
  });
  useEffect(() => { localStorage.setItem(VIEW_STORAGE_KEY, viewMode); }, [viewMode]);

  const { units, isLoading, createUnit, updateUnit, deleteUnit, toggleActive, isCreating, isUpdating, isDeleting } =
    useUnitsManagement();

  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Unit | null>(null);

  // form
  const [formName, setFormName] = useState("");
  const [formShortName, setFormShortName] = useState("");
  const [formIconKey, setFormIconKey] = useState<string>("building");
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(999);
  const [formType, setFormType] = useState<string>("");

  function resetForm() {
    setFormName(""); setFormShortName(""); setFormIconKey("building"); setFormDisplayOrder(999); setFormType("");
  }
  function fillForm(u: Unit) {
    setFormName(u.name); setFormShortName(u.short_name ?? "");
    setFormIconKey(u.icon ?? "building"); setFormDisplayOrder(u.display_order); setFormType(u.type ?? "");
  }

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return units
      .filter((u) => (showInactive ? true : u.is_active))
      .filter((u) => !term || u.name.toLowerCase().includes(term) || (u.short_name ?? "").toLowerCase().includes(term));
  }, [units, searchTerm, showInactive]);

  const stats = useMemo(() => ({
    total: units.length,
    active: units.filter((u) => u.is_active).length,
    inactive: units.filter((u) => !u.is_active).length,
  }), [units]);

  async function handleCreate() {
    if (!formName.trim()) return;
    await createUnit({
      name: formName.trim(),
      short_name: formShortName.trim() || null,
      icon: formIconKey,
      display_order: formDisplayOrder,
      type: formType.trim() || null,
    });
    resetForm(); setCreateOpen(false);
  }
  async function handleUpdate() {
    if (!selected) return;
    await updateUnit({
      id: selected.id,
      name: formName.trim(),
      short_name: formShortName.trim() || null,
      icon: formIconKey,
      display_order: formDisplayOrder,
      type: formType.trim() || null,
    });
    setEditOpen(false);
  }

  async function handleDelete() {
    if (!selected) return;
    // Verifica vínculos
    const [ciRes, demandasRes] = await Promise.all([
      (supabase as any).from("ci_requests").select("id", { count: "exact", head: true }).eq("campus", selected.name),
      (supabase as any).from("operational_demands").select("id", { count: "exact", head: true }).eq("unidade", selected.name),
    ]);
    const total = (ciRes.count ?? 0) + (demandasRes.count ?? 0);
    if (total > 0) {
      toast({
        title: "Exclusão bloqueada",
        description: `Existem ${total} registros vinculados a essa unidade. Inative em vez de excluir.`,
        variant: "destructive",
      });
      setDeleteOpen(false);
      return;
    }
    await deleteUnit(selected.id);
    setDeleteOpen(false);
  }

  function renderUnitFormFields() {
    return (
      <div className="space-y-4">
        <div>
          <Label className="text-xs">Tipo de instituição</Label>
          <ToggleGroup
            type="single" value={formIconKey}
            onValueChange={(v) => v && setFormIconKey(v)}
            className="justify-start mt-1"
          >
            {ICON_OPTIONS.map((o) => (
              <ToggleGroupItem key={o.key} value={o.key} className="data-[state=on]:bg-primary/10">
                <o.icon className="h-4 w-4 mr-1.5" /> {o.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div>
          <Label htmlFor="u-name">Nome *</Label>
          <Input id="u-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex.: UNIG – Nova Iguaçu" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="u-short">Abreviação</Label>
            <Input id="u-short" value={formShortName} onChange={(e) => setFormShortName(e.target.value)} placeholder="Ex.: UNIG-NI" />
          </div>
          <div>
            <Label htmlFor="u-order">Ordem</Label>
            <Input id="u-order" type="number" value={formDisplayOrder} onChange={(e) => setFormDisplayOrder(parseInt(e.target.value || "999", 10))} />
          </div>
        </div>
        <div>
          <Label htmlFor="u-type">Tipo (livre)</Label>
          <Input id="u-type" value={formType} onChange={(e) => setFormType(e.target.value)} placeholder="universidade | faculdade | colegio | campus" />
        </div>
      </div>
    );
  }

  function renderRowActions(u: Unit) {
    return (
      <div className="flex items-center gap-1">
        <UnitStatusBadge active={u.is_active} />
        <Switch checked={u.is_active} onCheckedChange={(v) => toggleActive({ id: u.id, is_active: v })} />
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setSelected(u); setDetailOpen(true); }}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setSelected(u); fillForm(u); setEditOpen(true); }}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { setSelected(u); setDeleteOpen(true); }}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
        {/* Header */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-primary-foreground/85 text-xs font-medium">
                  <Building2 className="h-4 w-4" /> Administração
                </div>
                <h1 className="text-2xl md:text-3xl font-bold mt-1">Gerenciamento de Unidades</h1>
                <p className="text-sm text-primary-foreground/90 mt-1 max-w-2xl">
                  Cadastre e gerencie as unidades/campus do sistema. Reutilizado em toda lista suspensa.
                </p>
              </div>
              <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-primary hover:bg-white/90 shrink-0">
                    <Plus className="h-4 w-4 mr-1" /> Nova Unidade
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Unidade</DialogTitle>
                    <DialogDescription>Cadastre uma nova unidade/campus.</DialogDescription>
                  </DialogHeader>
                  {renderUnitFormFields()}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreate} disabled={!formName.trim() || isCreating}>Criar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="mt-4">
              <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)}
                className="bg-white/15 backdrop-blur rounded-lg p-1 w-fit">
                <ToggleGroupItem value="list" className="data-[state=on]:bg-white data-[state=on]:text-primary text-primary-foreground">
                  <List className="h-4 w-4 mr-1" /> Lista
                </ToggleGroupItem>
                <ToggleGroupItem value="explore" className="data-[state=on]:bg-white data-[state=on]:text-primary text-primary-foreground">
                  <Compass className="h-4 w-4 mr-1" /> Explorar
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </Card>

        {viewMode === "list" ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <KpiCard label="Total" value={stats.total} />
              <KpiCard label="Ativas" value={stats.active} accent="text-emerald-600" />
              <KpiCard label="Inativas" value={stats.inactive} accent="text-muted-foreground" />
            </div>

            {/* Filtros */}
            <Card className="p-3 flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar unidade…" className="pl-9" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Switch checked={showInactive} onCheckedChange={setShowInactive} id="show-inactive" />
                <Label htmlFor="show-inactive" className="cursor-pointer">Mostrar inativas</Label>
              </div>
            </Card>

            {/* Lista */}
            <Card className="divide-y">
              {isLoading ? (
                <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Nenhuma unidade encontrada.
                </div>
              ) : (
                filtered.map((u, idx) => (
                  <div key={u.id} className={cn("flex items-center gap-3 p-3", !u.is_active && "opacity-60")}>
                    <span className="text-xs font-mono text-muted-foreground w-8 shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <UnitLabel unit={u.name} size="md" />
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 ml-7">
                        {u.short_name && <span>{u.short_name}</span>}
                        {u.type && <span>· {u.type}</span>}
                        <span>· ordem #{u.display_order}</span>
                      </div>
                    </div>
                    {renderRowActions(u)}
                  </div>
                ))
              )}
            </Card>
          </>
        ) : (
          <UnitExplorer renderUnitCardActions={(_id, name) => {
            const u = units.find((x) => x.name === name);
            if (!u) return null;
            return renderRowActions(u);
          }} />
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Unidade</DialogTitle>
            <DialogDescription>Atualize os dados da unidade.</DialogDescription>
          </DialogHeader>
          {renderUnitFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={!formName.trim() || isUpdating}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir unidade</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Se a unidade possuir vínculos, a exclusão será bloqueada e você deverá inativá-la.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UnitDetailDialog unit={selected} open={detailOpen} onOpenChange={setDetailOpen} />
    </MainLayout>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-2xl font-bold mt-1", accent)}>{value}</div>
    </Card>
  );
}
