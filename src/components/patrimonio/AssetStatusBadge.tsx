import { Badge } from "@/components/ui/badge";
import type { AssetStatus, AssetCondition } from "@/hooks/useAssets";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<AssetStatus, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  em_uso: { label: "Em uso", className: "bg-blue-100 text-blue-800 border-blue-300" },
  em_manutencao: { label: "Em manutenção", className: "bg-amber-100 text-amber-800 border-amber-300" },
  reserva: { label: "Reserva", className: "bg-slate-100 text-slate-800 border-slate-300" },
  danificado: { label: "Danificado", className: "bg-red-100 text-red-800 border-red-300" },
  sem_localizacao: { label: "Sem localização", className: "bg-orange-100 text-orange-800 border-orange-300" },
  transferido: { label: "Transferido", className: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  baixado: { label: "Baixado", className: "bg-zinc-200 text-zinc-700 border-zinc-300" },
  extraviado: { label: "Extraviado", className: "bg-rose-100 text-rose-800 border-rose-300" },
};

export function AssetStatusBadge({ status, className }: { status: AssetStatus; className?: string }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.ativo;
  return <Badge variant="outline" className={cn("font-medium", s.className, className)}>{s.label}</Badge>;
}

const COND_MAP: Record<AssetCondition, { label: string; className: string }> = {
  novo: { label: "Novo", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  bom: { label: "Bom", className: "bg-blue-50 text-blue-700 border-blue-200" },
  regular: { label: "Regular", className: "bg-amber-50 text-amber-700 border-amber-200" },
  ruim: { label: "Ruim", className: "bg-orange-50 text-orange-700 border-orange-200" },
  inservivel: { label: "Inservível", className: "bg-red-50 text-red-700 border-red-200" },
};

export function AssetConditionBadge({ condition, className }: { condition: AssetCondition; className?: string }) {
  const c = COND_MAP[condition] ?? COND_MAP.bom;
  return <Badge variant="outline" className={cn(c.className, className)}>{c.label}</Badge>;
}

export const STATUS_OPTIONS = Object.entries(STATUS_MAP).map(([v, m]) => ({ value: v, label: m.label }));
export const CONDITION_OPTIONS = Object.entries(COND_MAP).map(([v, m]) => ({ value: v, label: m.label }));
