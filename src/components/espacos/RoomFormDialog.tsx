import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IconSelect, type IconSelectOption } from '@/components/ui/icon-select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import {
  Building2,
  CheckCircle2,
  CircleDot,
  DoorOpen,
  Loader2,
  Mic,
  Monitor,
  PanelsTopLeft,
  Presentation,
  Projector,
  Sparkles,
  Star,
  Tv,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { useUpsertRoom } from '@/hooks/useRooms';
import { useUnits } from '@/hooks/useAcademicData';
import { ROOM_TYPE_LABEL, ROOM_STATUS_LABEL } from '@/lib/rooms';

function FeatureSwitch({ checked, onCheckedChange, icon: Icon, label }: { checked: boolean; onCheckedChange: (checked: boolean) => void; icon: LucideIcon; label: string }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2 text-sm transition-colors hover:bg-muted/40">
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <Icon className="h-4 w-4 text-primary" />
      <span>{label}</span>
    </label>
  );
}

export function RoomFormDialog({ row, trigger }: { row?: any; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const { data: units = [] } = useUnits();
  const upsert = useUpsertRoom();

  useEffect(() => {
    if (open) setForm(row ? { ...row } : {
      status: 'disponivel', room_type: 'sala_aula', capacity: 40,
      quality_tier: 'padrao', has_projector: false, has_air_conditioning: false, has_computer: false,
      has_audio_system: false, has_tv: false, has_whiteboard: false, has_interactive_screen: false,
    });
  }, [open, row]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const typeOptions: IconSelectOption[] = Object.entries(ROOM_TYPE_LABEL).map(([value, label]) => ({ value, label, icon: DoorOpen, iconClassName: 'text-violet-600' }));
  const statusOptions: IconSelectOption[] = Object.entries(ROOM_STATUS_LABEL).map(([value, label]) => ({
    value,
    label,
    icon: value === 'disponivel' ? CheckCircle2 : CircleDot,
    iconClassName: value === 'disponivel' ? 'text-emerald-600' : 'text-amber-600',
  }));
  const unitOptions: IconSelectOption[] = [
    { value: 'none', label: 'Nenhuma unidade', icon: Building2 },
    ...units.map((unit: any) => ({ value: unit.id, label: unit.name, icon: Building2, iconClassName: 'text-sky-600' })),
  ];
  const qualityOptions: IconSelectOption[] = [
    { value: 'padrao', label: 'Padrão', icon: Star },
    { value: 'semi_premium', label: 'Semi Premium', icon: Star, iconClassName: 'text-sky-600' },
    { value: 'premium', label: 'Premium', icon: Sparkles, iconClassName: 'text-amber-500' },
  ];

  const submit = async () => {
    if (!form.name || !form.code) return toast({ title: 'Preencha nome e código', variant: 'destructive' });
    try {
      const { id, unit, created_at, updated_at, ...values } = form;
      values.capacity = Number(values.capacity) || 0;
      await upsert.mutateAsync({ id: row?.id, values });
      toast({ title: row ? 'Sala atualizada' : 'Sala cadastrada' });
      setOpen(false);
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{row ? 'Editar sala' : 'Nova sala'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><Label>Nome *</Label><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></div>
          <div><Label>Código *</Label><Input value={form.code ?? ''} onChange={(e) => set('code', e.target.value)} /></div>
          <div><Label>Capacidade</Label><Input type="number" value={form.capacity ?? 0} onChange={(e) => set('capacity', e.target.value)} /></div>
          <div><Label>Tipo</Label>
            <IconSelect value={form.room_type ?? 'sala_aula'} onValueChange={(value) => set('room_type', value)} options={typeOptions} />
          </div>
          <div><Label>Status</Label>
            <IconSelect value={form.status ?? 'disponivel'} onValueChange={(value) => set('status', value)} options={statusOptions} />
          </div>
          <div><Label>Bloco</Label><Input value={form.block ?? ''} onChange={(e) => set('block', e.target.value)} /></div>
          <div><Label>Andar</Label><Input value={form.floor ?? ''} onChange={(e) => set('floor', e.target.value)} /></div>
          <div><Label>Unidade</Label>
            <IconSelect value={form.unit_id ?? 'none'} onValueChange={(value) => set('unit_id', value === 'none' ? null : value)} options={unitOptions} />
          </div>
          <div><Label>Padrão</Label>
            <IconSelect value={form.quality_tier ?? 'padrao'} onValueChange={(value) => set('quality_tier', value)} options={qualityOptions} />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Recursos disponíveis</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              <FeatureSwitch checked={!!form.has_projector} onCheckedChange={(value) => set('has_projector', value)} icon={Projector} label="Projetor" />
              <FeatureSwitch checked={!!form.has_air_conditioning} onCheckedChange={(value) => set('has_air_conditioning', value)} icon={Wind} label="Ar-condicionado" />
              <FeatureSwitch checked={!!form.has_computer} onCheckedChange={(value) => set('has_computer', value)} icon={Monitor} label="Computador" />
              <FeatureSwitch checked={!!form.has_audio_system} onCheckedChange={(value) => set('has_audio_system', value)} icon={Mic} label="Sistema de áudio" />
              <FeatureSwitch checked={!!form.has_tv} onCheckedChange={(value) => set('has_tv', value)} icon={Tv} label="TV" />
              <FeatureSwitch checked={!!form.has_whiteboard} onCheckedChange={(value) => set('has_whiteboard', value)} icon={Presentation} label="Quadro" />
              <FeatureSwitch checked={!!form.has_interactive_screen} onCheckedChange={(value) => set('has_interactive_screen', value)} icon={PanelsTopLeft} label="Tela interativa" />
            </div>
          </div>
          <div><Label>Tipo de mobiliário</Label><Input value={form.furniture_type ?? ''} onChange={(event) => set('furniture_type', event.target.value)} placeholder="Ex.: cadeiras universitárias" /></div>
          <div><Label>Restrição de uso</Label><Input value={form.usage_restriction ?? ''} onChange={(event) => set('usage_restriction', event.target.value)} placeholder="Ex.: uso exclusivo do curso" /></div>
          <div className="md:col-span-2"><Label>Observações</Label><Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={upsert.isPending}>{upsert.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
