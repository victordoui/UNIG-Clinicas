import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OrganizationLimits {
  max_users: number;
  max_products: number;
  current_users: number;
  current_products: number;
  users_percentage: number;
  products_percentage: number;
  users_near_limit: boolean;
  products_near_limit: boolean;
  users_at_limit: boolean;
  products_at_limit: boolean;
}

export function useOrganizationLimits() {
  const { organization } = useAuth();
  const { toast } = useToast();
  const [limits, setLimits] = useState<OrganizationLimits | null>(null);
  const [loading, setLoading] = useState(false);

  const loadLimits = async () => {
    if (!organization?.organization_id) return;

    setLoading(true);
    try {
      // Get organization limits
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('max_users, max_products')
        .eq('id', organization.organization_id)
        .single();

      if (orgError) throw orgError;

      // Get current counts
      const [usersRes, productsRes] = await Promise.all([
        supabase
          .from('organization_members')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.organization_id)
          .eq('is_active', true),
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.organization_id),
      ]);

      const currentUsers = usersRes.count || 0;
      const currentProducts = productsRes.count || 0;

      const usersPercentage = Math.round((currentUsers / orgData.max_users) * 100);
      const productsPercentage = Math.round((currentProducts / orgData.max_products) * 100);

      setLimits({
        max_users: orgData.max_users,
        max_products: orgData.max_products,
        current_users: currentUsers,
        current_products: currentProducts,
        users_percentage: usersPercentage,
        products_percentage: productsPercentage,
        users_near_limit: usersPercentage >= 90,
        products_near_limit: productsPercentage >= 90,
        users_at_limit: currentUsers >= orgData.max_users,
        products_at_limit: currentProducts >= orgData.max_products,
      });
    } catch (error) {
      console.error('Error loading limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkProductLimit = async (): Promise<boolean> => {
    if (!organization?.organization_id) return true;

    const { data: orgData } = await supabase
      .from('organizations')
      .select('max_products')
      .eq('id', organization.organization_id)
      .single();

    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.organization_id);

    if (orgData && count !== null && count >= orgData.max_products) {
      toast({
        title: 'Limite atingido',
        description: `Sua organização atingiu o limite de ${orgData.max_products} produtos. Entre em contato para fazer upgrade.`,
        variant: 'destructive',
      });
      return false;
    }

    if (orgData && count !== null && count >= orgData.max_products * 0.9) {
      toast({
        title: 'Atenção',
        description: `Você está próximo do limite de produtos (${count}/${orgData.max_products}). Considere fazer upgrade.`,
      });
    }

    return true;
  };

  const checkUserLimit = async (): Promise<boolean> => {
    if (!organization?.organization_id) return true;

    const { data: orgData } = await supabase
      .from('organizations')
      .select('max_users')
      .eq('id', organization.organization_id)
      .single();

    const { count } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.organization_id)
      .eq('is_active', true);

    if (orgData && count !== null && count >= orgData.max_users) {
      toast({
        title: 'Limite atingido',
        description: `Sua organização atingiu o limite de ${orgData.max_users} usuários. Entre em contato para fazer upgrade.`,
        variant: 'destructive',
      });
      return false;
    }

    if (orgData && count !== null && count >= orgData.max_users * 0.9) {
      toast({
        title: 'Atenção',
        description: `Você está próximo do limite de usuários (${count}/${orgData.max_users}). Considere fazer upgrade.`,
      });
    }

    return true;
  };

  useEffect(() => {
    if (organization?.organization_id) {
      loadLimits();
    }
  }, [organization?.organization_id]);

  return {
    limits,
    loading,
    loadLimits,
    checkProductLimit,
    checkUserLimit,
  };
}
