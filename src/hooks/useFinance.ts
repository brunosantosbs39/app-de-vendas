"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { offlineStore } from '@/lib/offlineStore';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

export interface ScheduledSale {
  id: string;
  expected_amount: number;
  scheduled_date: string;
  description: string;
  status: string;
}

export function useFinance() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [scheduledSales, setScheduledSales] = useState<ScheduledSale[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      if (!user) {
        setExpenses([]);
        return;
      }
      
      // Carrega do Cache
      const cachedExpenses = await offlineStore.getFromCache('expenses', user.id);
      if (cachedExpenses.length > 0) setExpenses(cachedExpenses);

      // Se online, atualiza do servidor
      if (navigator.onLine && user) {
        const { data: expData, error: expError } = await supabase
          .from('expenses')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (!expError && expData) {
          setExpenses(expData);
          await offlineStore.saveToCache('expenses', expData, user.id);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados financeiros:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFinanceData();
    }, 0);
    return () => clearTimeout(timer);
  }, [user]);

  const addExpense = async (expenseData: Omit<Expense, 'id'>) => {
    if (!user) return { success: false, error: "Usuário não autenticado" };
    try {
      const newExpense = {
        ...expenseData,
        id: crypto.randomUUID(),
        user_id: user.id
      };

      await offlineStore.addToSyncQueue('expenses', 'INSERT', newExpense, user.id);
      setExpenses(prev => [newExpense as any, ...prev]);

      return { success: true };
    } catch (error) {
      console.error("Erro ao adicionar despesa offline:", error);
      return { success: false, error };
    }
  };

  return { expenses, scheduledSales, loading, addExpense, refreshFinance: loadFinanceData };
}

