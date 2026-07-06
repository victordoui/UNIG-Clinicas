import { useState, useMemo } from 'react';
import { useSupplierInbox, sortInbox, type SupplierInboxKind, type SupplierInboxItem, type SlaTone } from '@/hooks/useSupplierInbox';
import { useSupplierArchive } from '@/hooks/useSupplierArchive';
import { useBulkSupplierInbox } from '@/hooks/useBulkSupplierInbox';
import { SupplierInboxCard } from '@/components/supplier-inbox/SupplierInboxCard';
import { BulkSupplierActionBar } from '@/components/supplier-inbox/BulkSupplierActionBar';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Inbox, AlertTriangle, ArrowDownWideNarrow, Clock, Search, Archive } from 'lucide-react';

type Tab = 'all' | SupplierInboxKind;
type SortMode = 'urgent' | 'recent';
type PeriodFilter = 'todos' | '7d' | '30d' | '90d';
type SlaFilter = 'todos' | SlaTone;

const PERIOD_HOURS: Record<PeriodFilter, number | null> = {
  todos: null, '7d': 7 * 24, '30d': 30 * 24, '90d': 90 * 24,
};

export default function PortalCaixaEntrada() {
  const { items, counts, isLoading } = useSupplierInbox();
  const archive = useSupplierArchive();
  const bulk = useBulkSupplierInbox();

  const [section, setSection] = useState<'pending' | 'archive'>('pending');
  const [tab, setTab] = useState<Tab>('all');
  const [sort, setSort] = useState<SortMode>('urgent');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<PeriodFilter>('todos');
  const [slaFilter, setSlaFilter] = useState<SlaFilter>('todos');

  const filtered = useMemo(() => {
    let base = tab === 'all' ? items : items.filter((i) => i.kind === tab);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.subtitle?.toLowerCase().includes(q) ||
          i.reference?.toLowerCase().includes(q),
      );
    }
    const hours = PERIOD_HOURS[period];
    if (hours != null) {
      const cutoff = Date.now() - hours * 3_600_000;
      base = base.filter((i) => new Date(i.createdAt).getTime() >= cutoff);
    }
    if (slaFilter !== 'todos') {
      base = base.filter((i) => i.slaTone === slaFilter);
    }
    return sortInbox(base, sort);
  }, [items, tab, sort, search, period, slaFilter]);

  const selectedItems = useMemo(
    () => filtered.filter((i) => bulk.isSelected(i.id)),
    [filtered, bulk],
  );

  const archiveAsInbox: SupplierInboxItem[] = useMemo(
    () =>
      archive.items.map((a) => ({
        id: a.id,
        kind: a.kind === 'quote_resolved' ? 'quote' : a.kind === 'order_done' ? 'order' : 'nf',
        title: a.title,
        subtitle: a.subtitle,
        reference: a.reference,
        amount: a.amount,
        createdAt: a.resolvedAt,
        href: '/portal-fornecedor/caixa',
        ageHours: 0,
        slaTone: 'ok',
      })),
    [archive.items],
  );

  const hasFilter = search.trim() !== '' || period !== 'todos' || slaFilter !== 'todos';

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="h-6 w-6 text-primary" />
            Caixa de entrada
          </h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2 flex-wrap">
            <span>
              {counts.total > 0
                ? `${counts.total} ${counts.total === 1 ? 'item aguarda' : 'itens aguardam'} sua ação`
                : 'Nenhum item pendente'}
            </span>
            {counts.late > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> {counts.late} atrasado{counts.late === 1 ? '' : 's'}
              </Badge>
            )}
            {counts.warn > 0 && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 gap-1">
                <Clock className="h-3 w-3" /> {counts.warn} em atenção
              </Badge>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1 border rounded-md p-1 bg-card">
          <Button size="sm" variant={sort === 'urgent' ? 'default' : 'ghost'} onClick={() => setSort('urgent')} className="h-7 px-2 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Mais urgente
          </Button>
          <Button size="sm" variant={sort === 'recent' ? 'default' : 'ghost'} onClick={() => setSort('recent')} className="h-7 px-2 text-xs">
            <ArrowDownWideNarrow className="h-3.5 w-3.5 mr-1" /> Mais recente
          </Button>
        </div>
      </div>

      <Tabs value={section} onValueChange={(v) => { setSection(v as any); bulk.clear(); }}>
        <TabsList>
          <TabsTrigger value="pending">
            <Inbox className="h-4 w-4 mr-1" /> Pendentes
            <Badge variant="secondary" className="ml-2">{counts.total}</Badge>
          </TabsTrigger>
          <TabsTrigger value="archive">
            <Archive className="h-4 w-4 mr-1" /> Concluídos
            <Badge variant="secondary" className="ml-2">{archive.items.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr,180px,180px] gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, título…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os períodos</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Select value={slaFilter} onValueChange={(v) => setSlaFilter(v as SlaFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os SLAs</SelectItem>
                <SelectItem value="late">Atrasados</SelectItem>
                <SelectItem value="warn">Em atenção</SelectItem>
                <SelectItem value="ok">No prazo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); bulk.clear(); }}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">Tudo <Badge variant="secondary" className="ml-2">{counts.total}</Badge></TabsTrigger>
              <TabsTrigger value="cadastro">Cadastro <Badge variant="secondary" className="ml-2">{counts.cadastro}</Badge></TabsTrigger>
              <TabsTrigger value="docs">Documentos <Badge variant="secondary" className="ml-2">{counts.docs}</Badge></TabsTrigger>
              <TabsTrigger value="quote">Cotações <Badge variant="secondary" className="ml-2">{counts.quote}</Badge></TabsTrigger>
              <TabsTrigger value="order">Pedidos <Badge variant="secondary" className="ml-2">{counts.order}</Badge></TabsTrigger>
              <TabsTrigger value="nf">NF <Badge variant="secondary" className="ml-2">{counts.nf}</Badge></TabsTrigger>
              <TabsTrigger value="divergence">Divergências <Badge variant="secondary" className="ml-2">{counts.divergence}</Badge></TabsTrigger>
            </TabsList>
          </Tabs>

          {hasFilter && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span>{filtered.length} resultado(s) com filtros aplicados</span>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setSearch(''); setPeriod('todos'); setSlaFilter('todos'); }}>
                Limpar filtros
              </Button>
            </div>
          )}

          {(tab === 'order' || tab === 'nf') && filtered.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Button size="sm" variant="outline" className="h-7" onClick={() => bulk.selectAll(filtered.map((i) => i.id))}>
                Selecionar todos
              </Button>
              {bulk.selectedIds.size > 0 && (
                <Button size="sm" variant="ghost" className="h-7" onClick={bulk.clear}>Limpar</Button>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Card key={i}><CardContent className="p-4"><div className="h-16 animate-pulse bg-muted rounded" /></CardContent></Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Nada por aqui</p>
                <p className="text-sm">{hasFilter ? 'Tente ajustar os filtros.' : 'Você está em dia com suas pendências.'}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filtered.map((item) => (
                <SupplierInboxCard
                  key={item.id}
                  item={item}
                  selectable={tab === 'order' || tab === 'nf'}
                  selected={bulk.isSelected(item.id)}
                  onToggle={bulk.toggle}
                />
              ))}
            </div>
          )}

          <BulkSupplierActionBar
            selected={selectedItems}
            onClear={bulk.clear}
            onDone={bulk.clear}
          />
        </TabsContent>

        <TabsContent value="archive" className="space-y-4 mt-4">
          {archive.isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Card key={i}><CardContent className="p-4"><div className="h-16 animate-pulse bg-muted rounded" /></CardContent></Card>
              ))}
            </div>
          ) : archiveAsInbox.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Archive className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Nenhum histórico</p>
                <p className="text-sm">Itens concluídos dos últimos 90 dias aparecerão aqui.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {archiveAsInbox.map((item) => (
                <SupplierInboxCard key={item.id} item={item} archivedBadge="Concluído" hideOpen />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
