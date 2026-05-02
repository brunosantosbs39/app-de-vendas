"use client";

export const dynamic = 'force-dynamic';

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { 
  DollarSign, 
  ArrowUpRight,
  ArrowDownRight,
  History,
  TrendingUp,
  PieChart as PieChartIcon,
  TrendingDown,
  Plane,
  Utensils,
  Megaphone,
  Building2,
  MoreVertical,
  Plus,
  Filter,
  Download,
  Calendar
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { NoSSR } from "@/components/layout/NoSSR";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

function FinanceiroContent() {
  const { user } = useAuth();
  const { orders, transactions, fetchInitialData } = useAppStore();
  
  useEffect(() => {
    if (user) fetchInitialData(user.id);
  }, [user]);

  const stats = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === 'entrada')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'saida')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
    
    const netBalance = totalIncome - totalExpenses;
    
    // Agrupar por categoria para o gráfico
    const categoryMap: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'saida')
      .forEach(t => {
        const cat = t.category || 'Outros';
        categoryMap[cat] = (categoryMap[cat] || 0) + (t.amount || 0);
      });
    
    const chartData = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    return { totalIncome, totalExpenses, netBalance, chartData };
  }, [transactions]);

  const COLORS = ['#5DD62C', '#337418', '#1A5800', '#252c20', '#bdcbb2'];

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getCategoryIcon = (category: string) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('viagem') || cat.includes('deslocamento')) return <Plane size={18} />;
    if (cat.includes('alimentação') || cat.includes('comida')) return <Utensils size={18} />;
    if (cat.includes('marketing') || cat.includes('anuncio')) return <Megaphone size={18} />;
    if (cat.includes('infra') || cat.includes('aluguel')) return <Building2 size={18} />;
    return <DollarSign size={18} />;
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-[#F8F8F8] overflow-x-hidden">
      <Header title="Financeiro" />
      <motion.div variants={container} initial="hidden" animate="show" className="flex-1 px-4 sm:px-6 pt-10 pb-36 space-y-8 max-w-7xl mx-auto w-full relative">
        
        {/* Dashboard Header */}
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">Operational Flow</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black uppercase tracking-tighter italic text-white">Painel de <span className="text-primary not-italic">Gastos</span></h2>
          </div>
          <div className="flex gap-3">
            <Button className="h-12 rounded-2xl bg-primary px-6 font-black text-background hover:shadow-[0_0_24px_rgba(93,214,44,.25)]">
              <Plus size={18} /> Novo Registro
            </Button>
            <Button variant="outline" className="h-12 rounded-2xl border-white/10 bg-white/5 px-6 font-black text-white hover:bg-white/10">
              <Download size={18} /> PDF
            </Button>
          </div>
        </section>

        {/* Bento Grid: KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-[#1A1A1A] border-white/5 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/10 transition-colors" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Receita Total</p>
            <h3 className="text-3xl font-black text-primary italic">{formatCurrency(stats.totalIncome)}</h3>
            <div className="mt-4 flex items-center gap-2 text-primary">
              <TrendingUp size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">+12% este mês</span>
            </div>
          </Card>

          <Card className="bg-[#1A1A1A] border-white/5 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-orange-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-orange-500/10 transition-colors" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Despesas Operacionais</p>
            <h3 className="text-3xl font-black text-white italic">{formatCurrency(stats.totalExpenses)}</h3>
            <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: '65%' }}
                 className="h-full bg-gradient-to-r from-orange-500/50 to-orange-500 rounded-full"
               />
            </div>
          </Card>

          <Card className="bg-[#1A1A1A] border-white/5 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp size={120} className="text-primary" />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Saldo Líquido</p>
            <h3 className="text-3xl font-black text-on-surface italic">Excelente</h3>
            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-primary">Performance em alta</p>
          </Card>
        </div>

        {/* Main Operational Area */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Recent Activity List */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Últimas Atividades</h3>
              <div className="flex gap-2">
                <Badge className="bg-primary/10 text-primary border-none font-black px-4 py-1.5 rounded-full text-[10px] tracking-widest uppercase cursor-pointer">Todos</Badge>
                <Badge variant="outline" className="border-white/10 text-slate-500 font-black px-4 py-1.5 rounded-full text-[10px] tracking-widest uppercase hover:text-white cursor-pointer transition-colors">Vendas</Badge>
                <Badge variant="outline" className="border-white/10 text-slate-500 font-black px-4 py-1.5 rounded-full text-[10px] tracking-widest uppercase hover:text-white cursor-pointer transition-colors">Saídas</Badge>
              </div>
            </div>

            <div className="space-y-3">
              {transactions.length === 0 ? (
                <Card className="bg-[#1A1A1A] border-dashed border-white/10 p-12 rounded-[2rem] text-center">
                  <History size={40} className="mx-auto text-slate-700 mb-4" />
                  <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Nenhum registro encontrado</p>
                </Card>
              ) : (
                transactions.slice(0, 10).map((t) => (
                  <motion.div 
                    key={t.id}
                    whileHover={{ scale: 0.995 }}
                    whileTap={{ scale: 0.98 }}
                    className="group bg-[#1A1A1A] hover:bg-[#202020] p-4 rounded-2xl border border-white/5 flex items-center justify-between transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                        t.type === 'entrada' ? "bg-primary/10 text-primary group-hover:bg-primary/20" : "bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/20"
                      )}>
                        {t.type === 'entrada' ? <ArrowUpRight size={20} /> : getCategoryIcon(t.category)}
                      </div>
                      <div>
                        <p className="font-black text-white text-sm uppercase tracking-tight">{t.description}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                          {t.category || 'Venda Direta'} • {new Date(t.date || t.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-black text-lg italic",
                        t.type === 'entrada' ? "text-primary" : "text-white"
                      )}>
                        {t.type === 'entrada' ? '+' : '-'} {formatCurrency(t.amount)}
                      </p>
                      <Badge className={cn(
                        "mt-1 text-[8px] font-black uppercase tracking-[0.15em] border-none",
                        t.type === 'entrada' ? "bg-primary/15 text-primary" : "bg-white/5 text-slate-400"
                      )}>
                        {t.type === 'entrada' ? 'Concluído' : 'Processado'}
                      </Badge>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <Button variant="ghost" className="w-full h-14 rounded-2xl border border-white/5 text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] hover:text-white hover:bg-white/5 transition-all">
              Ver extrato completo
            </Button>
          </div>

          {/* Side Column: Distribution Chart */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-[#1A1A1A] border-white/5 p-8 rounded-[2.5rem] flex flex-col items-center justify-center shadow-2xl relative overflow-hidden group">
              <h3 className="text-lg font-black uppercase italic tracking-tighter text-white self-start mb-8 flex items-center gap-3">
                 <PieChartIcon size={20} className="text-primary" />
                 Distribuição
              </h3>
              
              <div className="relative w-full h-64 mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.chartData.length > 0 ? stats.chartData : [{ name: 'Sem dados', value: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {stats.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                      {stats.chartData.length === 0 && <Cell fill="#252c20" />}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,.1)', borderRadius: '1rem', color: '#fff' }}
                      itemStyle={{ color: '#5DD62C', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()}</span>
                  <span className="text-2xl font-black text-white italic">100%</span>
                </div>
              </div>

              <div className="w-full space-y-3">
                {stats.chartData.slice(0, 3).map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between group/item">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover/item:text-white transition-colors">{item.name}</span>
                    </div>
                    <span className="text-xs font-black text-white">{Math.round((item.value / stats.totalExpenses) * 100) || 0}%</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-[#1A1A1A] border-white/5 p-6 rounded-[2rem] relative overflow-hidden group">
               <div className="relative z-10">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                     <TrendingUp size={20} />
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-white mb-2">Dica Vivid</h4>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase">
                    Seus gastos com <span className="text-primary">Alimentação</span> subiram 15% esta semana. Considere reavaliar o budget corporativo.
                  </p>
               </div>
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <DollarSign size={80} className="text-white" />
               </div>
            </Card>
          </div>
        </section>
      </motion.div>
    </div>
  );
}

export default function FinanceiroPage() {
  return (
    <NoSSR fallback={<div className="min-h-screen bg-[#0F0F0F]" />}>
      <FinanceiroContent />
    </NoSSR>
  );
}
