import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, Link as LinkIcon, Hash } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrganizationInfoCardProps {
  organization: any;
  logoUrl?: string;
}

export function OrganizationInfoCard({ organization, logoUrl }: OrganizationInfoCardProps) {
  if (!organization) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          {logoUrl && (
            <img 
              src={logoUrl} 
              alt={organization.name} 
              className="w-16 h-16 rounded-lg object-cover border border-border"
            />
          )}
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Informações Gerais
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Criada em</span>
            </div>
            <p className="text-sm font-medium">
              {organization.created_at 
                ? format(new Date(organization.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                : 'Data não disponível'
              }
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Última atualização</span>
            </div>
            <p className="text-sm font-medium">
              {organization.updated_at 
                ? format(new Date(organization.updated_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                : 'Data não disponível'
              }
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LinkIcon className="w-4 h-4" />
              <span>Slug/URL</span>
            </div>
            <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
              {organization.slug}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Hash className="w-4 h-4" />
              <span>ID da Organização</span>
            </div>
            <p className="text-xs font-mono bg-muted px-2 py-1 rounded truncate">
              {organization.id}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
