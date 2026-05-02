"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { 
  BarChart2,
  CalendarDays,
  Edit3,
  Package,
  Target,
  Users,
  Zap, 
  ArrowUpRight,
  ArrowDownRight,
  Plus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import Link from "next/link";
import { format, startOfMonth, subDays, parseISO, isSameDay } from "date-fns";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { NoSSR } from "@/components/layout/NoSSR";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

function DashboardContent() {
  const auth = useAuth();
  const user = auth?.user;
  const authLoading = auth?.loading;
  const { orders, clients, products, appointments, fetchInitialData, isLoading } = useAppStore();
  
  const [activeRange] = useState("Semana"); 
  const [startDate] = useState(subDays(new Date(), 7).toISOString().split('T')[0]);
  const [endDate] = useState(new Date().toISOString().split('T')[0]);
  const [goal, setGoal] = useState(0);
  const [goalInput, setGoalInput] = useState("");
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  
  useEffect(() => {
    if (user) {
      fetchInitialData(user.id);
      fetchGoal(user.id);
    }
  }, [user]);

  const fetchGoal = async (userId: string) => {
    const monthYear = startOfMonth(new Date()).toISOString().split("T")[0];
    const { data } = await supabase
      .from("goals")
      .select("target_amount")
      .eq("user_id", userId)
      .eq("month_year", monthYear)
      .maybeSingle();

    if (data) setGoal(Number(data.target_amount || 0));
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = order.created_at.split('T')[0];
      return orderDate >= startDate && orderDate <= endDate;
    });
  }, [orders, startDate, endDate]);

  const totalRevenue = useMemo(() => filteredOrders.reduce((acc, curr) => acc + curr.total_amount, 0), [filteredOrders]);
  
  const totalReceived = useMemo(() => filteredOrders.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0), [filteredOrders]);
  const goalProgress = goal > 0 ? Math.min(100, (totalRevenue / goal) * 100) : 0;
  const pendingRevenue = Math.max(0, totalRevenue - totalReceived);
  const lowStock = useMemo(() => products.filter((p) => Number(p.stock_quantity || 0) <= Number(p.min_stock_alert || 5)).length, [products]);
  const todayAppointments = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return appointments.filter((appointment) => String(appointment.appointment_date || "").startsWith(today)).length;
  }, [appointments]);

  const chartData = useMemo(() => {
    const end = parseISO(endDate);
    return Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(end, 6 - i);
      const dayOrders = filteredOrders.filter(o => isSameDay(parseISO(o.created_at), date));
      const revenue = dayOrders.reduce((acc, curr) => acc + curr.total_amount, 0);
      return {
        name: format(date, 'dd/MM'),
        revenue: revenue
      };
    });
  }, [filteredOrders, endDate]);

  if (authLoading || isLoading) return <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center"><Zap className="text-primary animate-pulse w-10 h-10" /></div>;

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const handleUpdateGoal = async () => {
    if (!user || !goalInput) return;
    const targetAmount = Number(goalInput);
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      toast.error("Informe uma meta válida.");
      return;
    }

    const monthYear = startOfMonth(new Date()).toISOString().split("T")[0];
    const payload = {
      user_id: user.id,
      month_year: monthYear,
      target_amount: targetAmount,
      updated_at: new Date().toISOString(),
    };

    const { data: existingGoal } = await supabase
      .from("goals")
      .select("id")
      .eq("user_id", user.id)
      .eq("month_year", monthYear)
      .maybeSingle();

    const { error } = existingGoal
      ? await supabase.from("goals").update(payload).eq("id", existingGoal.id).eq("user_id", user.id)
      : await supabase.from("goals").insert([payload]);

    if (error) {
      toast.error(error.message);
      return;
    }

    setGoal(targetAmount);
    setGoalInput("");
    setIsGoalModalOpen(false);
    toast.success("Meta atualizada.");
  };

  const latestOrders = filteredOrders.slice(0, 5);
  const kpis = [
    { label: "Receita Bruta", value: formatCurrency(totalRevenue), icon: BarChart2, tone: "text-white", detail: `${filteredOrders.length} venda${filteredOrders.length === 1 ? "" : "s"} no período` },
    { label: "Recebido", value: formatCurrency(totalReceived), icon: ArrowUpRight, tone: "text-primary", detail: `${formatCurrency(pendingRevenue)} em aberto` },
    { label: "Clientes", value: clients.length, icon: Users, tone: "text-white", detail: "base ativa" },
    { label: "Alertas", value: lowStock + todayAppointments, icon: Package, tone: lowStock > 0 ? "text-orange-300" : "text-slate-200", detail: `${lowStock} estoque baixo · ${todayAppointments} agenda hoje` },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-[#F8F8F8] overflow-x-hidden">
      <Header title="Performance" />
      <motion.div variants={container} initial="hidden" animate="show" className="flex-1 px-4 sm:px-6 pt-10 pb-44 space-y-8 max-w-7xl mx-auto w-full relative">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">Visão operacional</p>
            <h2 className="mt-2 text-3xl sm:text-5xl font-black uppercase tracking-tighter italic">Dashboard <span className="text-primary not-italic">Elite</span></h2>
          </div>
          <div className="flex gap-3">
            <Link href="/clientes" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-background transition-all hover:shadow-[0_0_24px_rgba(93,214,44,.25)]">
              <Plus size={18} /> Cliente
            </Link>
            <Link href="/agenda" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-black text-white transition-all hover:bg-white/10">
              <CalendarDays size={18} /> Agenda
            </Link>
          </div>
        </section>

        <Card className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#1A1A1A] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-background shadow-[0_0_30px_rgba(93,214,44,.25)]">
                <Target size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Objetivo financeiro</p>
                <h3 className="mt-1 text-3xl font-black italic text-white">{formatCurrency(goal)}</h3>
              </div>
            </div>
            <Button onClick={() => setIsGoalModalOpen(true)} className="h-12 rounded-2xl bg-white/5 px-5 font-black text-white hover:bg-primary hover:text-background">
              <Edit3 size={16} /> Definir meta
            </Button>
          </div>
          <div className="mt-6 space-y-3">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-primary">{goalProgress.toFixed(1)}% atingido</span>
              <span className="text-slate-400">Faltam {formatCurrency(Math.max(0, goal - totalRevenue))}</span>
            </div>
            <div className="h-3 rounded-full bg-black/40 p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${goalProgress}%` }}
                className="h-full rounded-full bg-primary shadow-[0_0_20px_rgba(93,214,44,.45)]"
              />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
           {kpis.map((kpi) => (
            <Card key={kpi.label} className="bg-[#1A1A1A] border border-white/5 p-5 sm:p-6 rounded-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                  <h3 className={`mt-2 text-2xl font-black ${kpi.tone}`}>{kpi.value}</h3>
                </div>
                <div className="h-11 w-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary">
                  <kpi.icon size={20} />
                </div>
              </div>
              <p className="mt-4 text-xs font-bold text-slate-400">{kpi.detail}</p>
            </Card>
           ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-5">
          <Card className="bg-[#1A1A1A] border border-white/5 rounded-[2rem] p-5 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeRange}</p>
                <h3 className="text-xl font-black text-white">Receita diária</h3>
              </div>
              <ArrowUpRight className="text-primary" />
            </div>
            <div className="mt-6 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, color: "#fff" }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#5DD62C" fill="#5DD62C22" strokeWidth={4} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="bg-[#1A1A1A] border border-white/5 rounded-[2rem] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white">Últimas vendas</h3>
              <BarChart2 className="text-primary" size={20} />
            </div>
            <div className="mt-5 space-y-3">
              {latestOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-center">
                  <Zap className="mx-auto text-primary" />
                  <p className="mt-3 text-sm font-black text-white">Nenhuma venda no período</p>
                  <p className="mt-1 text-xs text-slate-400">Cadastre clientes e vendas para alimentar o painel.</p>
                </div>
              ) : (
                latestOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.03] p-4">
                    <div>
                      <p className="text-sm font-black text-white">{order.clients?.name || "Venda avulsa"}</p>
                      <p className="text-xs font-bold text-slate-400">{format(parseISO(order.created_at), "dd/MM/yyyy")}</p>
                    </div>
                    <p className="text-sm font-black text-primary">{formatCurrency(Number(order.total_amount || 0))}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Botão de Operação Flutuante/Final */}
      <div className="px-4 pb-12 sm:px-6 max-w-7xl mx-auto w-full relative z-10">
        <Link href="/clientes">
          <Button 
            className="w-full h-16 bg-primary text-background font-black uppercase text-xs tracking-[0.3em] rounded-2xl shadow-[0_20px_40px_rgba(93,214,44,0.25)] gap-3 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Zap size={20} strokeWidth={3} fill="currentColor" /> NOVA OPERAÇÃO
          </Button>
        </Link>
        <div className="h-24" /> {/* Respiro para o scroll ultrapassar a BottomNav */}
      </div>

      <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
        <DialogContent className="max-w-sm rounded-[2rem] border border-white/10 bg-[#101010] p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase text-white">Meta do mês</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="goal" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Valor alvo</Label>
              <Input
                id="goal"
                type="number"
                min="0"
                step="0.01"
                value={goalInput}
                onChange={(event) => setGoalInput(event.target.value)}
                className="h-14 rounded-2xl border-white/10 bg-white/5 text-xl font-black text-white"
                placeholder="10000"
              />
            </div>
            <Button onClick={handleUpdateGoal} className="h-12 w-full rounded-2xl font-black">Salvar meta</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <NoSSR fallback={<div className="min-h-screen bg-[#0F0F0F]" />}>
      <DashboardContent />
    </NoSSR>
  );
}
