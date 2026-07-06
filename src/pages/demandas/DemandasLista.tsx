import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Eye, Pencil, Archive } from 'lucide-react';
import {
  useOperationalDemands, DEMAND_STATUS, DEMAND_STATUS_LABEL,
  DEMAND_PRIORITY, DEMAND_PRIORITY_LABEL, DEMAND_TYPE_LABEL, useIsDemandsManagerView,
} from '@/hooks/useOperationalDemands';
import { DemandStatusBadge, DemandPriorityBadge } from '@/components/demandas/DemandBadges';
import { ManagerSummaryDialog } from '@/components/demandas/ManagerSummaryDialog';
import { buildDemandSummary } from '@/lib/demandSummary';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DemandasLista() {
  const isManagerView = useIsDemandsManagerView();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [prioridadeFilter, setPrioridadeFilter] = useState<string>('all');
  const [unidadeFilter, setUnidadeFilter] = useState<string>('all');

  const { data: demands = [], isLoading } = useOperationalDemands({
    search,
    status: statusFilter as any,
    prioridade: prioridadeFilter as any,
    unidade: unidadeFilter,
  });

  const unidades = useMemo(
    () => Array.from(new Set(demands.map((d) => d.unidade).filter(Boolean))).sort(),
    [demands],
  );

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{isManagerView ? 'Demandas em Andamento' : 'Minhas Demandas em Andamento'}</h1>
          <p className="text-sm text-muted-foreground">
            {isManagerView
              ? 'Visão completa das demandas e projetos conduzidos pelos gestores.'
              : 'Acompanhe e atualize suas demandas para manter o Gerente Geral informado.'}
          </p>
        </div>
        <Button asChild>
          <Link to="/demandas/nova"><Plus className="h-4 w-4 mr-1" /> Nova atualização</Link>
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Buscar pelo nome…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {DEMAND_STATUS.map((s) => <SelectItem key={s} value={s}>{DEMAND_STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
            <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              {DEMAND_PRIORITY.map((p) => <SelectItem key={p} value={p}>{DEMAND_PRIORITY_LABEL[p]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
            <SelectTrigger><SelectValue placeholder="Unidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as unidades</SelectItem>
              {unidades.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="whitespace-nowrap">Código</TableHead>
                <TableHead className="whitespace-nowrap">Demanda</TableHead>
                <TableHead className="whitespace-nowrap">Unidade</TableHead>
                <TableHead className="whitespace-nowrap">Tipo</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="whitespace-nowrap">Prioridade</TableHead>
                <TableHead className="whitespace-nowrap">Responsável</TableHead>
                <TableHead className="whitespace-nowrap">Dependências</TableHead>
                <TableHead className="whitespace-nowrap">Prazo</TableHead>
                <TableHead className="whitespace-nowrap">Atualizada</TableHead>
                <TableHead className="whitespace-nowrap text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
              )}
              {!isLoading && demands.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Nenhuma demanda encontrada.</TableCell></TableRow>
              )}
              {demands.map((d) => (
                <TableRow key={d.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">{d.code}</TableCell>
                  <TableCell className="font-medium max-w-[260px] truncate">{d.nome}</TableCell>
                  <TableCell className="whitespace-nowrap">{d.unidade}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{DEMAND_TYPE_LABEL[d.tipo]}</TableCell>
                  <TableCell><DemandStatusBadge status={d.status} /></TableCell>
                  <TableCell><DemandPriorityBadge priority={d.prioridade} /></TableCell>
                  <TableCell className="whitespace-nowrap">{d.gestor?.full_name ?? '—'}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={d.dependencies ?? ''}>
                    {d.dependencies ? d.dependencies : '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {d.prazo_estimado ? format(new Date(d.prazo_estimado), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {format(new Date(d.updated_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="inline-flex gap-1 items-center">
                      <Button asChild size="icon" variant="ghost" title="Visualizar">
                        <Link to={`/demandas/${d.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                      <Button asChild size="icon" variant="ghost" title="Editar">
                        <Link to={`/demandas/${d.id}?tab=editar`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <ManagerSummaryDialog
                        buildSummary={() => buildDemandSummary(d)}
                        triggerLabel=""
                        triggerVariant="ghost"
                        triggerSize="icon"
                      />
                      <Button size="icon" variant="ghost" title="Arquivar" disabled>
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
