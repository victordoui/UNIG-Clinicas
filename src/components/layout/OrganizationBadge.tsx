import { useAuth } from '@/hooks/useAuth';
import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function OrganizationBadge() {
  const { organization, isSuperAdmin } = useAuth();

  if (!organization && !isSuperAdmin) {
    return null;
  }

  if (isSuperAdmin && !organization) {
    return (
      <Badge variant="default" className="gap-1.5">
        <Building2 className="h-3 w-3" />
        Super Admin - Todas as Organizações
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1.5">
      <Building2 className="h-3 w-3" />
      {organization?.organization_name}
    </Badge>
  );
}
