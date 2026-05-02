"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  region?: string;
  financial_status: 'ok' | 'pending';
  funnel_stage?: 'contato' | 'interessado' | 'negociacao' | 'fechado' | 'pos_venda';
  last_order_date?: string;
}

export function useClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async () => {
    try {
      if (!user) {
        setClients([]);
        return;
      }
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshClients = async () => {
    setLoading(true);
    await fetchClients();
  };

  const addClient = async (client: Omit<Client, 'id' | 'last_order_date'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...client, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      setClients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const updateClient = async (id: string, updates: Partial<Omit<Client, 'id'>>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setClients(prev => prev.map(c => (c.id === id ? { ...c, ...data } : c)));
      return data;
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients();
    }, 0);
    return () => clearTimeout(timer);
  }, [user]);

  return { clients, loading, error, addClient, updateClient, refresh: fetchClients };
}

