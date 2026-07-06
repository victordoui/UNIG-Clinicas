import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CreateOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateOrganizationModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateOrganizationModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    subscription_plan: 'basic',
    max_users: 10,
    max_products: 1000,
    admin_email: '',
    admin_name: '',
    admin_password: '',
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    });
  };

  const checkSlugUnique = async (slug: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      // Se houver erro que não seja "não encontrado", lançar exceção
      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar slug:', error);
        throw error;
      }

      // Retorna true se não encontrou dados (slug disponível)
      return !data;
    } catch (error) {
      console.error('Erro na verificação de slug:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields (apenas organização)
    if (!formData.name || !formData.slug) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha o nome e slug da organização.',
        variant: 'destructive',
      });
      return;
    }

    // Validação: ou preenche todos os campos de admin ou nenhum
    const adminFieldsFilled = [formData.admin_email, formData.admin_name, formData.admin_password]
      .filter(Boolean).length;

    if (adminFieldsFilled > 0 && adminFieldsFilled < 3) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos do administrador ou deixe todos em branco.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.name.length < 3) {
      toast({
        title: 'Erro',
        description: 'O nome da organização deve ter pelo menos 3 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    // Verificar se deve criar administrador
    const shouldCreateAdmin = formData.admin_email && formData.admin_name && formData.admin_password;

    // Validar senha apenas se for criar admin
    if (shouldCreateAdmin) {
      const password = formData.admin_password;
      if (password.length < 12) {
        toast({
          title: 'Senha inválida',
          description: 'A senha deve ter no mínimo 12 caracteres.',
          variant: 'destructive',
        });
        return;
      }
      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        toast({
          title: 'Senha inválida',
          description: 'A senha deve conter maiúsculas, minúsculas, números e caracteres especiais.',
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);

    try {
      // Check if slug is unique
      try {
        const isSlugUnique = await checkSlugUnique(formData.slug);
        if (!isSlugUnique) {
          toast({
            title: 'Erro',
            description: 'Este slug já está em uso. Por favor, escolha outro.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Erro ao verificar unicidade do slug:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao verificar disponibilidade do slug. Tente novamente.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // 1. Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.name,
          slug: formData.slug,
          subscription_plan: formData.subscription_plan,
          max_users: formData.max_users,
          max_products: formData.max_products,
          is_active: true,
        })
        .select()
        .single();

      if (orgError) throw orgError;
      if (!orgData) throw new Error('Falha ao criar organização');

      // 2. Create admin user (apenas se os campos foram preenchidos)
      if (shouldCreateAdmin) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.admin_email,
          password: formData.admin_password,
          options: {
            data: {
              full_name: formData.admin_name,
              role: 'admin',
            },
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Falha ao criar usuário');

        // 3. Create organization membership
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            user_id: authData.user.id,
            organization_id: orgData.id,
            role: 'organization_admin',
            is_active: true,
          });

        if (memberError) throw memberError;
      }

      toast({
        title: 'Sucesso!',
        description: shouldCreateAdmin 
          ? `Organização "${formData.name}" criada com sucesso. Administrador cadastrado.`
          : `Organização "${formData.name}" criada com sucesso. Adicione membros posteriormente.`,
      });

      // Reset form
      setFormData({
        name: '',
        slug: '',
        subscription_plan: 'basic',
        max_users: 10,
        max_products: 1000,
        admin_email: '',
        admin_name: '',
        admin_password: '',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar organização.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>Criar Nova Organização</ModalTitle>
          <ModalDescription>
            Cadastre uma nova empresa no sistema UNIG Facilities
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Organization Info */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold text-sm">Informações da Organização</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Organização *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Empresa ABC"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL amigável) *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="empresa-abc"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Usado para identificação única. Gerado automaticamente a partir do nome.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan">Plano</Label>
                <Select
                  value={formData.subscription_plan}
                  onValueChange={(value) =>
                    setFormData({ ...formData, subscription_plan: value })
                  }
                  disabled={loading}
                >
                  <SelectTrigger id="plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Básico</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_users">Máx. Usuários</Label>
                <Input
                  id="max_users"
                  type="number"
                  min="1"
                  value={formData.max_users}
                  onChange={(e) =>
                    setFormData({ ...formData, max_users: parseInt(e.target.value) || 10 })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_products">Máx. Produtos</Label>
                <Input
                  id="max_products"
                  type="number"
                  min="1"
                  value={formData.max_products}
                  onChange={(e) =>
                    setFormData({ ...formData, max_products: parseInt(e.target.value) || 1000 })
                  }
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Admin Info */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm">Primeiro Administrador (Opcional)</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Você pode adicionar membros posteriormente através do painel de administração.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin_name">Nome Completo</Label>
              <Input
                id="admin_name"
                value={formData.admin_name}
                onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                placeholder="João Silva"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_email">E-mail</Label>
              <Input
                id="admin_email"
                type="email"
                value={formData.admin_email}
                onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                placeholder="admin@empresa.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_password">Senha Temporária</Label>
              <Input
                id="admin_password"
                type="password"
                value={formData.admin_password}
                onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                O administrador poderá alterar a senha no primeiro login.
              </p>
            </div>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Organização
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
