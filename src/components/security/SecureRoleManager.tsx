import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SecureRoleManagerProps {
  userId: string;
  currentRole: string;
  onRoleUpdate: (newRole: string) => void;
}

export function SecureRoleManager({ userId, currentRole, onRoleUpdate }: SecureRoleManagerProps) {
  const [newRole, setNewRole] = useState(currentRole);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const roles = [
    { value: 'funcionario', label: 'Funcionário' },
    { value: 'gerente', label: 'Gerente' },
    { value: 'admin', label: 'Administrador' },
  ];

  const handleRoleUpdate = async () => {
    if (!newRole || newRole === currentRole) return;

    setIsLoading(true);
    try {
      // Update organization_members table instead of profiles
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      toast({
        title: "Papel atualizado com sucesso",
        description: `O usuário agora é ${roles.find(r => r.value === newRole)?.label}`,
      });

      onRoleUpdate(newRole);
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Erro ao atualizar papel",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={newRole} onValueChange={setNewRole}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem key={role.value} value={role.value}>
              {role.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleRoleUpdate}
        disabled={isLoading || newRole === currentRole}
      >
        {isLoading ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
}