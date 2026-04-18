import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

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

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    if (!user) throw new Error("Sessão expirada. Faça login novamente.");
    try {
      const margin = ((product.price - product.cost_price) / product.price) * 100;

      const { error } = await supabase
        .from('products')
        .insert([{
          ...product,
          margin_percent: margin,
          user_id: user.id
        }]);

      if (error) throw error;
      await fetchProducts();
      return { success: true };
    } catch (error) {
      console.error("Erro ao adicionar produto:", error);
      return { success: false, error };
    }
  };

  const updateStock = async (productId: string, newQuantity: number) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock_quantity: newQuantity })
        .eq('id', productId);

      if (error) throw error;
      await fetchProducts();
      return { success: true };
    } catch (error) {
      console.error("Erro ao atualizar estoque:", error);
      return { success: false, error };
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      await fetchProducts();
      return { success: true };
    } catch (error) {
      console.error("Erro ao deletar produto:", error);
      return { success: false, error };
    }
  };

  return { products, loading, addProduct, updateStock, deleteProduct, refreshProducts: fetchProducts };
}
