import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useRequirementCategories } from '@/hooks/useStudentData';
import type { RequirementFilters } from '@/hooks/useRequirements';

interface Props {
  value: RequirementFilters;
  onChange: (v: RequirementFilters) => void;
  showAssignedFilter?: boolean;
  showOverdueFilter?: boolean;
}

export function RequirementFiltersBar({ value, onChange, showAssignedFilter, showOverdueFilter }: Props) {
  const { data: categories = [] } = useRequirementCategories();
  const set = (patch: Partial<RequirementFilters>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por título ou protocolo" value={value.search ?? ''} onChange={(e) => set({ search: e.target.value })} className="pl-8" />
      </div>
      <Select value={value.status ?? 'all'} onValueChange={(v) => set({ status: v })}>
        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos status</SelectItem>
          <SelectItem value="open">Aberto</SelectItem>
          <SelectItem value="in_progress">Em análise</SelectItem>
          <SelectItem value="completed">Concluído</SelectItem>
          <SelectItem value="rejected">Rejeitado</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.priority ?? 'all'} onValueChange={(v) => set({ priority: v })}>
        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas prioridades</SelectItem>
          <SelectItem value="low">Baixa</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="high">Alta</SelectItem>
          <SelectItem value="urgent">Urgente</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.categoryId ?? 'all'} onValueChange={(v) => set({ categoryId: v })}>
        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas categorias</SelectItem>
          {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      {showOverdueFilter && (
        <Button size="sm" variant={value.overdueOnly ? 'default' : 'outline'} onClick={() => set({ overdueOnly: !value.overdueOnly })}>Atrasados</Button>
      )}
      {showAssignedFilter && (
        <Button size="sm" variant={value.mineOnly ? 'default' : 'outline'} onClick={() => set({ mineOnly: !value.mineOnly })}>Meus</Button>
      )}
    </div>
  );
}
