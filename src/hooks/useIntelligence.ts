"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface LeaderStats {
  total_points: number;
  level_name: string;
  level_number: number;
  sales_count: number;
  approach_count: number;
  follow_up_count: number;
  global_rank: number;
}

export interface DailyChallenge {
  title: string;
  target: string;
  xp: string;
  progress: number;
  done?: boolean;
}

const LEVEL_THRESHOLDS = [0, 1500, 5000, 10000, 18000, 28000, 40000, 55000, 75000, 100000];
const LEVEL_NAMES = ['Iniciante', 'Consultor', 'Profissional', 'Avançado', 'Especialista em Vendas', 'Expert', 'Mestre', 'Elite', 'Lenda', 'Titã'];

function computeLevel(points: number) {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  const current = LEVEL_THRESHOLDS[level - 1] || 0;
  const next = LEVEL_THRESHOLDS[level] || current + 10000;
  const range = next - current;
  const intoLevel = points - current;
  const progressPct = range > 0 ? Math.min(100, Math.round((intoLevel / range) * 100)) : 0;
  const missing = Math.max(0, next - points);
  return {
    level,
    name: LEVEL_NAMES[level - 1] || 'Lenda',
    current,
    next,
    intoLevel,
    progressPct,
    missing,
  };
}

export function useIntelligence() {
  const [metrics, setMetrics] = useState({
    todaySales: 0,
    conversionRate: 0,
    topProduct: '—',
    bestRegion: 'Geral',
    approachesToday: 0,
    totalOrdersToday: 0,
    totalClients: 0,
    activeOrders: 0,
    weekGoalPercent: 0,
  });
  const [leader, setLeader] = useState<LeaderStats | null>(null);
  const [levelInfo, setLevelInfo] = useState(computeLevel(0));
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIntelligence = async () => {
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Orders (all + today)
      const { data: allOrders } = await supabase
        .from('orders')
        .select('id,total_amount,status,created_at')
        .eq('user_id', user.id);
      const ordersToday = (allOrders ?? []).filter(o => new Date(o.created_at) >= today);
      const salesSum = ordersToday.reduce((s, o) => s + Number(o.total_amount || 0), 0);
      const activeOrders = (allOrders ?? []).filter(o => ['pending', 'paid'].includes(o.status)).length;

      // 2. User's leaderboard row + global rank
      const { data: lb } = await supabase.from('leaderboard').select('*').order('total_points', { ascending: false });
      const mine = lb?.find(r => r.user_id === user.id);
      const rank = lb ? lb.findIndex(r => r.user_id === user.id) + 1 : 0;

      const convRate = mine && mine.approach_count > 0
        ? (mine.sales_count / mine.approach_count) * 100
        : 0;

      // 3. Top Product (by order_items count)
      const orderIds = (allOrders ?? []).map((order) => order.id);
      const { data: items } = orderIds.length > 0
        ? await supabase
          .from('order_items')
          .select('product_id, quantity, products:product_id(name), order_id')
          .in('order_id', orderIds)
        : { data: [] };
      const productTotals: Record<string, { name: string; qty: number }> = {};
      items?.forEach((it: any) => {
        const pname = it.products?.name || 'Desconhecido';
        const key = it.product_id || pname;
        productTotals[key] = productTotals[key] || { name: pname, qty: 0 };
        productTotals[key].qty += it.quantity || 0;
      });
      const topProd = Object.values(productTotals).sort((a, b) => b.qty - a.qty)[0]?.name
        || 'Kit Nutrição Turbo';

      // 4. Best region from clients
      const { data: clientsData } = await supabase.from('clients').select('region').eq('user_id', user.id);
      const regions: Record<string, number> = {};
      clientsData?.forEach(c => {
        if (c.region) regions[c.region] = (regions[c.region] || 0) + 1;
      });
      const bestReg = Object.keys(regions).sort((a, b) => regions[b] - regions[a])[0] || 'São Paulo';

      const totalClients = clientsData?.length || 0;

      // 5. Weekly goal (heuristic: sales this week / target of 8)
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekSales = (allOrders ?? []).filter(o => new Date(o.created_at) >= weekStart).length;
      const weekTarget = 8;
      const weekPct = Math.min(100, Math.round((weekSales / weekTarget) * 100));

      const info = computeLevel(mine?.total_points || 0);

      // 6. Daily challenges from today's activity
      const salesTodayCount = ordersToday.length;
      const clientsTodayTarget = 3;
      const { data: clientsToday } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());
      const newClientsToday = clientsToday?.length || 0;

      setChallenges([
        {
          title: 'Registrar 3 Vendas',
          target: `${salesTodayCount} de 3`,
          xp: '+150 XP',
          progress: Math.min(100, (salesTodayCount / 3) * 100),
          done: salesTodayCount >= 3,
        },
        {
          title: 'Novo Cliente',
          target: newClientsToday >= 1 ? 'Concluído' : `${newClientsToday} de ${clientsTodayTarget}`,
          xp: '+80 XP',
          progress: Math.min(100, (newClientsToday / clientsTodayTarget) * 100),
          done: newClientsToday >= clientsTodayTarget,
        },
        {
          title: 'Completar Treino',
          target: '0 de 1',
          xp: '+200 XP',
          progress: 0,
        },
      ]);

      setMetrics({
        todaySales: salesSum,
        conversionRate: Math.min(Math.round(convRate), 100),
        topProduct: topProd,
        bestRegion: bestReg,
        approachesToday: mine?.approach_count || 0,
        totalOrdersToday: ordersToday.length,
        totalClients,
        activeOrders,
        weekGoalPercent: weekPct,
      });

      if (mine) {
        setLeader({
          total_points: mine.total_points,
          level_name: info.name,
          level_number: info.level,
          sales_count: mine.sales_count,
          approach_count: mine.approach_count,
          follow_up_count: mine.follow_up_count,
          global_rank: rank,
        });
      }
      setLevelInfo(info);
    } catch (error) {
      console.error('Error fetching intelligence:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIntelligence();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return { metrics, leader, levelInfo, challenges, loading, refreshIntelligence: fetchIntelligence };
}

