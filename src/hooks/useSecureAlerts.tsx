import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useSecureAlerts() {
  const { user, profile, currentRole } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Only admins and managers can access alerts
  const canAccessAlerts = currentRole === 'admin' || currentRole === 'gerente';

  useEffect(() => {
    if (user && canAccessAlerts) {
      loadAlerts();
      checkStockLevels();
    } else if (user) {
      // Non-admin users get empty alerts
      setAlerts([]);
      setLoading(false);
    }
  }, [user, canAccessAlerts]);

  const loadAlerts = async () => {
    if (!canAccessAlerts) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading alerts:', error);
        return;
      }

      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkStockLevels = async () => {
    if (!canAccessAlerts) return;

    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('*');

      if (error) {
        console.error('Error checking stock levels:', error);
        return;
      }

      // Create alerts only for products with stock below minimum
      for (const product of products || []) {
        if (product.current_stock < product.min_stock) {
          const existingAlert = await supabase
            .from('alerts')
            .select('id')
            .eq('product_id', product.id)
            .eq('type', 'low_stock')
            .eq('is_read', false)
            .single();

          if (!existingAlert.data) {
            await supabase
              .from('alerts')
              .insert({
                title: 'Estoque Baixo',
                message: `Produto ${product.name} está com estoque baixo (${product.current_stock}/${product.min_stock} unidades)`,
                type: 'low_stock',
                severity: product.current_stock === 0 ? 'critical' : 'high',
                product_id: product.id,
              });
          }
        } else {
          // If stock is OK, remove existing alerts for this product
          await supabase
            .from('alerts')
            .delete()
            .eq('product_id', product.id)
            .eq('type', 'low_stock')
            .eq('is_read', false);
        }
      }

      // Reload alerts after creating new ones
      loadAlerts();
    } catch (error) {
      console.error('Error checking stock levels:', error);
    }
  };

  const markAsRead = async (alertId: string) => {
    if (!canAccessAlerts) return;

    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) {
        console.error('Error marking alert as read:', error);
        return;
      }

      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!canAccessAlerts) return;

    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all alerts as read:', error);
        return;
      }

      setAlerts([]);
    } catch (error) {
      console.error('Error marking all alerts as read:', error);
    }
  };

  const deleteAllAlerts = async () => {
    if (!canAccessAlerts) return;

    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('is_read', false);

      if (error) {
        console.error('Error deleting all alerts:', error);
        return;
      }

      setAlerts([]);
    } catch (error) {
      console.error('Error deleting all alerts:', error);
    }
  };

  return {
    alerts: canAccessAlerts ? alerts : [],
    loading,
    loadAlerts,
    markAsRead,
    markAllAsRead,
    deleteAllAlerts,
    checkStockLevels,
    canAccessAlerts,
  };
}