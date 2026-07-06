import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useUpsert, useUnits } from '@/hooks/useAcademicData';

export function CourseFormDialog({ row, trigger }: { row?: any; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const { data: units = [] } = useUnits();
  const upsert = useUpsert('courses', ['courses']);

  useEffect(() => {
    if (open) setForm(row ? { ...row } : { status: 'active', degree_type: 'graduacao', modality: 'presencial', duration_semesters: 8 });
  }, [open, row]);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.code) return toast({ title: 'Preencha nome e código', variant: 'destructive' });
    try {
      const { id, unit, created_at, updated_at, ...values } = form;
      values.duration_semesters = Number(values.duration_semesters) || 8;
      await upsert.mutateAsync({ id: row?.id, values });
      toast({ title: row ? 'Curso atualizado' : 'Curso cadastrado' });
      setOpen(false);
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{row ? 'Editar curso' : 'Novo curso'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><Label>Nome *</Label><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></div>
          <div><Label>Código *</Label><Input value={form.code ?? ''} onChange={(e) => set('code', e.target.value)} /></div>
          <div><Label>Duração (semestres)</Label><Input type="number" value={form.duration_semesters ?? 8} onChange={(e) => set('duration_semesters', e.target.value)} /></div>
          <div><Label>Tipo</Label>
            <Select value={form.degree_type ?? 'graduacao'} onValueChange={(v) => set('degree_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="graduacao">Graduação</SelectItem>
                <SelectItem value="pos_graduacao">Pós-graduação</SelectItem>
                <SelectItem value="mestrado">Mestrado</SelectItem>
                <SelectItem value="doutorado">Doutorado</SelectItem>
                <SelectItem value="tecnico">Técnico</SelectItem>
                <SelectItem value="extensao">Extensão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Modalidade</Label>
            <Select value={form.modality ?? 'presencial'} onValueChange={(v) => set('modality', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="presencial">Presencial</SelectItem>
                <SelectItem value="ead">EAD</SelectItem>
                <SelectItem value="hibrido">Híbrido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Coordenador</Label><Input value={form.coordinator_name ?? ''} onChange={(e) => set('coordinator_name', e.target.value)} /></div>
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
