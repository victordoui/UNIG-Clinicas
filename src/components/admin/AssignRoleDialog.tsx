import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ALL_UNIG_ROLES, UNIG_ROLE_LABEL, type UnigRole } from '@/lib/unigRoles';
import { useAdminUnits, useAssignRole } from '@/hooks/useAdmin';
import { toast } from '@/hooks/use-toast';

const NO_UNIT = '__none__';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  userName: string;
}

export function AssignRoleDialog({ open, onOpenChange, userId, userName }: Props) {
  const [role, setRole] = useState<UnigRole>('aluno');
  const [unitId, setUnitId] = useState<string>(NO_UNIT);
  const { data: units = [] } = useAdminUnits();
  const assign = useAssignRole();

  const submit = async () => {
    try {
      await assign.mutateAsync({ userId, role, unitId: unitId === NO_UNIT ? null : unitId });
      toast({ title: 'Papel atribuído', description: `${UNIG_ROLE_LABEL[role]} para ${userName}.` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? 'Falha ao atribuir papel.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Atribuir papel a {userName}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Papel</Label>
            <Select value={role} onValueChange={v => setRole(v as UnigRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_UNIG_ROLES.map(r => (
                  <SelectItem key={r} value={r}>{UNIG_ROLE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unidade (opcional)</Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_UNIT}>Nenhuma / Global</SelectItem>
                {(units as any[]).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={assign.isPending}>{assign.isPending ? 'Salvando…' : 'Atribuir'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
