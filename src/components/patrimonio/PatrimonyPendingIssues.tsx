import { PatrimonyChartCard } from "./PatrimonyChartCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, MapPinOff, UserX, FolderX, DollarSign, Hash, Wrench,
  ChevronRight, Copy, Archive, Layers, Gauge, HelpCircle, Building2, CircleOff,
} from "lucide-react";
import type { AssetsAggregates } from "@/hooks/useAssets";
import { cn } from "@/lib/utils";

interface Props {
  aggregates: AssetsAggregates;
  onFilter?: (patch: Record<string, string>) => void;
  extended?: boolean;
  title?: string;
  subtitle?: string;
}

export function PatrimonyPendingIssues({
  aggregates,
  onFilter,
  extended = false,
  title = "Pendências de Patrimônio",
  subtitle = "Itens que precisam de conferência ou saneamento",
}: Props) {
  const nav = useNavigate();
  const p = aggregates.pending;

  const base = [
    { key: "loc", label: "Sem localização", count: p.semLocalizacao, icon: MapPinOff, tone: "orange", priority: "Alta", filter: { filter: "sem_localizacao" } },
    { key: "resp", label: "Sem responsável", count: p.semResponsavel, icon: UserX, tone: "amber", priority: "Média", filter: { filter: "sem_responsavel" } },
    { key: "cat", label: "Sem categoria", count: p.semCategoria, icon: FolderX, tone: "slate", priority: "Baixa", filter: { filter: "sem_categoria" } },
    { key: "val", label: "Sem valor", count: p.semValor, icon: DollarSign, tone: "violet", priority: "Baixa", filter: { filter: "sem_valor" } },
    { key: "num", label: "Sem nº patrimônio", count: p.semNumero, icon: Hash, tone: "slate", priority: "Alta", filter: { filter: "sem_numero" } },
    { key: "dan", label: "Danificados", count: p.danificados, icon: AlertTriangle, tone: "red", priority: "Alta", filter: { status: "danificado" } },
    { key: "man", label: "Em manutenção", count: p.emManutencao, icon: Wrench, tone: "amber", priority: "Média", filter: { status: "em_manutencao" } },
  ];

  const extra = [
    { key: "dup", label: "Duplicados (nº repetido)", count: p.duplicados, icon: Copy, tone: "red", priority: "Alta", filter: { filter: "duplicados" } },
    { key: "unit", label: "Sem unidade", count: p.semUnidade, icon: Building2, tone: "orange", priority: "Alta", filter: { filter: "sem_unidade" } },
    { key: "tipo", label: "Sem tipo", count: p.semTipo, icon: Layers, tone: "slate", priority: "Baixa", filter: { filter: "sem_tipo" } },
    { key: "cond", label: "Sem condição", count: p.semCondicao, icon: Gauge, tone: "slate", priority: "Baixa", filter: { filter: "sem_condicao" } },
    { key: "st", label: "Sem status", count: p.semStatus, icon: HelpCircle, tone: "slate", priority: "Baixa" },
    { key: "zero", label: "Valor zerado", count: p.valorZerado, icon: CircleOff, tone: "violet", priority: "Média", filter: { filter: "valor_zerado" } },
    { key: "bx", label: "Baixados", count: p.baixados, icon: Archive, tone: "slate", priority: "Baixa", filter: { status: "baixado" } },
  ];

  const items = (extended ? [...base, ...extra] : base).filter((i) => i.count > 0);

  const toneMap: Record<string, string> = {
    orange: "bg-orange-500/10 text-orange-600",
    amber: "bg-amber-500/10 text-amber-600",
    red: "bg-red-500/10 text-red-600",
    slate: "bg-slate-500/10 text-slate-600",
    violet: "bg-violet-500/10 text-violet-600",
  };
  const priorityMap: Record<string, string> = {
    Alta: "text-red-600 bg-red-500/10",
    Média: "text-amber-600 bg-amber-500/10",
    Baixa: "text-slate-600 bg-slate-500/10",
  };

  return (
    <PatrimonyChartCard title={title} subtitle={subtitle} icon={AlertTriangle}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma pendência detectada 🎉</p>
      ) : (
        <ul className="divide-y">
          {items.map((it) => {
            const Icon = it.icon;
            const action = () => {
              if (!it.filter) return;
              if (onFilter) onFilter(it.filter);
              else nav(`/patrimonio/itens?${new URLSearchParams(it.filter).toString()}`);
            };
            return (
              <li key={it.key} className="flex items-center gap-3 py-2.5">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", toneMap[it.tone])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{it.label}</span>
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", priorityMap[it.priority])}>
                      {it.priority}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{it.count.toLocaleString("pt-BR")} bens</p>
                </div>
                {it.filter && (
                  <Button variant="ghost" size="sm" onClick={action} className="gap-1">
                    Ver <ChevronRight className="h-3 w-3" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </PatrimonyChartCard>
  );
}
