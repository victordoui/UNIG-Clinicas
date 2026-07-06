import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LoadingButton } from '@/components/ui/loading-button';
import { Star, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEvaluationByOrder, useUpsertEvaluation } from '@/hooks/useSupplierEvaluations';
import { useAuth } from '@/hooks/useAuth';

interface Props { orderId: string; supplierId: string; }

const CRITERIA: Array<{ key: 'pontualidade'|'qualidade'|'atendimento'|'preco'; label: string }> = [
  { key: 'pontualidade', label: 'Pontualidade' },
  { key: 'qualidade', label: 'Qualidade' },
  { key: 'atendimento', label: 'Atendimento' },
  { key: 'preco', label: 'Preço' },
];

function Stars({ value, onChange, readOnly }: { value: number; onChange?: (n: number) => void; readOnly?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button
          key={n} type="button" disabled={readOnly}
          onClick={() => onChange?.(n)}
          className={cn('transition-transform', !readOnly && 'hover:scale-110')}
          aria-label={`${n} estrelas`}
        >
          <Star className={cn('h-5 w-5', n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
        </button>
      ))}
    </div>
  );
}

export function SupplierEvaluationCard({ orderId, supplierId }: Props) {
  const { unigRole } = useAuth();
  const { data: existing, isLoading } = useEvaluationByOrder(orderId);
  const upsert = useUpsertEvaluation();
  const canEdit = ['administrador','coordenador_operacoes','gerente_geral','compras','super_admin'].includes(unigRole);

  const [editing, setEditing] = useState(false);
  const [vals, setVals] = useState({ pontualidade: 5, qualidade: 5, atendimento: 5, preco: 5 });
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (existing) {
      setVals({
        pontualidade: existing.pontualidade, qualidade: existing.qualidade,
        atendimento: existing.atendimento, preco: existing.preco,
      });
      setComment(existing.comentario ?? '');
    }
  }, [existing]);

  const submit = async () => {
    await upsert.mutateAsync({
      id: existing?.id, supplier_id: supplierId, order_id: orderId,
      ...vals, comentario: comment || null,
    });
    setEditing(false);
  };

  const showForm = editing || (!existing && canEdit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <ThumbsUp className="h-4 w-4" /> Avaliar fornecedor
        </CardTitle>
        {existing && canEdit && !editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Editar</Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : showForm ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CRITERIA.map(c => (
                <div key={c.key} className="flex items-center justify-between gap-3 border rounded-lg p-3">
                  <span className="text-sm font-medium">{c.label}</span>
                  <Stars value={vals[c.key]} onChange={n => setVals(v => ({ ...v, [c.key]: n }))} />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Comentário (opcional)</label>
              <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-2">
              <LoadingButton loading={upsert.isPending} onClick={submit}>Salvar avaliação</LoadingButton>
              {editing && <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>}
            </div>
          </>
        ) : existing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CRITERIA.map(c => (
                <div key={c.key} className="border rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">{c.label}</div>
                  <Stars value={existing[c.key]} readOnly />
                </div>
              ))}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Nota geral: </span>
              <span className="font-semibold text-base">{Number(existing.nota_geral).toFixed(2)}</span>
            </div>
            {existing.comentario && (
              <p className="text-sm text-muted-foreground italic">"{existing.comentario}"</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sem avaliação registrada.</p>
        )}
      </CardContent>
    </Card>
  );
}
