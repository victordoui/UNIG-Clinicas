import type { ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Circle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface IconSelectOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  iconClassName?: string;
}

interface IconSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: IconSelectOption[];
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export function IconSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Selecione',
  className,
  contentClassName,
  disabled,
  'aria-label': ariaLabel,
}: IconSelectProps) {
  const selected = options.find((option) => option.value === value);
  const SelectedIcon = selected?.icon ?? Circle;

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn('gap-2 bg-background', className)} aria-label={ariaLabel ?? placeholder}>
        <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <SelectedIcon className={cn('h-4 w-4 shrink-0 text-primary', selected?.iconClassName)} />
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>{selected?.label ?? placeholder}</span>
        </span>
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {options.map((option) => {
          const OptionIcon = option.icon ?? Circle;
          return (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex items-center gap-2">
                <OptionIcon className={cn('h-4 w-4 shrink-0 text-muted-foreground', option.iconClassName)} />
                <span>{option.label}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export type IconSelectTriggerProps = ComponentProps<typeof SelectTrigger>;
