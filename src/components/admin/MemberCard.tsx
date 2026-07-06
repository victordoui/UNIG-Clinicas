import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MemberCardProps {
  member: {
    role: string;
    is_active: boolean;
    joined_at: string;
    profiles?: {
      full_name: string;
      email: string;
      avatar_url?: string;
    };
  };
}

export function MemberCard({ member }: MemberCardProps) {
  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      organization_admin: 'default',
      manager: 'secondary',
      member: 'outline',
    };
    
    const labels: Record<string, string> = {
      organization_admin: 'Admin',
      manager: 'Gerente',
      member: 'Membro',
    };
    
    return (
      <Badge variant={variants[role] || 'outline'}>
        {labels[role] || role}
      </Badge>
    );
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={member.profiles?.avatar_url} />
            <AvatarFallback>
              {member.profiles?.full_name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium truncate">{member.profiles?.full_name}</p>
              {getRoleBadge(member.role)}
              {!member.is_active && (
                <Badge variant="destructive">Inativo</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {member.profiles?.email}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Entrou em {format(new Date(member.joined_at), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
