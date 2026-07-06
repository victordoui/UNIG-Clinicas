import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUpdateRequirement, useStaffList } from '@/hooks/useRequirements';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function RequirementActionPanel({ req, onChanged }: { req: any; onChanged?: () => void }) {
  const { user } = useAuth();
  const update = useUpdateRequirement();
  const { data: staff = [] } = useStaffList();
  const [status, setStatus] = useState(req.status);
  const [priority, setPriority] = useState(req.priority ?? 'normal');
  const [assignee, setAssignee] = useState<string>(req.assigned_to ?? 'none');
  const [response, setResponse] = useState(req.response ?? '');

  const save = async (patch: Record<string, any>) => {
    try {
      await update.mutateAsync({ id: req.id, patch });
      toast({ title: 'Requerimento atualizado' });
      onChanged?.();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="text-sm font-semibold">Ações do atendimento</div>

        <div>
          <Label>Status</Label>
          <div className="flex gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="in_progress">Em análise</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => save({ status })} disabled={update.isPending}>Salvar</Button>
          </div>
        </div>

        <div>
          <Label>Prioridade</Label>
          <div className="flex gap-2">
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => save({ priority })}>Salvar</Button>
          </div>
        </div>

        <div>
          <Label>Atribuído a</Label>
          <div className="flex gap-2">
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger><SelectValue placeholder="Ninguém" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguém</SelectItem>
                {user && <SelectItem value={user.id}>Atribuir a mim</SelectItem>}
                {staff.filter((s: any) => s.id !== user?.id).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name ?? s.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => save({ assigned_to: assignee === 'none' ? null : assignee })}>Salvar</Button>
          </div>
        </div>

        <div>
          <Label>Resposta oficial</Label>
          <Textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={4} maxLength={2000} placeholder="Escreva a resposta que será enviada ao aluno" />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => save({ response, status: 'completed' })} disabled={update.isPending || !response.trim()}>
              {update.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Concluir com resposta
            </Button>
            <Button size="sm" variant="outline" onClick={() => save({ response })}>Salvar rascunho</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
