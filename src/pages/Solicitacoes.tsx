import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveTable, type ResponsiveColumn } from '@/components/ui/responsive-table';
import { FilterChips, type FilterChip } from '@/components/ui/filter-chips';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Search, FileText, ClipboardList, LayoutGrid, List } from 'lucide-react';
import { usePurchaseRequests } from '@/hooks/usePurchaseRequests';
import { NewPurchaseRequestModal } from '@/components/purchases/NewPurchaseRequestModal';
import { PurchaseKanban } from '@/components/purchases/PurchaseKanban';
import { STATUS_LABEL, STATUS_BADGE, PRIORITY_LABEL, PRIORITY_BADGE, formatBRL, type PurchaseStatus, type PurchasePriority } from '@/lib/purchaseLabels';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

const CAN_REQUEST_ROLES = ['super_admin', 'administrador', 'coordenador_operacoes', 'gerente_geral', 'compras', 'gestor_aprovador', 'solicitante'];

interface Props { mine?: boolean; }

export default function Solicitacoes({ mine = false }: Props) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = (params.get('view') as 'list' | 'kanban') || 'list';
  const status = (params.get('status') as PurchaseStatus | 'all') || 'all';
  const prioridade = (params.get('prioridade') as PurchasePriority | 'all') || 'all';
  const search = params.get('q') || '';
  const setor = params.get('setor') || '';
  const [openNew, setOpenNew] = useState(false);
  const { user, unigRole } = useAuth();
  const canCreate = CAN_REQUEST_ROLES.includes(unigRole);

  const { data: allData = [], isLoading } = usePurchaseRequests({
    status: view === 'kanban' ? 'all' : status,
    prioridade,
    search: search || undefined,
    setor: setor || undefined,
  });
  const data = mine && user ? allData.filter(r => r.solicitante_id === user.id) : allData;

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-6 w-6 text-primary" /> {mine ? 'Minhas Requisições' : 'Solicitações de Compra'}</h1>
            <p className="text-muted-foreground">{mine ? 'Suas requisições de compra' : 'Abra, acompanhe e gerencie as solicitações da sua organização'}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Tabs value={view} onValueChange={v => setParam('view', v === 'list' ? '' : v)}>
              <TabsList>
                <TabsTrigger value="list"><List className="h-4 w-4 mr-1" />Lista</TabsTrigger>
                <TabsTrigger value="kanban"><LayoutGrid className="h-4 w-4 mr-1" />Kanban</TabsTrigger>
              </TabsList>
            </Tabs>
            {canCreate && (
              <Button onClick={() => setOpenNew(true)}>
                <Plus className="h-4 w-4 mr-2" /> Nova Solicitação
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por número ou item…"
                value={search} onChange={e => setParam('q', e.target.value)} />
            </div>
            <Select value={status} onValueChange={v => setParam('status', v)} disabled={view === 'kanban'}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {(Object.keys(STATUS_LABEL) as PurchaseStatus[]).map(k =>
                  <SelectItem key={k} value={k}>{STATUS_LABEL[k]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={prioridade} onValueChange={v => setParam('prioridade', v)}>
              <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as prioridades</SelectItem>
                {(Object.keys(PRIORITY_LABEL) as PurchasePriority[]).map(k =>
                  <SelectItem key={k} value={k} data-option-domain="priority">{PRIORITY_LABEL[k]}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {(() => {
          const labelMap: Record<string, string> = {
            q: 'Busca',
            status: 'Status',
            prioridade: 'Prioridade',
            setor: 'Setor',
          };
          const active: Array<[string, string]> = [];
          if (search) active.push(['q', search]);
          if (status && status !== 'all') active.push(['status', STATUS_LABEL[status as PurchaseStatus] ?? String(status)]);
          if (prioridade && prioridade !== 'all') active.push(['prioridade', PRIORITY_LABEL[prioridade as PurchasePriority] ?? String(prioridade)]);
          if (setor) active.push(['setor', setor]);
          const chips: FilterChip[] = active.map(([k, v]) => ({
            key: k,
            label: labelMap[k] ?? k,
            value: v,
            onRemove: () => setParam(k, ''),
          }));
          return <FilterChips chips={chips} onClearAll={() => { setParam('q',''); setParam('status',''); setParam('prioridade',''); setParam('setor',''); }} />;
        })()}

        {isLoading ? (
          <Card><CardContent className="p-4"><TableSkeleton rows={5} columns={6} /></CardContent></Card>
        ) : data.length === 0 ? (
          <Card><CardContent className="p-0">
            <EmptyState
              icon={FileText}
              title="Nenhuma solicitação encontrada"
              description="Crie a primeira solicitação de compra para iniciar o fluxo."
              action={<Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-2" />Nova Solicitação</Button>}
            />
          </CardContent></Card>
        ) : view === 'kanban' ? (
          <PurchaseKanban requests={data} />
        ) : (
          <Card>
            <CardContent className="p-2 md:p-0">
              <ResponsiveTable
                data={data}
                rowKey={(r) => r.id}
                onRowClick={(r) => navigate(`/solicitacoes/${r.id}`)}
                columns={[
                  {
                    key: 'numero',
                    header: 'Número',
                    cell: (r) => <span className="font-mono text-xs">{r.numero}</span>,
                  },
                  {
                    key: 'item',
                    header: 'Item',
                    mobilePrimary: true,
                    cell: (r) => (
                      <div>
                        <div className="font-medium line-clamp-1">{r.item_descricao}</div>
                        {r.setor && <div className="text-xs text-muted-foreground">{r.setor}</div>}
                      </div>
                    ),
                  },
                  { key: 'qtd', header: 'Qtd', cell: (r) => r.quantidade },
                  { key: 'valor', header: 'Valor estimado', cell: (r) => formatBRL(r.valor_estimado) },
                  {
                    key: 'prioridade',
                    header: 'Prioridade',
                    cell: (r) => (
                      <Badge variant="outline" className={PRIORITY_BADGE[r.prioridade]}>
                        {PRIORITY_LABEL[r.prioridade]}
                      </Badge>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    cell: (r) => (
                      <Badge variant="outline" className={STATUS_BADGE[r.status]}>
                        {STATUS_LABEL[r.status]}
                      </Badge>
                    ),
                  },
                  {
                    key: 'criada',
                    header: 'Criada em',
                    hideOnMobile: true,
                    cell: (r) => (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    ),
                  },
                ]}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <NewPurchaseRequestModal open={openNew} onOpenChange={setOpenNew} />
    </MainLayout>
  );
}
