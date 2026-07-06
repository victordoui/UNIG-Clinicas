import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Configurar listener para novos alertas
    const alertsChannel = supabase
      .channel('alerts-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alerts'
      }, (payload) => {
        const newAlert = payload.new;
        
        // Mostrar toast para novos alertas
        toast({
          title: newAlert.title,
          description: newAlert.message,
          variant: newAlert.severity === 'error' ? 'destructive' : 'default',
        });

        // Adicionar à lista de notificações
        setNotifications(prev => [newAlert, ...prev.slice(0, 9)]);
      })
      .subscribe();

    // Configurar listener para novas movimentações
    const movementsChannel = supabase
      .channel('movements-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'movements'
      }, (payload) => {
        const newMovement = payload.new;
        
        // Mostrar toast para novas movimentações
        toast({
          title: 'Nova Movimentação',
          description: `Movimento de ${newMovement.type} registrado`,
        });
      })
      .subscribe();

    // Configurar listener para produtos com estoque baixo
    const productsChannel = supabase
      .channel('products-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'products'
      }, (payload) => {
        const updatedProduct = payload.new;
        
        // Verificar se estoque ficou baixo
        if (updatedProduct.current_stock <= updatedProduct.min_stock) {
          toast({
            title: 'Estoque Baixo',
            description: `Produto ${updatedProduct.name} está com estoque baixo`,
            variant: 'destructive',
          });
        }
      })
      .subscribe();

    // Cleanup
    return () => {
      alertsChannel.unsubscribe();
      movementsChannel.unsubscribe();
      productsChannel.unsubscribe();
    };
  }, [toast]);

  return {
    notifications,
    setNotifications
  };
}