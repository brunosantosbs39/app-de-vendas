import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { offlineStore } from '@/lib/offlineStore';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  cost_price: number;
  margin_percent: number;
  stock_quantity: number;
  min_stock_alert: number;
  category: string;
}

export function useProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    try {
      setLoading(true);
      
      // 1. Tenta carregar do Cache Local IMEDIATAMENTE
      const cached = await offlineStore.getFromCache('products');
      if (cached.length > 0) {
        setProducts(cached);
      }

      // 2. Se estiver online, busca do Supabase e atualiza o Cache
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('name', { ascending: true });

        if (!error && data) {
          setProducts(data);
          await offlineStore.saveToCache('products', data);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const addProduct = async (productData: Omit<Product, 'id'>) => {
    if (!user) throw new Error("Sessão expirada.");
    
    try {
      const margin = ((productData.price - productData.cost_price) / productData.price) * 100;
      const newProduct = {
        ...productData,
        id: crypto.randomUUID(), // Gera ID local
        margin_percent: margin,
        user_id: user.id
      };

      // SALVA LOCALMENTE E ADICIONA NA FILA DE SYNC
      await offlineStore.addToSyncQueue('products', 'INSERT', newProduct);
      
      // Atualiza a UI imediatamente
      setProducts(prev => [...prev, newProduct as any].sort((a, b) => a.name.localeCompare(b.name)));

      return { success: true };
    } catch (error) {
      console.error("Erro ao adicionar produto offline:", error);
      return { success: false, error };
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      await offlineStore.addToSyncQueue('products', 'DELETE', { id: productId });
      setProducts(prev => prev.filter(p => p.id !== productId));
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  return { products, loading, addProduct, deleteProduct, refreshProducts: loadProducts };
}
