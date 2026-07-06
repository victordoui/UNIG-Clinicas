import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, TrendingUp, AlertCircle, ShieldCheck, Briefcase, User, type LucideIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ChangeOrganizationRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    role: string;
    is_active: boolean;
    joined_at: string;
    profiles: {
      full_name: string;
      email: string;
      avatar_url: string | null;
    };
  };
  organizationName: string;
  onSuccess?: () => void;
}

export function ChangeOrganizationRoleModal({ 
  open, 
  onOpenChange, 
  member,
  organizationName,
  onSuccess 
}: ChangeOrganizationRoleModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newRole, setNewRole] = useState(member.role);
  const { toast } = useToast();

  const roles: Array<{
    value: string;
    label: string;
    variant: "destructive" | "default" | "secondary";
    description: string;
    icon: LucideIcon;
    iconColor: string;
  }> = [
    {
      value: "organization_admin",
      label: "Administrador da Organização",
      variant: "destructive",
      description: "Acesso total: gerenciar membros, configurações e dados",
      icon: ShieldCheck,
      iconColor: "text-rose-600",
    },
    {
      value: "manager",
      label: "Gerente",
      variant: "default",
      description: "Gerenciar produtos, movimentações e relatórios",
      icon: Briefcase,
      iconColor: "text-blue-600",
    },
    {
      value: "member",
      label: "Membro",
      variant: "secondary",
      description: "Visualizar e realizar operações básicas",
      icon: User,
      iconColor: "text-muted-foreground",
    },
  ];

  const getRoleBadge = (roleValue: string) => {
    const role = roles.find(r => r.value === roleValue);
    if (!role) return <Badge variant="secondary">Desconhecido</Badge>;
    const Icon = role.icon;
    return (
      <Badge variant={role.variant} className="inline-flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {role.label}
      </Badge>
    );
  };

  const handleRoleChange = async () => {
    if (newRole === member.role) {
      toast({
        title: "Nenhuma alteração",
        description: "Selecione um nível de acesso diferente do atual",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', member.id);

      if (error) {
        console.error('Error updating member role:', error);
        throw error;
      }

      const roleLabel = roles.find(r => r.value === newRole)?.label || newRole;

      toast({
        title: "Nível de acesso atualizado!",
        description: `${member.profiles.full_name} agora é ${roleLabel} em ${organizationName}.`,
      });

      onOpenChange(false);
      onSuccess?.();

    } catch (error: any) {
      console.error('Error updating member role:', error);
      toast({
        title: "Erro ao atualizar nível de acesso",
        description: error.message || "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Alterar Nível de Acesso
          </DialogTitle>
          <DialogDescription>
            Modifique as permissões de {member.profiles.full_name} em {organizationName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Membro */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={member.profiles.avatar_url || undefined} />
              <AvatarFallback>
                {member.profiles.full_name?.substring(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-medium">{member.profiles.full_name || "Nome não definido"}</div>
              <div className="text-sm text-muted-foreground">{member.profiles.email}</div>
              <div className="mt-1">{getRoleBadge(member.role)}</div>
            </div>
          </div>

          {/* Seleção de Novo Nível */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Novo Nível de Acesso
              </h4>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o novo nível de acesso" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => {
                    const Icon = role.icon;
                    return (
                      <SelectItem
                        key={role.value}
                        value={role.value}
                      >
                        <div className="flex items-start gap-2">
                          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${role.iconColor}`} />
                          <div className="flex flex-col">
                            <span className="font-medium">{role.label}</span>
                            <span className="text-xs text-muted-foreground">{role.description}</span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {newRole === 'organization_admin' && newRole !== member.role && (
              <Alert variant="default">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Atenção:</strong> Administradores têm acesso total à organização, incluindo gerenciamento de membros e configurações.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleRoleChange}
            disabled={isLoading || newRole === member.role}
          >
            {isLoading ? "Atualizando..." : "Atualizar Nível de Acesso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
