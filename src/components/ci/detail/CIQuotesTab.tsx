import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCIQuotes, type CIQuote } from '@/hooks/useCIExtended';
import { EmptyState } from '@/components/ui/empty-state';
import { DollarSign, Plus, Trash2, Check } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { Badge } from '@/components/ui/badge';

export function CIQuotesTab({ ciId }: { ciId: string }) {
  const { data, isLoading, add, escolher, remove } = useCIQuotes(ciId);
  const [draft, setDraft] = useState<Partial<CIQuote>>({});

  async function handleAdd() {
    if (!draft.fornecedor?.trim()) return;
    await add.mutateAsync(draft);
    setDraft({});
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4 space-y-3">
        <h4 className="font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />Nova cotação</h4>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Fornecedor *</Label>
            <Input value={draft.fornecedor ?? ''} onChange={e => setDraft({ ...draft, fornecedor: e.target.value })} />
          </div>
          <div>
            <Label>Valor total (R$)</Label>
            <Input type="number" step="0.01" value={draft.valor_total ?? ''} onChange={e => setDraft({ ...draft, valor_total: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div>
            <Label>Prazo de entrega</Label>
            <Input value={draft.prazo_entrega ?? ''} onChange={e => setDraft({ ...draft, prazo_entrega: e.target.value })} placeholder="Ex: 15 dias úteis" />
          </div>
          <div className="sm:col-span-2">
            <Label>Condições de pagamento</Label>
            <Input value={draft.condicoes_pagamento ?? ''} onChange={e => setDraft({ ...draft, condicoes_pagamento: e.target.value })} placeholder="Ex: 30/60/90" />
          </div>
          <div>
            <Label>URL do anexo</Label>
            <Input value={draft.anexo_url ?? ''} onChange={e => setDraft({ ...draft, anexo_url: e.target.value })} placeholder="https://…" />
          </div>
          <div className="sm:col-span-3">
            <Label>Observações</Label>
            <Textarea rows={2} value={draft.observacoes ?? ''} onChange={e => setDraft({ ...draft, observacoes: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end">
          <LoadingButton loading={add.isPending} onClick={handleAdd} disabled={!draft.fornecedor?.trim()}>
            <Plus className="h-4 w-4 mr-2" />Adicionar cotação
          </LoadingButton>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando…</div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={DollarSign} title="Nenhuma cotação" description="Cadastre as cotações recebidas dos fornecedores." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2">Fornecedor</th>
                <th className="px-4 py-2">Valor</th>
                <th className="px-4 py-2">Prazo</th>
                <th className="px-4 py-2">Pagamento</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {data.map(q => (
                <tr key={q.id} className={`border-t ${q.escolhida ? 'bg-emerald-50/50' : ''}`}>
                  <td className="px-4 py-2 font-medium">
                    {q.fornecedor}
                    {q.anexo_url && <a href={q.anexo_url} target="_blank" rel="noreferrer" className="text-xs text-primary ml-2 hover:underline">anexo</a>}
                  </td>
                  <td className="px-4 py-2">{q.valor_total ? `R$ ${q.valor_total.toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-2">{q.prazo_entrega ?? '—'}</td>
                  <td className="px-4 py-2">{q.condicoes_pagamento ?? '—'}</td>
                  <td className="px-4 py-2">
                    {q.escolhida ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Escolhida</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2 flex gap-1">
                    {!q.escolhida && (
                      <Button size="icon" variant="ghost" onClick={() => escolher.mutate(q.id)} title="Escolher esta cotação">
                        <Check className="h-4 w-4 text-emerald-600" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(q.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
