import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AUDIENCE_LABEL, AUDIENCE_OPTIONS, type Audience } from '@/lib/communication';
import { useUpsertAnnouncement } from '@/hooks/useCommunication';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
}

export function AnnouncementFormDialog({ open, onOpenChange, initial }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('todos');
  const [publishedAt, setPublishedAt] = useState('');
  const upsert = useUpsertAnnouncement();

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? '');
      setBody(initial?.body ?? '');
      setAudience((initial?.audience as Audience) ?? 'todos');
      setPublishedAt(initial?.published_at ? initial.published_at.slice(0, 16) : new Date().toISOString().slice(0, 16));
    }
  }, [open, initial]);

  const submit = async () => {
    if (!title.trim() || !body.trim()) {
      toast({ title: 'Preencha título e conteúdo', variant: 'destructive' });
      return;
    }
    try {
      await upsert.mutateAsync({
        id: initial?.id,
        values: { title, body, audience, published_at: new Date(publishedAt).toISOString() },
      });
      toast({ title: initial?.id ? 'Comunicado atualizado' : 'Comunicado publicado' });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial?.id ? 'Editar comunicado' : 'Novo comunicado'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} maxLength={160} />
          </div>
          <div>
            <Label>Conteúdo</Label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} rows={6} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Público</Label>
              <Select value={audience} onValueChange={v => setAudience(v as Audience)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCE_OPTIONS.map(a => <SelectItem key={a} value={a}>{AUDIENCE_LABEL[a]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data de publicação</Label>
              <Input type="datetime-local" value={publishedAt} onChange={e => setPublishedAt(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={upsert.isPending}>
            {upsert.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
