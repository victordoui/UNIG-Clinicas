import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAddRequirementComment, useRequirementComments } from '@/hooks/useRequirements';
import { toast } from '@/hooks/use-toast';
import { Loader2, MessageSquare } from 'lucide-react';

export function RequirementCommentThread({ requirementId, canInternal }: { requirementId: string; canInternal?: boolean }) {
  const { data: comments = [], isLoading } = useRequirementComments(requirementId);
  const add = useAddRequirementComment();
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const submit = async () => {
    if (!body.trim()) return;
    try {
      await add.mutateAsync({ requirementId, body: body.trim(), isInternal: canInternal ? isInternal : false });
      setBody(''); setIsInternal(false);
    } catch (e: any) {
      toast({ title: 'Erro ao enviar comentário', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4" />Comentários</div>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!isLoading && comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum comentário ainda.</p>}
          {comments.map((c: any) => (
            <div key={c.id} className={`rounded-lg border p-3 ${c.is_internal ? 'bg-amber-50 border-amber-200' : 'bg-muted/40'}`}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span className="font-medium text-foreground">{c.author_name ?? 'Usuário'}</span>
                <span>· {new Date(c.created_at).toLocaleString('pt-BR')}</span>
                {c.is_internal && <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-300">Interno</Badge>}
              </div>
              <p className="text-sm whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2 pt-2 border-t">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={1500} placeholder="Escreva um comentário" />
          <div className="flex items-center justify-between">
            {canInternal ? (
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={isInternal} onCheckedChange={(v) => setIsInternal(!!v)} />
                Comentário interno (não visível ao aluno)
              </label>
            ) : <span />}
            <Button size="sm" onClick={submit} disabled={add.isPending || !body.trim()}>
              {add.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Enviar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
