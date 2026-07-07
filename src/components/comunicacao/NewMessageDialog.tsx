import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useProfilesSearch, useSendMessage } from '@/hooks/useCommunication';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSent?: (userId: string, name: string) => void;
}

export function NewMessageDialog({ open, onOpenChange, onSent }: Props) {
  const { user } = useAuth();
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [body, setBody] = useState('');
  const { data: profiles = [] } = useProfilesSearch(term);
  const send = useSendMessage();

  useEffect(() => {
    if (open) { setTerm(''); setSelected(null); setBody(''); }
  }, [open]);

  const submit = async () => {
    if (!selected || !body.trim()) {
      toast({ title: 'Selecione um destinatário e escreva a mensagem', variant: 'destructive' });
      return;
    }
    try {
      await send.mutateAsync({ recipient_id: selected.id, body: body.trim() });
      toast({ title: 'Mensagem enviada' });
      onOpenChange(false);
      onSent?.(selected.id, selected.name);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const filtered = profiles.filter((p: any) => p.id !== user?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova mensagem</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Destinatário</Label>
            {selected ? (
              <div className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
                <span className="truncate">{selected.name}</span>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Trocar</Button>
              </div>
            ) : (
              <>
                <Input placeholder="Buscar por nome ou e-mail…" value={term} onChange={e => setTerm(e.target.value)} />
                {filtered.length > 0 && (
                  <ul className="mt-2 max-h-40 overflow-y-auto border rounded-md divide-y">
                    {filtered.slice(0, 8).map((p: any) => (
                      <li key={p.id}>
                        <button
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                          onClick={() => setSelected({ id: p.id, name: p.full_name || p.email })}
                        >
                          <p className="font-medium truncate">{p.full_name || p.email}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={send.isPending}>Enviar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
