import { useAuth } from '@/hooks/useAuth';

/**
 * Hook para filtrar dados por organização
 * Super admins podem ver todas ou uma específica
 * Outros usuários veem apenas sua organização
 */
export function useOrganizationFilter() {
  const { organization, isSuperAdmin } = useAuth();
  
  const getOrganizationFilter = () => {
    // Super admin SEMPRE vê todas as organizações
    if (isSuperAdmin) {
      return null;
    }
    
    // Usuários normais veem apenas sua organização
    return organization?.organization_id || null;
  };

  const organizationId = getOrganizationFilter();
  const viewingAllOrganizations = isSuperAdmin; // Sempre true para super admin

  return {
    organizationId,
    viewingAllOrganizations,
    isSuperAdmin,
  };
}
