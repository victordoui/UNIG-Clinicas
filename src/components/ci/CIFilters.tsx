import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';
import { CI_CHANNEL_LABEL, CI_STAGE_LABEL, type CIChannel } from '@/lib/ciLabels';
import { useCampuses } from '@/hooks/useCampuses';
import type { CIListFilters } from '@/hooks/useCI';

interface Props {
  value: CIListFilters;
  onChange: (v: CIListFilters) => void;
}

export function CIFilters({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const { data: campuses = [] } = useCampuses();
  const v = value;
  const set = (patch: Partial<CIListFilters>) => onChange({ ...v, ...patch });

  function clear() {
    onChange({ mine: v.mine });
  }

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Input
            placeholder="Buscar protocolo, assunto ou solicitante…"
            value={v.search ?? ''}
            onChange={e => set({ search: e.target.value || undefined })}
            className="max-w-md"
          />
          <Button variant="outline" size="sm" onClick={() => setOpen(o => !o)}>
            <Filter className="h-4 w-4 mr-2" />
            Filtros {open ? '−' : '+'}
          </Button>
        </div>
        {(v.campus || v.cost_center || v.channel || v.stage || v.urgent || v.overdue || v.from || v.to) && (
          <Button variant="ghost" size="sm" onClick={clear}>
            <X className="h-4 w-4 mr-1" />Limpar
          </Button>
        )}
      </div>

      {open && (
        <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2 border-t animate-fade-in">
          <div>
            <Label className="text-xs">Unidade / Campus</Label>
            <Select value={v.campus ?? '__all'} onValueChange={x => set({ campus: x === '__all' ? undefined : x })}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                {campuses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Centro de Custo</Label>
            <Input value={v.cost_center ?? ''} onChange={e => set({ cost_center: e.target.value || undefined })} placeholder="Código ou nome" />
          </div>
          <div>
            <Label className="text-xs">Origem</Label>
            <Select value={v.channel ?? 'all'} onValueChange={x => set({ channel: x === 'all' ? undefined : x as CIChannel })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {(Object.keys(CI_CHANNEL_LABEL) as CIChannel[]).map(c => (
                  <SelectItem key={c} value={c}>{CI_CHANNEL_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Estágio</Label>
            <Select value={v.stage ?? '__all'} onValueChange={x => set({ stage: x === '__all' ? undefined : x })}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                {(Object.keys(CI_STAGE_LABEL) as Array<keyof typeof CI_STAGE_LABEL>).map(s => (
                  <SelectItem key={s} value={s}>{CI_STAGE_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Criada de</Label>
            <Input type="date" value={v.from ?? ''} onChange={e => set({ from: e.target.value || undefined })} />
          </div>
          <div>
            <Label className="text-xs">até</Label>
            <Input type="date" value={v.to ?? ''} onChange={e => set({ to: e.target.value || undefined })} />
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant={v.urgent ? 'default' : 'outline'}
              size="sm"
              onClick={() => set({ urgent: v.urgent ? undefined : true })}
            >Alta/Urgente</Button>
            <Button
              variant={v.overdue ? 'default' : 'outline'}
              size="sm"
              onClick={() => set({ overdue: v.overdue ? undefined : true })}
            >Atrasadas</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
