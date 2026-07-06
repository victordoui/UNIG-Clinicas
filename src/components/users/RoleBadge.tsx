import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  UNIG_ROLE_BADGE,
  UNIG_ROLE_ICON,
  UNIG_ROLE_LABEL,
  type UnigRole,
} from "@/lib/unigRoles";

interface RoleBadgeProps {
  role: UnigRole;
  className?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
}

/**
 * Badge padronizado para roles UNIG.
 * Sempre exibe ícone + nome, com a paleta semântica do papel.
 * Use em qualquer listagem ou exibição de perfil para manter consistência.
 */
export function RoleBadge({ role, className, size = "sm", showLabel = true }: RoleBadgeProps) {
  const Icon = UNIG_ROLE_ICON[role];
  const iconSize = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";
  return (
    <Badge
      variant="outline"
      className={cn(
        "border inline-flex items-center gap-1.5 font-medium",
        UNIG_ROLE_BADGE[role],
        className,
      )}
    >
      {Icon && <Icon className={iconSize} />}
      {showLabel && UNIG_ROLE_LABEL[role]}
    </Badge>
  );
}
