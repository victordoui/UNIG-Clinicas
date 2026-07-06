import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useUpsert, useUnits } from '@/hooks/useAcademicData';

export function ProfessorFormDialog({ row, trigger }: { row?: any; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const { data: units = [] } = useUnits();
  const upsert = useUpsert('professors', ['professors']);

  useEffect(() => { if (open) setForm(row ? { ...row } : { status: 'active' }); }, [open, row]);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.full_name || !form.registration || !form.email) return toast({ title: 'Preencha nome, matrícula e e-mail', variant: 'destructive' });
    try {
      const { id, unit, created_at, updated_at, ...values } = form;
      await upsert.mutateAsync({ id: row?.id, values });
      toast({ title: row ? 'Professor atualizado' : 'Professor cadastrado' });
      setOpen(false);
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{row ? 'Editar professor' : 'Novo professor'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><Label>Nome completo *</Label><Input value={form.full_name ?? ''} onChange={(e) => set('full_name', e.target.value)} /></div>
          <div><Label>Matrícula *</Label><Input value={form.registration ?? ''} onChange={(e) => set('registration', e.target.value)} /></div>
          <div><Label>E-mail *</Label><Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></div>
          <div><Label>Telefone</Label><Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></div>
          <div><Label>Titulação</Label>
            <Select value={form.title ?? 'none'} onValueChange={(v) => set('title', v === 'none' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="graduado">Graduado</SelectItem>
                <SelectItem value="especialista">Especialista</SelectItem>
                <SelectItem value="mestre">Mestre</SelectItem>
                <SelectItem value="doutor">Doutor</SelectItem>
                <SelectItem value="pos_doutor">Pós-doutor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Departamento</Label><Input value={form.department ?? ''} onChange={(e) => set('department', e.target.value)} /></div>
          <div><Label>Unidade</Label>
            <Select value={form.unit_id ?? 'none'} onValueChange={(v) => set('unit_id', v === 'none' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select value={form.status ?? 'active'} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={upsert.isPending}>{upsert.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
