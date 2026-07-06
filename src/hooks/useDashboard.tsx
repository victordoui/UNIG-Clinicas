import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DashboardStats {
  totalProducts: number;
  movementsToday: number;
  activeAlerts: number;
  activeUsers: number;
  loading: boolean;
}

export function useDashboard() {
  const { user, organization, isSuperAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    movementsToday: 0,
    activeAlerts: 0,
    activeUsers: 0,
    loading: true,
  });

  useEffect(() => {
    if (user) {
      loadDashboardStats();
    }
  }, [user]);

  const loadDashboardStats = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true }));

      // Buscar total de produtos
      let productsQuery = supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      
      if (!isSuperAdmin && organization?.organization_id) {
        productsQuery = productsQuery.eq('organization_id', organization.organization_id);
      }

      const { count: totalProducts } = await productsQuery;

      // Buscar movimentações de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let movementsQuery = supabase
        .from('movements')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
      
      if (!isSuperAdmin && organization?.organization_id) {
        movementsQuery = movementsQuery.eq('organization_id', organization.organization_id);
      }

      const { count: movementsToday } = await movementsQuery;

      // Buscar alertas ativos
      let alertsQuery = supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);
      
      if (!isSuperAdmin && organization?.organization_id) {
        alertsQuery = alertsQuery.eq('organization_id', organization.organization_id);
      }

      const { count: activeAlerts } = await alertsQuery;

      // Buscar usuários ativos (da organização)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let usersQuery = supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (!isSuperAdmin && organization?.organization_id) {
        usersQuery = usersQuery.eq('organization_id', organization.organization_id);
      }

      const { count: activeUsers } = await usersQuery;

      setStats({
        totalProducts: totalProducts || 0,
        movementsToday: movementsToday || 0,
        activeAlerts: activeAlerts || 0,
        activeUsers: activeUsers || 0,
        loading: false,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  return {
    stats,
    loadDashboardStats,
  };
}