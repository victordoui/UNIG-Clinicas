import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Link2, X, Search, FileText, ShoppingCart } from 'lucide-react';
import {
  useDemandLinks, useAddDemandLink, useRemoveDemandLink, useSearchCIs, useSearchPRs,
} from '@/hooks/useOperationalDemands';

export function DemandLinksPanel({ demandId }: { demandId: string }) {
  const { data: links = [], isLoading } = useDemandLinks(demandId);
  const add = useAddDemandLink();
  const remove = useRemoveDemandLink();
  const [tab, setTab] = useState<'ci' | 'purchase_request'>('ci');
  const [term, setTerm] = useState('');
  const { data: cis = [] } = useSearchCIs(tab === 'ci' ? term : '');
  const { data: prs = [] } = useSearchPRs(tab === 'purchase_request' ? term : '');

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Link2 className="h-4 w-4" /> Adicionar vínculo
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="ci"><FileText className="h-3 w-3 mr-1" />CI</TabsTrigger>
            <TabsTrigger value="purchase_request"><ShoppingCart className="h-3 w-3 mr-1" />Requisição de Compra</TabsTrigger>
          </TabsList>

          <TabsContent value="ci" className="space-y-2 mt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por protocolo ou assunto da CI…"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>
            <div className="max-h-56 overflow-auto space-y-1">
              {term.length < 2 && <p className="text-xs text-muted-foreground p-2">Digite ao menos 2 caracteres.</p>}
              {cis.map((c: any) => (
                <button
                  key={c.id}
                  className="w-full text-left p-2 rounded hover:bg-muted text-sm flex items-center justify-between"
                  onClick={() => add.mutate({ demandId, link_type: 'ci', target_id: c.id, label: c.protocol })}
                >
                  <span className="truncate">
                    <b>{c.protocol}</b> — {c.subject}
                  </span>
                  <Badge variant="outline" className="text-[10px] ml-2">{c.status}</Badge>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="purchase_request" className="space-y-2 mt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por número ou descrição da requisição…"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>
            <div className="max-h-56 overflow-auto space-y-1">
              {term.length < 1 && <p className="text-xs text-muted-foreground p-2">Digite para buscar.</p>}
              {prs.map((p: any) => (
                <button
                  key={p.id}
                  className="w-full text-left p-2 rounded hover:bg-muted text-sm flex items-center justify-between"
                  onClick={() => add.mutate({ demandId, link_type: 'purchase_request', target_id: p.id, label: p.numero })}
                >
                  <span className="truncate">
                    <b>#{p.numero}</b> — {p.item_descricao}
                  </span>
                  <Badge variant="outline" className="text-[10px] ml-2">{p.status}</Badge>
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="p-4 space-y-2">
        <div className="text-sm font-semibold mb-1">Vínculos atuais ({links.length})</div>
        {isLoading && <p className="text-xs text-muted-foreground">Carregando…</p>}
        {!isLoading && links.length === 0 && (
          <p className="text-xs text-muted-foreground p-3 text-center">Nenhum vínculo cadastrado.</p>
        )}
        {links.map((l: any) => (
          <div key={l.id} className="flex items-center justify-between border rounded p-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              {l.link_type === 'ci' ? <FileText className="h-4 w-4 text-orange-500" /> : <ShoppingCart className="h-4 w-4 text-orange-500" />}
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {l.link_type === 'ci' ? 'CI' : 'Requisição'}{' '}
                  {l.target?.protocol ?? l.target?.numero ? `· ${l.target.protocol ?? '#' + l.target.numero}` : ''}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {l.target?.subject ?? l.target?.item_descricao ?? l.label ?? l.target_id}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {l.target?.status && <Badge variant="outline" className="text-[10px]">{l.target.status}</Badge>}
              <Button size="icon" variant="ghost" onClick={() => remove.mutate({ id: l.id, demandId })}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
