import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Search, X,
  CheckCircle2, Activity, Wrench, Archive as ArchiveIcon,
  AlertTriangle, MapPinOff, ArrowLeftRight, HelpCircle, PackageX,
  Sparkles, ThumbsUp, Circle, AlertOctagon, Ban,
} from "lucide-react";
import { type AssetFilters } from "@/hooks/useAssets";
import { STATUS_OPTIONS, CONDITION_OPTIONS } from "./AssetStatusBadge";
import { useUnitHierarchy } from "@/hooks/useAssets";
import { CategoryTypeSelector } from "@/components/shared/CategoryTypeSelector";

interface Props {
  value: AssetFilters;
  onChange: (v: AssetFilters) => void;
}

const STATUS_ICONS: Record<string, { icon: any; color: string }> = {
  ativo: { icon: CheckCircle2, color: "text-emerald-600" },
  em_uso: { icon: Activity, color: "text-blue-600" },
  em_manutencao: { icon: Wrench, color: "text-amber-600" },
  reserva: { icon: ArchiveIcon, color: "text-slate-600" },
  danificado: { icon: AlertTriangle, color: "text-red-600" },
  sem_localizacao: { icon: MapPinOff, color: "text-orange-600" },
  transferido: { icon: ArrowLeftRight, color: "text-indigo-600" },
  baixado: { icon: ArchiveIcon, color: "text-zinc-600" },
  extraviado: { icon: PackageX, color: "text-rose-600" },
};

const CONDITION_ICONS: Record<string, { icon: any; color: string }> = {
  novo: { icon: Sparkles, color: "text-emerald-600" },
  bom: { icon: ThumbsUp, color: "text-blue-600" },
  regular: { icon: Circle, color: "text-amber-600" },
  ruim: { icon: AlertOctagon, color: "text-orange-600" },
  inservivel: { icon: Ban, color: "text-red-600" },
};

export function AssetFiltersBar({ value, onChange }: Props) {
  const { units } = useUnitHierarchy();
  const set = (k: keyof AssetFilters, v: any) => onChange({ ...value, [k]: v || undefined });

  const has = Object.values(value).some(Boolean);

  return (
    <Card className="p-3">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar nº, código, nome, série…" className="pl-9"
            value={value.search ?? ""} onChange={(e) => set("search", e.target.value)} />
        </div>
        <Select value={value.unitId ?? "all"} onValueChange={(v) => set("unitId", v === "all" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="Unidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as unidades</SelectItem>
            {(units.data ?? []).map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="md:col-span-2">
          <CategoryTypeSelector
            categoryId={value.categoryId}
            typeId={value.typeId}
            onChange={(v) => onChange({ ...value, categoryId: v.categoryId ?? undefined, typeId: v.typeId ?? undefined })}
            hideLabels
            size="sm"
            showIconInTrigger={false}
            placeholderCategory="Categoria"
            placeholderType="Tipo"
          />
        </div>

        <Select value={value.status ?? "all"} onValueChange={(v) => set("status", v === "all" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span className="inline-flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                Todos os status
              </span>
            </SelectItem>
            {STATUS_OPTIONS.map((o) => {
              const meta = STATUS_ICONS[o.value] ?? { icon: HelpCircle, color: "text-muted-foreground" };
              const Icon = meta.icon;
              return (
                <SelectItem key={o.value} value={o.value}>
                  <span className="inline-flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                    {o.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Select value={value.condition ?? "all"} onValueChange={(v) => set("condition", v === "all" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="Condição" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span className="inline-flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                Todas as condições
              </span>
            </SelectItem>
            {CONDITION_OPTIONS.map((o) => {
              const meta = CONDITION_ICONS[o.value] ?? { icon: HelpCircle, color: "text-muted-foreground" };
              const Icon = meta.icon;
              return (
                <SelectItem key={o.value} value={o.value}>
                  <span className="inline-flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                    {o.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
        <Input
          type="number"
          inputMode="decimal"
          placeholder="Valor mín. (R$)"
          value={value.valueMin ?? ""}
          onChange={(e) => set("valueMin", e.target.value === "" ? undefined : Number(e.target.value))}
        />
        <Input
          type="number"
          inputMode="decimal"
          placeholder="Valor máx. (R$)"
          value={value.valueMax ?? ""}
          onChange={(e) => set("valueMax", e.target.value === "" ? undefined : Number(e.target.value))}
        />
        <Input
          type="date"
          placeholder="Aquisição de"
          value={value.acquisitionFrom ?? ""}
          onChange={(e) => set("acquisitionFrom", e.target.value)}
        />
        <Input
          type="date"
          placeholder="Aquisição até"
          value={value.acquisitionTo ?? ""}
          onChange={(e) => set("acquisitionTo", e.target.value)}
        />
      </div>

      {has && (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {Object.values(value).filter(Boolean).length} filtro(s) ativo(s)
          </span>
          <Button variant="ghost" size="sm" onClick={() => onChange({})}>
            <X className="h-3 w-3 mr-1" /> Limpar filtros
          </Button>
        </div>
      )}
    </Card>
  );
}

