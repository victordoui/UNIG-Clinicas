import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface EditOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: {
    id: string;
    name: string;
    slug: string;
    subscription_plan: string;
    max_users: number;
    max_products: number;
    is_active: boolean;
  } | null;
  onSuccess?: () => void;
}

export function EditOrganizationModal({ open, onOpenChange, organization, onSuccess }: EditOrganizationModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    subscription_plan: 'basic',
    max_users: 10,
    max_products: 1000,
    is_active: true,
  });

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name,
        slug: organization.slug,
        subscription_plan: organization.subscription_plan,
        max_users: organization.max_users,
        max_products: organization.max_products,
        is_active: organization.is_active,
      });
    }
  }, [organization]);

  const handleSave = async () => {
    if (!organization) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          slug: formData.slug,
          subscription_plan: formData.subscription_plan,
          max_users: formData.max_users,
          max_products: formData.max_products,
          is_active: formData.is_active,
        })
        .eq('id', organization.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Organização atualizada com sucesso!',
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar a organização',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Organização</DialogTitle>
          <DialogDescription>
            Altere as informações da organização
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome da organização"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="organizacao-slug"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan">Plano de Assinatura</Label>
            <Select
              value={formData.subscription_plan}
              onValueChange={(value) => setFormData({ ...formData, subscription_plan: value })}
            >
              <SelectTrigger id="plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic (R$ 99/mês)</SelectItem>
                <SelectItem value="pro">Pro (R$ 199/mês)</SelectItem>
                <SelectItem value="enterprise">Enterprise (R$ 499/mês)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_users">Máximo de Usuários</Label>
              <Input
                id="max_users"
                type="number"
                value={formData.max_users}
                onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 10 })}
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_products">Máximo de Produtos</Label>
              <Input
                id="max_products"
                type="number"
                value={formData.max_products}
                onChange={(e) => setFormData({ ...formData, max_products: parseInt(e.target.value) || 1000 })}
                min="1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Organização Ativa</Label>
              <p className="text-sm text-muted-foreground">
                Desative para suspender o acesso
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
