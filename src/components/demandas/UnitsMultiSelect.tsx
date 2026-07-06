import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { useCampuses } from '@/hooks/useCampuses';
import { cn } from '@/lib/utils';

interface Props {
  value: string[];
  onChange: (units: string[]) => void;
  placeholder?: string;
}

/**
 * Multi-select para unidades. Mostra opções dos campuses cadastrados
 * e permite adicionar unidades em texto livre (fallback) com chips.
 */
export function UnitsMultiSelect({ value, onChange, placeholder = 'Selecione unidades…' }: Props) {
  const { data: campuses = [] } = useCampuses();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');

  function toggle(name: string) {
    if (value.includes(name)) onChange(value.filter((v) => v !== name));
    else onChange([...value, name]);
  }
  function remove(name: string) {
    onChange(value.filter((v) => v !== name));
  }
  function addCustom() {
    const v = custom.trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setCustom('');
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
            <span className={cn('truncate', value.length === 0 && 'text-muted-foreground')}>
              {value.length === 0 ? placeholder : `${value.length} unidade(s) selecionada(s)`}
            </span>
            <ChevronDown className="h-4 w-4 opacity-60 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="max-h-64 overflow-auto">
            {campuses.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">Nenhum campus cadastrado.</p>
            )}
            {campuses.map((c) => {
              const selected = value.includes(c.name);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.name)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
                >
                  <Check className={cn('h-4 w-4', selected ? 'opacity-100 text-primary' : 'opacity-0')} />
                  <span className="flex-1 truncate">{c.name}</span>
                </button>
              );
            })}
          </div>
          <div className="border-t p-2 flex gap-2">
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
              placeholder="Outra unidade…"
              className="h-8 text-sm"
            />
            <Button type="button" size="sm" variant="outline" onClick={addCustom} disabled={!custom.trim()}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((u) => (
            <Badge key={u} variant="secondary" className="gap-1 pr-1">
              {u}
              <button
                type="button"
                onClick={() => remove(u)}
                className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                aria-label={`Remover ${u}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
