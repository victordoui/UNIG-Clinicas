import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, Plus, Pencil, Trash2, ArrowLeft, Building2, Layers } from "lucide-react";
import { UnitLabel } from "@/components/ui/UnitLabel";
import { useUnitsManagement } from "@/hooks/useUnitsManagement";
import { useHierarchyChildren, useHierarchyMutations, type HierarchyLevel } from "@/hooks/useUnitHierarchy";
import { cn } from "@/lib/utils";

interface ExplorerProps {
  renderUnitCardActions?: (unitId: string, unitName: string) => React.ReactNode;
}

interface BreadcrumbItem {
  level: HierarchyLevel | "unit";
  id: string;
  name: string;
}

const LEVEL_LABEL: Record<HierarchyLevel, string> = {
  block: "Bloco",
  floor: "Pavimento",
  sector: "Setor",
  subspace: "Sub-espaço",
};

const NEXT_LEVEL: Record<HierarchyLevel | "unit", HierarchyLevel | null> = {
  unit: "block",
  block: "floor",
  floor: "sector",
  sector: "subspace",
  subspace: null,
};

export function UnitExplorer({ renderUnitCardActions }: ExplorerProps) {
  const [path, setPath] = useState<BreadcrumbItem[]>([]);
  const current = path[path.length - 1];
  const currentLevel: HierarchyLevel | "unit" = current ? (current.level as any) : "unit";
  const next = NEXT_LEVEL[currentLevel];

  const { activeUnits } = useUnitsManagement();

  return (
    <div className="space-y-4">
      <Breadcrumb path={path} onJump={(idx) => setPath(path.slice(0, idx + 1))} onReset={() => setPath([])} />

      <AnimatePresence mode="wait">
        {currentLevel === "unit" ? (
          <motion.div
            key="units"
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {activeUnits.map((u) => (
              <UnitCard
                key={u.id}
                name={u.name}
                onOpen={() => setPath([{ level: "unit", id: u.id, name: u.name }])}
                actions={renderUnitCardActions?.(u.id, u.name)}
              />
            ))}
            {activeUnits.length === 0 && (
              <Card className="p-6 text-center text-sm text-muted-foreground col-span-full">
                Nenhuma unidade ativa.
              </Card>
            )}
          </motion.div>
        ) : next ? (
          <ChildrenGrid
            key={`${currentLevel}-${current.id}`}
            level={next}
            parentId={current.id}
            onOpen={(node) => setPath([...path, { level: next, id: node.id, name: node.name }])}
          />
        ) : (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Nível final atingido. Volte para gerenciar outros sub-espaços.
          </Card>
        )}
      </AnimatePresence>
    </div>
  );
}

function Breadcrumb({ path, onJump, onReset }: { path: BreadcrumbItem[]; onJump: (idx: number) => void; onReset: () => void }) {
  return (
    <div className="flex items-center gap-2 text-sm flex-wrap">
      <Button variant="ghost" size="sm" onClick={onReset} className="h-8">
        <Building2 className="h-4 w-4 mr-1" /> Unidades
      </Button>
      {path.map((p, idx) => (
        <span key={p.id} className="inline-flex items-center gap-2">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <Button variant="ghost" size="sm" className="h-8" onClick={() => onJump(idx)}>
            {p.name}
          </Button>
        </span>
      ))}
      {path.length > 0 && (
        <Button variant="ghost" size="sm" onClick={() => onJump(path.length - 2)} className="ml-auto h-8">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      )}
    </div>
  );
}

function UnitCard({ name, onOpen, actions }: { name: string; onOpen: () => void; actions?: React.ReactNode }) {
  return (
    <Card className="p-4 hover:shadow-md transition group">
      <button onClick={onOpen} className="w-full text-left">
        <div className="flex items-center justify-between">
          <UnitLabel unit={name} size="lg" />
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition" />
        </div>
        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Layers className="h-3 w-3" /> Explorar blocos
        </div>
      </button>
      {actions && <div className="mt-3 pt-3 border-t flex items-center gap-1">{actions}</div>}
    </Card>
  );
}

function ChildrenGrid({ level, parentId, onOpen }: { level: HierarchyLevel; parentId: string; onOpen: (node: { id: string; name: string }) => void }) {
  const { data: items = [], isLoading } = useHierarchyChildren(level, parentId);
  const { create, rename, remove } = useHierarchyMutations(level);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <Input
          placeholder={`Novo ${LEVEL_LABEL[level].toLowerCase()}…`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newName.trim()) {
              create({ parentId, name: newName.trim() }).then(() => setNewName(""));
            }
          }}
          className="max-w-sm"
        />
        <Button size="sm" disabled={!newName.trim()} onClick={() => create({ parentId, name: newName.trim() }).then(() => setNewName(""))}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-6 text-sm text-muted-foreground">Carregando…</Card>
      ) : items.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground text-center">
          Nenhum {LEVEL_LABEL[level].toLowerCase()} cadastrado.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <Card key={item.id} className={cn("p-3 hover:shadow-md transition")}>
                <div className="flex items-center justify-between gap-2">
                  {isEditing ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editName.trim()) {
                          rename({ id: item.id, name: editName.trim() }).then(() => setEditingId(null));
                        }
                      }}
                      className="h-8"
                    />
                  ) : (
                    <button onClick={() => onOpen(item)} className="flex-1 text-left font-medium truncate">
                      {item.name}
                    </button>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <Button size="sm" variant="ghost" onClick={() => rename({ id: item.id, name: editName.trim() }).then(() => setEditingId(null))}>
                        Salvar
                      </Button>
                    ) : (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(item.id); setEditName(item.name); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => {
                      if (confirm(`Remover "${item.name}"?`)) remove(item.id);
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Layers className="h-3 w-3" /> {LEVEL_LABEL[level]}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
