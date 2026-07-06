import { Link } from "react-router-dom";
import {
  FileSignature, Plus, Inbox, Clock, CheckCircle2, Hourglass, ClipboardList, Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { CIStatusBadge } from "@/components/ci/CIStatusBadge";
import { useCIList } from "@/hooks/useCI";
import { RoleHomeCover } from "@/components/dashboard/RoleHomeCover";

const FINAL_STATUSES = ["finalizada", "cancelada", "reprovada"];
const WAITING_STATUSES = [
  "aguardando_aprovacao", "aguardando_coordenador", "aguardando_gerente",
  "aguardando_conselho", "aguardando_validacao_tecnica", "aguardando_validacao_regulatoria",
];

export function DashboardSolicitante() {
  const { data: list, isLoading } = useCIList({ mine: true });
  const minhas = list ?? [];
  const abertas = minhas.filter(c => !FINAL_STATUSES.includes(c.status));
  const finalizadas = minhas.filter(c => c.status === "finalizada");
  const aguardando = minhas.filter(c => WAITING_STATUSES.includes(c.status));

  return (
    <div className="space-y-6 animate-fade-in">
      <RoleHomeCover
        chipLabel="Início"
        chipIcon={Sparkles}
        description="Acompanhe suas solicitações e requisições de compra."
        ctas={[
          { label: "Nova Requisição", icon: Plus, to: "/dashboard/ci/formulario", primary: true },
          { label: "Minhas CIs", icon: FileSignature, to: "/dashboard/ci/minhas" },
        ]}
        kpis={[
          { label: "Em andamento", subtitle: "CIs ativas", value: isLoading ? "…" : abertas.length, icon: Clock, tone: "blue", to: "/dashboard/ci/minhas" },
          { label: "Finalizadas", subtitle: "concluídas", value: isLoading ? "…" : finalizadas.length, icon: CheckCircle2, tone: "emerald", to: "/dashboard/ci/minhas" },
          { label: "Aguardando", subtitle: "aprovações", value: isLoading ? "…" : aguardando.length, icon: Hourglass, tone: "orange", to: "/dashboard/ci/minhas" },
          { label: "Total", subtitle: "minhas CIs", value: isLoading ? "…" : minhas.length, icon: ClipboardList, tone: "violet", to: "/dashboard/ci/minhas" },
        ]}
      />

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><Inbox className="h-4 w-4 text-primary" /> Minhas CIs recentes</h2>
        </div>
        {minhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você ainda não abriu nenhuma CI.</p>
        ) : (
          <ul className="divide-y">
            {minhas.slice(0, 5).map((c) => (
              <li key={c.id} className="py-2 flex items-center justify-between gap-3">
                <Link to={`/dashboard/ci/${c.id}`} className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-primary">{c.protocol}</div>
                  <div className="text-sm truncate">{c.subject}</div>
                </Link>
                <CIStatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
