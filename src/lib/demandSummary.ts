import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  OperationalDemand, DEMAND_STATUS_LABEL, DEMAND_TYPE_LABEL, DEMAND_PRIORITY_LABEL,
  isOverdue, FINAL_STATUSES,
} from '@/hooks/useOperationalDemands';

function joinNice(arr: string[], max = 5) {
  const trimmed = arr.filter(Boolean).slice(0, max);
  if (trimmed.length === 0) return '—';
  if (trimmed.length === 1) return trimmed[0];
  return trimmed.slice(0, -1).join(', ') + ' e ' + trimmed[trimmed.length - 1];
}

function topByCount<T>(arr: T[], by: (x: T) => string, n = 3): string[] {
  const map = new Map<string, number>();
  arr.forEach((x) => {
    const k = by(x); if (!k) return;
    map.set(k, (map.get(k) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

function isInMonth(d: OperationalDemand, ref = new Date()) {
  const dt = new Date(d.concluida_em ?? d.updated_at);
  return dt.getMonth() === ref.getMonth() && dt.getFullYear() === ref.getFullYear();
}

/** Resumo geral — para painel/relatório mensal */
export function buildGeneralSummary(all: OperationalDemand[], refMonth?: Date): string {
  const total = all.length;
  const andamento = all.filter((d) => d.status === 'em_execucao').length;
  const aguardando = all.filter((d) => d.status.startsWith('aguardando')).length;
  const atrasadas = all.filter(isOverdue).length;
  const urgentes = all.filter((d) => d.prioridade === 'urgente' && !FINAL_STATUSES.includes(d.status)).length;
  const concluidasMes = all.filter((d) => d.status === 'concluida' && isInMonth(d, refMonth)).length;

  const unidades = joinNice(topByCount(all, (d) => d.unidade));
  const dependencias = joinNice(
    all.map((d) => d.dependencies ?? '').filter(Boolean).flatMap((s) => s.split(/[\n;,]/).map((x) => x.trim()).filter(Boolean)),
  );
  const pontos = joinNice(
    all.map((d) => d.attention_points ?? '').filter(Boolean).flatMap((s) => s.split(/[\n;,]/).map((x) => x.trim()).filter(Boolean)),
  );
  const proximas = joinNice(
    all.map((d) => d.proximas_etapas ?? '').filter(Boolean).flatMap((s) => s.split(/[\n;]/).map((x) => x.trim()).filter(Boolean)),
  );

  return `Atualmente, existem ${total} demanda(s)/projeto(s) acompanhado(s) no UNIG Facilities, sendo ${andamento} em andamento, ${aguardando} aguardando decisão, ${atrasadas} atrasada(s), ${urgentes} urgente(s) e ${concluidasMes} concluída(s) no mês. As principais unidades envolvidas são ${unidades}. As principais dependências estão relacionadas a ${dependencias}. Os principais pontos de atenção são ${pontos}. As próximas etapas envolvem ${proximas}.`;
}

/** Resumo por unidade */
export function buildUnitSummary(unitName: string, demands: OperationalDemand[], refMonth?: Date): string {
  const total = demands.length;
  const andamento = demands.filter((d) => d.status === 'em_execucao').length;
  const atrasadas = demands.filter(isOverdue).length;
  const urgentes = demands.filter((d) => d.prioridade === 'urgente' && !FINAL_STATUSES.includes(d.status)).length;
  const concluidasMes = demands.filter((d) => d.status === 'concluida' && isInMonth(d, refMonth)).length;
  const tipos = joinNice(topByCount(demands, (d) => DEMAND_TYPE_LABEL[d.tipo]));
  const dependencias = joinNice(
    demands.map((d) => d.dependencies ?? '').filter(Boolean).flatMap((s) => s.split(/[\n;,]/).map((x) => x.trim()).filter(Boolean)),
  );
  const proximas = joinNice(
    demands.map((d) => d.proximas_etapas ?? '').filter(Boolean).flatMap((s) => s.split(/[\n;]/).map((x) => x.trim()).filter(Boolean)),
  );

  return `Atualmente, a unidade ${unitName} possui ${total} demanda(s) em acompanhamento, sendo ${andamento} em andamento, ${atrasadas} atrasada(s), ${urgentes} urgente(s) e ${concluidasMes} concluída(s) no mês. As principais demandas estão relacionadas a ${tipos}. As dependências mais relevantes envolvem ${dependencias}. As próximas etapas previstas são ${proximas}.`;
}

/** Resumo individual da demanda */
export function buildDemandSummary(d: OperationalDemand, lastUpdateText?: string): string {
  const status = DEMAND_STATUS_LABEL[d.status];
  const prazo = d.prazo_estimado
    ? format(new Date(d.prazo_estimado), "dd/MM/yyyy", { locale: ptBR })
    : 'sem prazo definido';
  const proximas = (d.proximas_etapas ?? '').trim() || '—';
  const dependencias = (d.dependencies ?? '').trim() || '—';
  const pontos = (d.attention_points ?? '').trim() || '—';
  const ultima = (lastUpdateText ?? '').trim() || 'sem atualizações registradas até o momento';
  return `A demanda "${d.nome}" (${d.code}), vinculada à(s) unidade(s) ${d.unidade}, encontra-se com status ${status} e prioridade ${DEMAND_PRIORITY_LABEL[d.prioridade]}. O objetivo é ${d.objetivo}. A última atualização registrada informa que ${ultima}. As próximas etapas são ${proximas}, com prazo estimado para ${prazo}. As principais dependências são ${dependencias} e os pontos de atenção são ${pontos}.`;
}
