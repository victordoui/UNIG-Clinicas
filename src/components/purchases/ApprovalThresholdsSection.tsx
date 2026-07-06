import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Workflow } from 'lucide-react';
import { formatBRL } from '@/lib/purchaseLabels';

interface Threshold {
  id: string;
  organization_id: string;
  valor_min: number;
  valor_max: number | null;
  papel_aprovador: 'compras' | 'gestor_aprovador' | 'administrador';
  ordem: number;
}

const ROLE_LABEL: Record<Threshold['papel_aprovador'], string> = {
  compras: 'Compras',
  gestor_aprovador: 'Gestor / Aprovador',
  administrador: 'Administrador',
};

export function ApprovalThresholdsSection() {
  const { organization, unigRole } = useAuth();
  const { toast } = useToast();
  const [list, setList] = useState<Threshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewValue, setPreviewValue] = useState<number | ''>('');
  const [draft, setDraft] = useState({
    valor_min: 0,
    valor_max: '' as number | '',
    papel_aprovador: 'gestor_aprovador' as Threshold['papel_aprovador'],
    ordem: 1,
  });

  const canManage = unigRole === 'administrador' || unigRole === 'coordenador_operacoes' || unigRole === 'gerente_geral' || unigRole === 'super_admin';

  const load = async () => {
    if (!organization) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('approval_thresholds')
      .select('*')
      .eq('organization_id', organization.organization_id)
      .order('ordem', { ascending: true });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    setList((data ?? []) as Threshold[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [organization?.organization_id]);

  const add = async () => {
    if (!organization) return;
    const payload = {
      organization_id: organization.organization_id,
      valor_min: Number(draft.valor_min) || 0,
      valor_max: draft.valor_max === '' ? null : Number(draft.valor_max),
      papel_aprovador: draft.papel_aprovador,
      ordem: Number(draft.ordem) || 1,
    };
    const { error } = await supabase.from('approval_thresholds').insert(payload);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({ title: 'Faixa adicionada' });
    setDraft({ valor_min: 0, valor_max: '', papel_aprovador: 'gestor_aprovador', ordem: list.length + 1 });
    load();
  };

  const remove = async (id: string) => {
    const { error, data } = await supabase.from('approval_thresholds').delete().eq('id', id).select();
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    if (!data?.length) return toast({ title: 'Sem permissão', variant: 'destructive' });
    toast({ title: 'Faixa removida' });
    load();
  };

  if (!canManage) {
    return (
      <Card><CardContent className="py-10 text-center text-muted-foreground">
        Apenas administradores da organização podem gerenciar faixas de aprovação.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Workflow className="h-5 w-5" /> Faixas de Aprovação por Valor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Defina quem aprova solicitações conforme o valor estimado. A ordem determina a sequência da cadeia de aprovação.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Valor mín. (R$)</label>
              <Input type="number" step="0.01" value={draft.valor_min}
                onChange={e => setDraft(d => ({ ...d, valor_min: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Valor máx. (R$) — vazio = sem limite</label>
              <Input type="number" step="0.01" value={draft.valor_max}
                onChange={e => setDraft(d => ({ ...d, valor_max: e.target.value === '' ? '' : Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Aprovador</label>
              <Select value={draft.papel_aprovador} onValueChange={(v: Threshold['papel_aprovador']) => setDraft(d => ({ ...d, papel_aprovador: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABEL) as Threshold['papel_aprovador'][]).map(k =>
                    <SelectItem key={k} value={k}>{ROLE_LABEL[k]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Ordem</label>
              <Input type="number" min={1} value={draft.ordem}
                onChange={e => setDraft(d => ({ ...d, ordem: Number(e.target.value) }))} />
            </div>
            <Button onClick={add}><Plus className="h-4 w-4 mr-2" /> Adicionar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground">Carregando…</div>
          ) : list.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">Nenhuma faixa configurada.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Faixa</TableHead>
                  <TableHead>Aprovador</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>{t.ordem}</TableCell>
                    <TableCell>
                      {formatBRL(t.valor_min)} {t.valor_max != null ? `até ${formatBRL(t.valor_max)}` : 'em diante'}
                    </TableCell>
                    <TableCell>{ROLE_LABEL[t.papel_aprovador]}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => remove(t.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Simular cadeia para um valor</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 items-end max-w-sm">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Valor de teste (R$)</label>
              <Input type="number" step="0.01" value={previewValue}
                onChange={e => setPreviewValue(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ex.: 1500" />
            </div>
          </div>
          {previewValue !== '' && (() => {
            const v = Number(previewValue);
            const matches = list
              .filter(t => v >= t.valor_min && (t.valor_max == null || v <= t.valor_max))
              .sort((a, b) => a.ordem - b.ordem);
            if (matches.length === 0) {
              return <p className="text-sm text-amber-600">Sem faixas configuradas para este valor — a aprovação cairá no Administrador por padrão.</p>;
            }
            return (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {matches.map((m, i) => (
                  <span key={m.id} className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{i + 1}. {ROLE_LABEL[m.papel_aprovador]}</span>
                    {i < matches.length - 1 && <span className="text-muted-foreground">→</span>}
                  </span>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
