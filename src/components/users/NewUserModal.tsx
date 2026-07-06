import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface NewUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated?: () => void;
}

export function NewUserModal({ open, onOpenChange, onUserCreated }: NewUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "usuario",
  });

  const { toast } = useToast();
  const { organization } = useAuth();
  const { user } = useAuth();

  const roles = [
    { value: "usuario", label: "Usuário" },
    { value: "gerente", label: "Gerente" },
    { value: "admin", label: "Administrador" },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      toast({
        title: "Erro de validação",
        description: "E-mail é obrigatório",
        variant: "destructive",
      });
      return false;
    }
    
    const password = formData.password.trim();
    if (!password || password.length < 12) {
      toast({
        title: "Erro de validação", 
        description: "Senha deve ter no mínimo 12 caracteres",
        variant: "destructive",
      });
      return false;
    }
    
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      toast({
        title: "Erro de validação",
        description: "Senha deve conter maiúsculas, minúsculas, números e caracteres especiais",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.full_name.trim()) {
      toast({
        title: "Erro de validação",
        description: "Nome completo é obrigatório",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.role) {
      toast({
        title: "Erro de validação",
        description: "Nível de acesso é obrigatório",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      // Check organization limits
      if (organization?.organization_id) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('max_users')
          .eq('id', organization.organization_id)
          .single();

        const { count: currentCount } = await supabase
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.organization_id)
          .eq('is_active', true);

        if (orgData && currentCount !== null && currentCount >= orgData.max_users) {
          toast({
            title: "Limite atingido",
            description: `Sua organização atingiu o limite de ${orgData.max_users} usuários. Entre em contato para fazer upgrade.`,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Warning when near limit (90%)
        if (orgData && currentCount !== null && currentCount >= orgData.max_users * 0.9) {
          toast({
            title: "Atenção",
            description: `Você está próximo do limite de usuários (${currentCount}/${orgData.max_users}). Considere fazer upgrade.`,
          });
        }
      }

      // Create user account (admin-initiated signup)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: formData.full_name.trim(),
            role: formData.role,
          }
        }
      });

      if (authError) {
        console.error('Error creating user:', authError);
        toast({
          title: "Erro ao criar usuário",
          description: authError.message,
          variant: "destructive",
        });
        return;
      }

      // Update profile with role (ensure it's set correctly)
      if (authData.user) {
        // Wait a bit for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: authData.user.email!,
            full_name: formData.full_name.trim(),
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error('Error updating profile:', profileError);
          toast({
            title: "Aviso",
            description: "Usuário criado, mas houve problema ao definir o papel. Verifique as permissões.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Usuário criado com sucesso!",
        description: `${formData.full_name} foi adicionado ao sistema.`,
      });

      // Reset form
      setFormData({
        email: "",
        password: "",
        full_name: "",
        role: "",
      });

      onOpenChange(false);
      onUserCreated?.();

    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Erro interno",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle>Novo Usuário</ModalTitle>
          <ModalDescription>
            Adicione um novo usuário ao sistema
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => handleInputChange("full_name", e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'\-]/g, ''))}
              placeholder="Ex: João Silva"
              autoCapitalize="words"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="joao@empresa.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Nível de Acesso *</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o nível de acesso" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="btn-ripple"
            >
              {isLoading ? "Criando..." : "Criar Usuário"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}