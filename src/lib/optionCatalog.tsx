// Stub minimal do catálogo de opções — retornado no lugar da versão anterior deletada.
// Preserva a assinatura utilizada por `dropdown-menu.tsx` e `select.tsx`, mas sem
// ícones específicos: usa `Circle` como fallback neutro para todas as opções.
import { Circle, type LucideIcon } from 'lucide-react';

export type OptionDomain = 'generic' | string;

export interface OptionMeta {
  icon: LucideIcon;
  className: string;
  badgeClassName?: string;
  label?: string;
}

const DEFAULT: OptionMeta = { icon: Circle, className: 'text-muted-foreground', label: '' };

export function getOptionMeta(_domain: OptionDomain, _value: string | undefined, label?: string): OptionMeta {
  return { ...DEFAULT, label };
}

export function getOptionMetaAny(_value: string | undefined, label?: string): OptionMeta {
  return { ...DEFAULT, label };
}
