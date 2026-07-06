import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRequirementCategories } from '@/hooks/useStudentData';
import { useCreateRequirement, useUploadRequirementAttachment } from '@/hooks/useRequirements';
import { toast } from '@/hooks/use-toast';
import { Plus, Loader2 } from 'lucide-react';

export function NewRequirementDialog({ studentId, trigger, defaultCategoryId }: {
  studentId?: string; trigger?: React.ReactNode; defaultCategoryId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [file, setFile] = useState<File | null>(null);
  const { data: categories = [] } = useRequirementCategories();
  const createReq = useCreateRequirement();
  const upload = useUploadRequirementAttachment();

  const category = categories.find((c: any) => c.id === categoryId);
  const requiresAttachment = !!category?.requires_attachment;

  const reset = () => {
    setCategoryId(defaultCategoryId ?? ''); setTitle(''); setDescription(''); setPriority('normal'); setFile(null);
  };

  const submit = async () => {
    if (!studentId) return toast({ title: 'Perfil de aluno não encontrado', variant: 'destructive' });
    if (!categoryId || !title.trim()) return toast({ title: 'Preencha categoria e título', variant: 'destructive' });
    if (requiresAttachment && !file) return toast({ title: 'Esta categoria exige um anexo', variant: 'destructive' });
    try {
      const req = await createReq.mutateAsync({
        studentId, categoryId, title: title.trim(), description: description.trim() || undefined,
        priority, slaDays: category?.sla_days ?? 7,
      });
      if (file) await upload.mutateAsync({ requirementId: req.id, file });
      toast({ title: 'Requerimento aberto', description: `Protocolo ${req.protocol_number}` });
      setOpen(false); reset();
    } catch (e: any) {
      toast({ title: 'Erro ao abrir requerimento', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo requerimento</Button>}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Novo requerimento</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
              <SelectContent>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}{c.department ? ` — ${c.department}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {category && (
              <p className="text-xs text-muted-foreground mt-1">
                SLA: {category.sla_days} dias{requiresAttachment && ' · anexo obrigatório'}
              </p>
            )}
          </div>
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="Ex: Solicitação de histórico" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1500} rows={4} placeholder="Detalhe seu pedido" />
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Anexo {requiresAttachment && <span className="text-rose-600">*</span>}</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={createReq.isPending || upload.isPending}>
            {(createReq.isPending || upload.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Abrir requerimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
