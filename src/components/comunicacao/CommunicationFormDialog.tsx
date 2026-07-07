import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CHANNEL_LABEL, CHANNEL_OPTIONS, PRIORITY_LABEL, PRIORITY_OPTIONS,
  TARGET_TYPE_LABEL, TARGET_TYPE_OPTIONS,
  type CommChannel, type CommPriority, type CommTargetType, type CommStatus,
} from '@/lib/communication';
import { useCreateCommunication } from '@/hooks/useCommunication';
import { toast } from '@/hooks/use-toast';

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export function CommunicationFormDialog({ open, onOpenChange }: Props) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState<CommChannel>('sistema');
  const [priority, setPriority] = useState<CommPriority>('normal');
  const [targetType, setTargetType] = useState<CommTargetType>('todos');
  const [targetId, setTargetId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const create = useCreateCommunication();

  useEffect(() => {
    if (open) {
      setTitle(''); setMessage(''); setChannel('sistema'); setPriority('normal');
      setTargetType('todos'); setTargetId(''); setScheduledAt('');
    }
  }, [open]);

  const submit = async (status: CommStatus) => {
    if (!title.trim() || !message.trim()) {
      toast({ title: 'Preencha título e mensagem', variant: 'destructive' });
      return;
    }
    try {
      await create.mutateAsync({
        title, message, channel, priority, target_type: targetType,
        target_id: targetType !== 'todos' && targetId ? targetId : null,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        status,
      });
      toast({ title: status === 'enviado' ? 'Comunicado enviado' : status === 'agendado' ? 'Agendado' : 'Rascunho salvo' });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Novo comunicado direcionado</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Canal</Label>
              <Select value={channel} onValueChange={v => setChannel(v as CommChannel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNEL_OPTIONS.map(c => <SelectItem key={c} value={c}>{CHANNEL_LABEL[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={v => setPriority(v as CommPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Destino</Label>
              <Select value={targetType} onValueChange={v => setTargetType(v as CommTargetType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TARGET_TYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{TARGET_TYPE_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {targetType !== 'todos' && (
              <div>
                <Label>ID do destino</Label>
                <Input value={targetId} onChange={e => setTargetId(e.target.value)} placeholder="UUID" />
              </div>
            )}
          </div>
          <div>
            <Label>Agendar para (opcional)</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => submit('rascunho')} disabled={create.isPending}>Salvar rascunho</Button>
          {scheduledAt && <Button variant="outline" onClick={() => submit('agendado')} disabled={create.isPending}>Agendar</Button>}
          <Button onClick={() => submit('enviado')} disabled={create.isPending}>Enviar agora</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
