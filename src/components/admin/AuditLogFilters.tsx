import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AuditLogFilters as F } from '@/hooks/useAdmin';

interface Props { value: F; onChange: (v: F) => void; }

export function AuditLogFilters({ value, onChange }: Props) {
  const set = (patch: Partial<F>) => onChange({ ...value, ...patch });
  return (
    <Card>
      <CardContent className="p-4 grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
        <div>
          <Label className="text-xs">Ação</Label>
          <Input placeholder="ex: create, update" value={value.action ?? ''} onChange={e => set({ action: e.target.value || undefined })} />
        </div>
        <div>
          <Label className="text-xs">Tabela</Label>
          <Input placeholder="ex: profiles" value={value.entity_table ?? ''} onChange={e => set({ entity_table: e.target.value || undefined })} />
        </div>
        <div>
          <Label className="text-xs">De</Label>
          <Input type="date" value={value.from?.slice(0, 10) ?? ''} onChange={e => set({ from: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
        </div>
        <div>
          <Label className="text-xs">Até</Label>
          <Input type="date" value={value.to?.slice(0, 10) ?? ''} onChange={e => set({ to: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : undefined })} />
        </div>
      </CardContent>
    </Card>
  );
}
