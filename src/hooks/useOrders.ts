import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { offlineStore } from '@/lib/offlineStore';

export interface Order {
  id: string;
  client_id: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export function useOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      setLoading(true);

      const cached = await offlineStore.getFromCache('orders');
      if (cached.length > 0) setOrders(cached);

      if (navigator.onLine && user) {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setOrders(data);
          await offlineStore.saveToCache('orders', data);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar vendas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders();
    }, 0);
    return () => clearTimeout(timer);
  }, [user]);

  return { orders, loading, refreshOrders: loadOrders };
}
