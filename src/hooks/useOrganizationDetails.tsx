import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface OrganizationStats {
  totalMembers: number;
  activeMembers: number;
  totalProducts: number;
  totalMovements: number;
  totalAlerts: number;
  totalStockValue: number;
  lowStockProducts: number;
  excessStockProducts: number;
  normalStockProducts: number;
}

interface CreatorInfo {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface ProductsByCategory {
  category: string;
  count: number;
  value: number;
}

interface MemberActivity {
  userId: string;
  movementsCount: number;
  productsCreated: number;
  lastActivity: string | null;
}

interface MovementTrend {
  date: string;
  count: number;
}

export function useOrganizationDetails(organizationId: string) {
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<any>(null);
  const [stats, setStats] = useState<OrganizationStats>({
    totalMembers: 0,
    activeMembers: 0,
    totalProducts: 0,
    totalMovements: 0,
    totalAlerts: 0,
    totalStockValue: 0,
    lowStockProducts: 0,
    excessStockProducts: 0,
    normalStockProducts: 0,
  });
  const [members, setMembers] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [auditLogsPage, setAuditLogsPage] = useState(1);
  const [activitiesTotalPages, setActivitiesTotalPages] = useState(1);
  const [auditLogsTotalPages, setAuditLogsTotalPages] = useState(1);
  const [creatorInfo, setCreatorInfo] = useState<CreatorInfo | null>(null);
  const [productsByCategory, setProductsByCategory] = useState<ProductsByCategory[]>([]);
  const [memberActivity, setMemberActivity] = useState<MemberActivity[]>([]);
  const [movementTrends, setMovementTrends] = useState<MovementTrend[]>([]);
  const [topProduct, setTopProduct] = useState<any>(null);

  // Filter states
  const [activitiesFilters, setActivitiesFilters] = useState({
    type: 'all',
    productId: 'all',
    userId: 'all',
    dateRange: {
      start: null as Date | null,
      end: null as Date | null,
    }
  });

  const [auditFilters, setAuditFilters] = useState({
    action: 'all',
    userId: 'all',
    dateRange: {
      start: null as Date | null,
      end: null as Date | null,
    },
    searchTerm: '',
  });

  // Lists for filter dropdowns
  const [productsList, setProductsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [actionsList, setActionsList] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  const ITEMS_PER_PAGE = 20;

  const loadOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (error) throw error;
      setOrganization(data);
    } catch (error: any) {
      console.error('Error loading organization:', error);
      toast({
        title: 'Erro ao carregar organização',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const loadStats = async () => {
    try {
      const [membersCount, activeMembersCount, productsCount, movementsCount, alertsCount, productsData] = await Promise.all([
        supabase.from('organization_members').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('organization_members').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('is_active', true),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('movements').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('products').select('current_stock, unit_price, min_stock, max_stock').eq('organization_id', organizationId),
      ]);

      // Calculate stock metrics
      const products = productsData.data || [];
      const totalStockValue = products.reduce((sum, p) => sum + (p.current_stock * p.unit_price), 0);
      const lowStock = products.filter(p => p.current_stock < p.min_stock).length;
      const excessStock = products.filter(p => p.max_stock && p.current_stock > p.max_stock).length;
      const normalStock = products.length - lowStock - excessStock;

      setStats({
        totalMembers: membersCount.count || 0,
        activeMembers: activeMembersCount.count || 0,
        totalProducts: productsCount.count || 0,
        totalMovements: movementsCount.count || 0,
        totalAlerts: alertsCount.count || 0,
        totalStockValue,
        lowStockProducts: lowStock,
        excessStockProducts: excessStock,
        normalStockProducts: normalStock,
      });
    } catch (error: any) {
      console.error('Error loading stats:', error);
    }
  };

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*, profiles:user_id(full_name, email, avatar_url)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      console.error('Error loading members:', error);
    }
  };

  const loadActivities = async (page: number = 1, filters = activitiesFilters) => {
    try {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('movements')
        .select('*, products(name), profiles:created_by(full_name)', { count: 'exact' })
        .eq('organization_id', organizationId);

      // Apply filters
      if (filters.type !== 'all') {
        query = query.eq('type', filters.type as any);
      }

      if (filters.productId !== 'all') {
        query = query.eq('product_id', filters.productId);
      }

      if (filters.userId !== 'all') {
        query = query.eq('created_by', filters.userId);
      }

      if (filters.dateRange.start) {
        query = query.gte('created_at', filters.dateRange.start.toISOString());
      }
      if (filters.dateRange.end) {
        query = query.lte('created_at', filters.dateRange.end.toISOString());
      }

      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      
      setActivities(data || []);
      setActivitiesTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (error: any) {
      console.error('Error loading activities:', error);
    }
  };

  const loadAuditLogs = async (page: number = 1, filters = auditFilters) => {
    try {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('security_audit_log')
        .select('*, profiles:user_id(full_name)', { count: 'exact' })
        .eq('organization_id', organizationId);

      // Apply filters
      if (filters.action !== 'all') {
        query = query.eq('action', filters.action);
      }

      if (filters.userId !== 'all') {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.dateRange.start) {
        query = query.gte('created_at', filters.dateRange.start.toISOString());
      }
      if (filters.dateRange.end) {
        query = query.lte('created_at', filters.dateRange.end.toISOString());
      }

      if (filters.searchTerm) {
        query = query.ilike('details', `%${filters.searchTerm}%`);
      }

      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      
      setAuditLogs(data || []);
      setAuditLogsTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (error: any) {
      console.error('Error loading audit logs:', error);
    }
  };

  const loadProductsList = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      setProductsList(data || []);
    } catch (error: any) {
      console.error('Error loading products list:', error);
    }
  };

  const loadUsersList = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('user_id, profiles:user_id(full_name)')
        .eq('organization_id', organizationId);

      if (error) throw error;
      setUsersList(data || []);
    } catch (error: any) {
      console.error('Error loading users list:', error);
    }
  };

  const loadActionsList = async () => {
    try {
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('action')
        .eq('organization_id', organizationId);

      if (error) throw error;
      
      const uniqueActions = [...new Set(data.map(log => log.action))];
      setActionsList(uniqueActions);
    } catch (error: any) {
      console.error('Error loading actions list:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_invoices')
        .select('*')
        .eq('organization_id', organizationId)
        .order('billing_period_start', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error('Error loading invoices:', error);
    }
  };

  const loadCreatorInfo = async () => {
    if (!organization?.created_by) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('id', organization.created_by)
        .single();

      if (error) throw error;
      setCreatorInfo(data);
    } catch (error: any) {
      console.error('Error loading creator info:', error);
    }
  };

  const loadProductsByCategory = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('category, current_stock, unit_price')
        .eq('organization_id', organizationId);

      if (error) throw error;

      const categoryMap = (data || []).reduce((acc: any, product: any) => {
        const cat = product.category;
        if (!acc[cat]) {
          acc[cat] = { category: cat, count: 0, value: 0 };
        }
        acc[cat].count++;
        acc[cat].value += product.current_stock * product.unit_price;
        return acc;
      }, {});

      setProductsByCategory(Object.values(categoryMap));
    } catch (error: any) {
      console.error('Error loading products by category:', error);
    }
  };

  const loadMemberActivity = async () => {
    try {
      const { data: movements, error: movError } = await supabase
        .from('movements')
        .select('created_by, created_at')
        .eq('organization_id', organizationId);

      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('created_by')
        .eq('organization_id', organizationId);

      if (movError || prodError) throw movError || prodError;

      const activityMap = new Map<string, MemberActivity>();

      (movements || []).forEach((mov: any) => {
        const existing = activityMap.get(mov.created_by) || {
          userId: mov.created_by,
          movementsCount: 0,
          productsCreated: 0,
          lastActivity: null,
        };
        existing.movementsCount++;
        if (!existing.lastActivity || new Date(mov.created_at) > new Date(existing.lastActivity)) {
          existing.lastActivity = mov.created_at;
        }
        activityMap.set(mov.created_by, existing);
      });

      (products || []).forEach((prod: any) => {
        const existing = activityMap.get(prod.created_by) || {
          userId: prod.created_by,
          movementsCount: 0,
          productsCreated: 0,
          lastActivity: null,
        };
        existing.productsCreated++;
        activityMap.set(prod.created_by, existing);
      });

      setMemberActivity(Array.from(activityMap.values()));
    } catch (error: any) {
      console.error('Error loading member activity:', error);
    }
  };

  const loadMovementTrends = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('movements')
        .select('created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      const dateMap = new Map<string, number>();
      (data || []).forEach((mov: any) => {
        const date = new Date(mov.created_at).toISOString().split('T')[0];
        dateMap.set(date, (dateMap.get(date) || 0) + 1);
      });

      const trends = Array.from(dateMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setMovementTrends(trends);
    } catch (error: any) {
      console.error('Error loading movement trends:', error);
    }
  };

  const loadTopProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('movements')
        .select('product_id, products(name)')
        .eq('organization_id', organizationId);

      if (error) throw error;

      const productCount = new Map<string, { id: string; name: string; count: number }>();
      (data || []).forEach((mov: any) => {
        const existing = productCount.get(mov.product_id) || {
          id: mov.product_id,
          name: mov.products?.name || 'Desconhecido',
          count: 0,
        };
        existing.count++;
        productCount.set(mov.product_id, existing);
      });

      const sorted = Array.from(productCount.values()).sort((a, b) => b.count - a.count);
      setTopProduct(sorted[0] || null);
    } catch (error: any) {
      console.error('Error loading top product:', error);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadOrganization(),
      loadStats(),
      loadMembers(),
      loadActivities(activitiesPage, activitiesFilters),
      loadAuditLogs(auditLogsPage, auditFilters),
      loadProductsList(),
      loadUsersList(),
      loadActionsList(),
      loadInvoices(),
      loadProductsByCategory(),
      loadMemberActivity(),
      loadMovementTrends(),
      loadTopProduct(),
    ]);
    // Load creator info after organization is loaded
    if (organization?.created_by) {
      await loadCreatorInfo();
    }
    setLoading(false);
  };

  useEffect(() => {
    if (organizationId) {
      loadAllData();
    }
  }, [organizationId]);

  return {
    loading,
    organization,
    stats,
    members,
    activities,
    auditLogs,
    invoices,
    activitiesPage,
    setActivitiesPage,
    auditLogsPage,
    setAuditLogsPage,
    activitiesTotalPages,
    auditLogsTotalPages,
    activitiesFilters,
    setActivitiesFilters,
    auditFilters,
    setAuditFilters,
    productsList,
    usersList,
    actionsList,
    loadActivities,
    loadAuditLogs,
    loadInvoices,
    refreshData: loadAllData,
    creatorInfo,
    productsByCategory,
    memberActivity,
    movementTrends,
    topProduct,
  };
}
