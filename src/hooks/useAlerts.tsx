import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAlerts();
      checkStockLevels();
    }
  }, [user]);

  const loadAlerts = async () => {
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
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('*');

      if (error) {
        console.error('Error checking stock levels:', error);
        return;
      }

      // Criar alertas apenas para produtos com estoque abaixo do mínimo
      for (const product of products || []) {
        // Só criar alerta se current_stock for menor que min_stock
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
          // Se o estoque está ok, remover alertas existentes deste produto
          await supabase
            .from('alerts')
            .delete()
            .eq('product_id', product.id)
            .eq('type', 'low_stock')
            .eq('is_read', false);
        }
      }

      // Recarregar alertas após criar novos
      loadAlerts();
    } catch (error) {
      console.error('Error checking stock levels:', error);
    }
  };

  const markAsRead = async (alertId: string) => {
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
    alerts,
    loading,
    loadAlerts,
    markAsRead,
    markAllAsRead,
    deleteAllAlerts,
    checkStockLevels,
  };
}