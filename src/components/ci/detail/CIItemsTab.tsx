import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCIItems, type CIItem } from '@/hooks/useCIExtended';
import { EmptyState } from '@/components/ui/empty-state';
import { Link as LinkIcon, Package, Plus, Trash2 } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';

function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/\S+)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (/^https?:\/\//i.test(part)) {
          return (
            <a
              key={`${part}-${index}`}
              href={part}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2 break-all"
            >
              {part}
            </a>
          );
        }
        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}

export function CIItemsTab({ ciId }: { ciId: string }) {
  const { data, isLoading, add, remove } = useCIItems(ciId);
  const [draft, setDraft] = useState<Partial<CIItem>>({ quantidade: 1 });

  async function handleAdd() {
    if (!draft.descricao?.trim()) return;
    await add.mutateAsync(draft);
    setDraft({ quantidade: 1 });
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4 space-y-3">
        <h4 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4 text-primary" />Adicionar item</h4>
        <div className="grid sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <Label>Descrição *</Label>
            <Input value={draft.descricao ?? ''} onChange={e => setDraft({ ...draft, descricao: e.target.value })} placeholder="Ex: Pen drive 16GB USB 3.0" />
          </div>
          <div>
            <Label>Quantidade</Label>
            <Input type="number" min={1} value={draft.quantidade ?? 1} onChange={e => setDraft({ ...draft, quantidade: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Unidade</Label>
            <Input value={draft.unidade ?? ''} onChange={e => setDraft({ ...draft, unidade: e.target.value })} placeholder="un, cx, kg" />
          </div>
          <div className="sm:col-span-4">
            <Label>Especificação</Label>
            <Textarea rows={2} value={draft.especificacao ?? ''} onChange={e => setDraft({ ...draft, especificacao: e.target.value })} placeholder="Marca, modelo, voltagem, etc." />
          </div>
          <div className="sm:col-span-4">
            <Label className="flex items-center gap-1.5"><LinkIcon className="h-3.5 w-3.5 text-primary" />Observações e links</Label>
            <Textarea rows={2} value={draft.observacao ?? ''} onChange={e => setDraft({ ...draft, observacao: e.target.value })} placeholder="Links de referência, observações de compra ou restrições do item." />
          </div>
        </div>
        <div className="flex justify-end">
          <LoadingButton loading={add.isPending} onClick={handleAdd} disabled={!draft.descricao?.trim()}>
            <Plus className="h-4 w-4 mr-2" />Adicionar
          </LoadingButton>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando…</div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={Package} title="Nenhum item" description="Adicione os itens solicitados nesta CI." />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2">Descrição</th>
                <th className="px-4 py-2">Qtd</th>
                <th className="px-4 py-2">Un</th>
                <th className="px-4 py-2">Especificação</th>
                <th className="px-4 py-2">Observações / links</th>
                <th className="px-4 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {data.map(it => (
                <tr key={it.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{it.descricao}</td>
                  <td className="px-4 py-2">{it.quantidade}</td>
                  <td className="px-4 py-2">{it.unidade ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{it.especificacao ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground whitespace-pre-line">
                    {it.observacao ? <LinkifiedText text={it.observacao} /> : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(it.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}
