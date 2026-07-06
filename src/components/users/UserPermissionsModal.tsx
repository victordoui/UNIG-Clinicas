import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, TrendingUp, Vote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ASSIGNABLE_UNIG_ROLES, UNIG_ROLE_LABEL, UNIG_ROLE_BADGE, UNIG_ROLE_ICON, UNIG_ROLE_TEXT_COLOR, mapDbRoleToUnig, type UnigRole } from "@/lib/unigRoles";
import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserPermissionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit: any;
  onUserUpdated?: () => void;
}

export function UserPermissionsModal({ open, onOpenChange, userToEdit, onUserUpdated }: UserPermissionsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newRole, setNewRole] = useState<string>("");
  const [isCouncil, setIsCouncil] = useState(false);
  const [councilName, setCouncilName] = useState("");
  const [isCouncilSaving, setIsCouncilSaving] = useState(false);

  const { toast } = useToast();

  const currentUnigRole: UnigRole = mapDbRoleToUnig(userToEdit?.role, !!userToEdit?.is_super_admin, false);

  useEffect(() => {
    if (open) {
      setNewRole(ASSIGNABLE_UNIG_ROLES.includes(currentUnigRole) ? currentUnigRole : "");
      setIsCouncil(!!userToEdit?.is_council_member);
      setCouncilName(userToEdit?.council_display_name || userToEdit?.full_name || "");
    }
  }, [open, currentUnigRole, userToEdit]);

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderRoleBadge = (role: UnigRole) => {
    const Icon = UNIG_ROLE_ICON[role];
    return (
      <Badge variant="outline" className={cn("border inline-flex items-center gap-1", UNIG_ROLE_BADGE[role])}>
        {Icon && <Icon className="h-3 w-3" />}
        {UNIG_ROLE_LABEL[role]}
      </Badge>
    );
  };

  const handleRoleChange = async () => {
    if (!newRole || newRole === currentUnigRole) {
      toast({
        title: "Selecione um papel diferente",
        description: "Escolha um nível de acesso diferente do atual.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('user_id', userToEdit.user_id);

      if (error) {
        console.error('Error updating user role:', error);
        toast({
          title: "Erro ao atualizar permissão",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Permissão atualizada",
        description: `${userToEdit.full_name || userToEdit.email} agora é ${UNIG_ROLE_LABEL[newRole as UnigRole]}.`,
      });

      onOpenChange(false);
      onUserUpdated?.();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Erro ao atualizar permissão",
        description: error.message || "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCouncilSave = async () => {
    setIsCouncilSaving(true);
    try {
      if (isCouncil) {
        // Upsert into council_members; reactivate if existed
        const { data: existing } = await supabase
          .from('council_members')
          .select('id')
          .eq('user_id', userToEdit.user_id)
          .eq('organization_id', userToEdit.organization_id)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('council_members')
            .update({ ativo: true, nome_exibicao: councilName || userToEdit.full_name || userToEdit.email })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('council_members')
            .insert({
              user_id: userToEdit.user_id,
              organization_id: userToEdit.organization_id,
              nome_exibicao: councilName || userToEdit.full_name || userToEdit.email,
              ativo: true,
            });
          if (error) throw error;
        }

        // Promove o papel UNIG para 'conselho' se o usuário ainda for visitante/visualizador/sem papel.
        const promotableRoles = ['visitante', 'visualizador', 'user', null, undefined, ''];
        if (promotableRoles.includes(userToEdit.role)) {
          const { error: roleErr } = await supabase
            .from('organization_members')
            .update({ role: 'conselho' })
            .eq('user_id', userToEdit.user_id);
          if (roleErr) {
            console.warn('Não foi possível promover papel para Conselho:', roleErr);
            toast({
              title: 'Conselho marcado, papel não atualizado',
              description: roleErr.message,
              variant: 'destructive',
            });
          }
        }

        toast({ title: 'Membro do Conselho atualizado', description: 'Usuário marcado como Conselho.' });
      } else {
        // Disable / remove council link
        const { error } = await supabase
          .from('council_members')
          .delete()
          .eq('user_id', userToEdit.user_id);
        if (error) throw error;
        // Se o papel atual é 'conselho', devolve para 'visitante'.
        if (userToEdit.role === 'conselho') {
          await supabase
            .from('organization_members')
            .update({ role: 'visitante' })
            .eq('user_id', userToEdit.user_id);
        }
        toast({ title: 'Conselho removido', description: 'Usuário não é mais membro do Conselho.' });
      }
      onUserUpdated?.();
    } catch (error: any) {
      console.error('Council update error:', error);
      toast({
        title: 'Erro ao atualizar Conselho',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsCouncilSaving(false);
    }
  };

  if (!userToEdit) return null;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gerenciar Permissões
          </ModalTitle>
          <ModalDescription>
            Altere as permissões do usuário
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarFallback>{getInitials(userToEdit.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{userToEdit.full_name || "Nome não definido"}</div>
              <div className="text-sm text-muted-foreground">{userToEdit.email}</div>
              <div className="mt-1">{renderRoleBadge(currentUnigRole)}</div>
            </div>
          </div>

          {/* Role Change Section */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Alterar Nível de Acesso
              </h4>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o novo nível de acesso" />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_UNIG_ROLES.map((role) => {
                    const Icon = UNIG_ROLE_ICON[role];
                    return (
                      <SelectItem
                        key={role}
                        value={role}
                        disabled={role === currentUnigRole}
                      >
                        <div className="flex items-center gap-2">
                          {Icon && <Icon className={cn("h-4 w-4", UNIG_ROLE_TEXT_COLOR[role])} />}
                          {UNIG_ROLE_LABEL[role]}
                          {role === currentUnigRole && <span className="text-xs text-muted-foreground">(Atual)</span>}
                        </div>
                      </SelectItem>
                    );
                  })}
                  <SelectItem value="fornecedor" disabled>
                    <div className="flex items-center gap-2">
                      <Truck className={cn("h-4 w-4", UNIG_ROLE_TEXT_COLOR.fornecedor)} />
                      Fornecedor <span className="text-xs text-muted-foreground">(definir via Portal do Fornecedor)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleRoleChange}
              disabled={isLoading || !newRole || newRole === currentUnigRole}
              className="w-full"
            >
              {isLoading ? "Atualizando..." : "Atualizar Permissão"}
            </Button>
          </div>

          {/* Council Membership Section */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <Vote className="h-4 w-4" />
                  Membro do Conselho
                </h4>
                <p className="text-xs text-muted-foreground">
                  Concede acesso ao módulo do Conselho (votos, pautas).
                </p>
              </div>
              <Switch checked={isCouncil} onCheckedChange={setIsCouncil} disabled={isCouncilSaving} />
            </div>

            {isCouncil && (
              <div className="space-y-1.5">
                <Label htmlFor="council-name" className="text-xs">Nome de exibição no Conselho</Label>
                <Input
                  id="council-name"
                  value={councilName}
                  onChange={(e) => setCouncilName(e.target.value)}
                  placeholder="Ex: Conselho M1"
                  disabled={isCouncilSaving}
                />
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleCouncilSave}
              disabled={isCouncilSaving || (isCouncil === !!userToEdit?.is_council_member && councilName === (userToEdit?.council_display_name || userToEdit?.full_name || ""))}
              className="w-full"
            >
              {isCouncilSaving ? "Salvando..." : "Salvar Conselho"}
            </Button>
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}