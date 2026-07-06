import { useMemo, useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Inbox, CheckCircle2, Search } from 'lucide-react';
import { useInbox, type InboxKind, type InboxItem } from '@/hooks/useInbox';
import { InboxCard } from '@/components/inbox/InboxCard';
import { BulkActionBar } from '@/components/inbox/BulkActionBar';

type Tab = 'all' | InboxKind;

function isBulkable(i: InboxItem) {
  return (i.kind === 'approval' && !!i.approvalStepId) || (i.kind === 'council' && !!i.proposalId);
}

interface Props { title?: string }
export default function CaixaEntrada({ title = "Caixa de entrada" }: Props) {
  const { items, counts, isLoading } = useInbox();
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = items;
    if (tab !== 'all') list = list.filter((i) => i.kind === tab);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(s) ||
          (i.subtitle ?? '').toLowerCase().includes(s) ||
          (i.reference ?? '').toLowerCase().includes(s),
      );
    }
    return list;
  }, [items, tab, search]);

  // Reset selection when filters change
  useEffect(() => {
    setSelected(new Set());
  }, [tab, search]);

  // Drop selected IDs that disappeared (after bulk actions)
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(items.map((i) => i.id));
      const next = new Set<string>();
      prev.forEach((id) => ids.has(id) && next.add(id));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  const bulkableFiltered = useMemo(() => filtered.filter(isBulkable), [filtered]);
  const selectedItems = useMemo(
    () => items.filter((i) => selected.has(i.id) && isBulkable(i)),
    [items, selected],
  );

  const allSelected = bulkableFiltered.length > 0 && bulkableFiltered.every((i) => selected.has(i.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        bulkableFiltered.forEach((i) => next.delete(i.id));
        return next;
      }
      const next = new Set(prev);
      bulkableFiltered.forEach((i) => next.add(i.id));
      return next;
    });
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-6 animate-fade-in pb-28">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="h-6 w-6 text-primary" />
            {title}
          </h1>
          <p className="text-muted-foreground">Tudo que aguarda sua atenção em um só lugar</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="w-full md:w-auto">
            <TabsList className="w-full md:w-auto overflow-x-auto flex-nowrap whitespace-nowrap justify-start">
              <TabsTrigger value="all">Tudo ({counts.all})</TabsTrigger>
              <TabsTrigger value="approval">Aprovar ({counts.approval})</TabsTrigger>
              <TabsTrigger value="council">Votar ({counts.council})</TabsTrigger>
              <TabsTrigger value="ci">Minhas CIs ({counts.ci})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {bulkableFiltered.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} id="select-all" />
            <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
              Selecionar todos ({bulkableFiltered.length})
            </label>
            {selected.size > 0 && (
              <Button variant="link" size="sm" className="h-auto p-0 ml-2" onClick={() => setSelected(new Set())}>
                Limpar seleção
              </Button>
            )}
          </div>
        )}

        {isLoading ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Carregando…</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
              <p className="text-muted-foreground">Nada pendente. Bom trabalho!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((item) => (
              <InboxCard
                key={item.id}
                item={item}
                selectable
                selected={selected.has(item.id)}
                onToggleSelect={() => toggleOne(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedItems.length > 0 && (
        <BulkActionBar
          items={selectedItems}
          onDone={() => setSelected(new Set())}
          onClear={() => setSelected(new Set())}
        />
      )}
    </MainLayout>
  );
}
