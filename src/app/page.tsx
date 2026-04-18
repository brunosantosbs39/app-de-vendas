"use client";

import { useState, useEffect } from "react";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { 
  TrendingUp, 
  Users, 
  Target, 
  Zap, 
  Plus, 
  Trophy, 
  DollarSign, 
  PieChart, 
  MapPin, 
  Star, 
  Activity, 
  Mic,
  ArrowUpRight,
  ChevronRight,
  LayoutGrid,
  Calendar,
  Clock,
  Briefcase,
  GraduationCap
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { gamificationService } from "@/lib/gamification";
import { supabase } from "@/lib/supabase";
import { useIntelligence } from "@/hooks/useIntelligence";
import { useAuth } from "@/hooks/useAuth";
import { SalesFunnel } from "@/components/sales/SalesFunnel";
import { TerritoryMap } from "@/components/maps/TerritoryMap";

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 260, damping: 20 } }
};

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [goalValue, setGoalValue] = useState(10000);
  const [currentSales, setCurrentSales] = useState(7500);
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
  const [saleAmount, setSaleAmount] = useState("");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const { metrics, refreshIntelligence } = useIntelligence();

  const fetchLeaderboard = async () => {
    try {
      const board = await gamificationService.getLeaderboard();
      setLeaderboard(board?.slice(0, 3) || []);
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    fetchLeaderboard();
    const leaderboardChannel = supabase.channel('dashboard:leaderboard').on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, () => {
      fetchLeaderboard();
      refreshIntelligence();
    }).subscribe();
    return () => { supabase.removeChannel(leaderboardChannel); };
  }, []);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F0F0F] text-slate-500">
        Carregando...
      </div>
    );
  }

  if (!user) {
    // Middleware já protege, mas este guard evita crash durante hydration edge cases.
    return null;
  }

  const currentUser = {
    id: user.id,
    name: (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Consultor",
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleRegisterSale = async () => {
    const amount = parseFloat(saleAmount);
    if (!isNaN(amount) && amount > 0) {
      setCurrentSales(prev => prev + amount);
      await gamificationService.recordAction(currentUser.id, currentUser.name, 'sale', `registrou uma venda de ${formatCurrency(amount)}`, 50);
      setSaleAmount("");
      setIsSaleDialogOpen(false);
    }
  };

  const progressPercentage = Math.min(Math.round((currentSales / goalValue) * 100), 100);

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-[#F8F8F8]">
      <Header title="Performance Core" />
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="flex-1 space-y-12 p-8 pb-44 max-w-7xl mx-auto w-full"
      >
        {/* TOP ROW: USER STATUS & QUICK ACTION */}
        <motion.section variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white/5 p-10 rounded-[3rem] border border-white/5 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Zap size={200} className="text-primary" />
           </div>
           <div className="flex items-center gap-8 relative z-10">
              <div className="h-24 w-24 rounded-[2.5rem] bg-primary flex items-center justify-center font-black text-background text-4xl shadow-[0_0_50px_rgba(93,214,44,0.4)]">
                 10
              </div>
              <div className="space-y-2">
                 <div className="flex items-center gap-3">
                    <h2 className="text-4xl font-black tracking-tighter uppercase">{currentUser.name}</h2>
                    <Badge className="bg-primary text-background border-none font-black text-[10px] px-3 py-1 uppercase tracking-widest">Elite Member</Badge>
                 </div>
                 <div className="flex items-center gap-6 text-slate-400 font-bold uppercase text-xs tracking-widest">
                    <div className="flex items-center gap-2"><Trophy size={14} className="text-primary" /> 2.100 XP</div>
                    <div className="flex items-center gap-2"><Star size={14} className="text-yellow-500" /> 15 Vendas</div>
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-4 relative z-10">
              <Link href="/jarvis">
                 <Button className="h-20 w-20 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 text-primary transition-all">
                    <Mic size={32} />
                 </Button>
              </Link>
              <Dialog open={isSaleDialogOpen} onOpenChange={setIsSaleDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="h-20 px-10 rounded-[2rem] bg-primary text-background font-black text-xl shadow-[0_0_40px_rgba(93,214,44,0.3)] hover:scale-105 transition-all group">
                    NOVA VENDA <Plus className="ml-4 group-hover:rotate-90 transition-transform" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1A1A1A] border-white/5 text-white rounded-[3rem] p-10">
                  <DialogHeader><DialogTitle className="text-3xl font-black tracking-tighter">Registrar Operação</DialogTitle></DialogHeader>
                  <div className="py-8 space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Faturamento Bruto (R$)</Label>
                    <Input 
                      type="number" 
                      value={saleAmount}
                      onChange={(e) => setSaleAmount(e.target.value)}
                      placeholder="0.00" 
                      className="h-20 bg-[#0F0F0F] border-none rounded-[1.5rem] text-4xl font-black px-8 focus-visible:ring-primary"
                    />
                  </div>
                  <Button onClick={handleRegisterSale} className="btn-primary w-full h-20 text-xl font-black uppercase tracking-widest">Confirmar Transação</Button>
                </DialogContent>
              </Dialog>
           </div>
        </motion.section>

        {/* SECOND ROW: MAIN KPIS */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-8">
           {[
             { label: "Faturamento Hoje", val: formatCurrency(metrics.todaySales), icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
             { label: "Conversão Real", val: `${metrics.conversionRate}%`, icon: Activity, color: "text-orange-500", bg: "bg-orange-500/10" },
             { label: "Top Território", val: metrics.bestRegion, icon: MapPin, color: "text-blue-500", bg: "bg-blue-500/10" },
             { label: "Ticket Médio", val: formatCurrency(currentSales / 15), icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10" }
           ].map((kpi, i) => (
             <motion.div key={i} variants={item}>
                <Card className="bg-[#1A1A1A] border-none p-8 space-y-6 group hover:bg-white/5 transition-all">
                   <div className={`h-14 w-14 rounded-2xl ${kpi.bg} flex items-center justify-center ${kpi.color}`}>
                      <kpi.icon size={28} />
                   </div>
                   <div className="space-y-1">
                      <div className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{kpi.label}</div>
                      <div className="text-3xl font-black text-white tracking-tighter">{kpi.val}</div>
                   </div>
                </Card>
             </motion.div>
           ))}
        </section>

        {/* THIRD ROW: INTELLIGENCE SPLIT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
           
           {/* LEFT: SALES FUNNEL */}
           <motion.section variants={item} className="lg:col-span-1 space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3"><Activity className="text-primary" /> Fluxo de Funil</h3>
                 <Link href="/clientes"><Button variant="ghost" size="sm" className="text-primary font-black uppercase text-[10px] tracking-widest">Ver Todos</Button></Link>
              </div>
              <div className="bg-[#1A1A1A] p-6 rounded-[2.5rem] border border-white/5">
                 <SalesFunnel clients={[]} />
              </div>
           </motion.section>

           {/* CENTER: TERRITORY STRATEGY */}
           <motion.section variants={item} className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3"><MapPin className="text-primary" /> Domínio de Área</h3>
                 <Badge className="bg-white/5 text-slate-500 border-none font-black uppercase text-[10px] px-3">Mapa Inteligente Ativo</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-[#1A1A1A] p-8 rounded-[3rem] border border-white/5">
                 <TerritoryMap territories={[
                    { id: '1', name: 'Centro', salesCount: 15, visitFrequency: 5, lastVisitDays: 2, status: 'hot' },
                    { id: '2', name: 'Zona Sul', salesCount: 8, visitFrequency: 3, lastVisitDays: 12, status: 'urgent' },
                 ]} />
                 <div className="space-y-8">
                    <Card className="bg-white/5 border-none p-8 space-y-4">
                       <h4 className="text-primary font-black uppercase text-[10px] tracking-widest">Análise de IA</h4>
                       <p className="text-slate-400 text-sm leading-relaxed font-medium">
                          Sua performance na <span className="text-white font-bold">Zona Sul</span> caiu. O Jarvis recomenda 3 novas abordagens nas próximas 2 horas para garantir a meta.
                       </p>
                       <Button className="w-full bg-primary/20 text-primary border-none font-black uppercase text-[10px] tracking-widest h-12 rounded-xl">Otimizar Rota</Button>
                    </Card>
                    <div className="space-y-4">
                       <h4 className="text-slate-500 font-black uppercase text-[10px] tracking-widest px-2">Metas de Performance</h4>
                       <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black text-white uppercase px-1"><span>Mensal</span><span>{progressPercentage}%</span></div>
                          <div className="h-2 w-full bg-black rounded-full overflow-hidden border border-white/5">
                             <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} className="h-full bg-primary" />
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </motion.section>
        </div>

        {/* FOURTH ROW: LIVE SOCIAL PERFORMANCE */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-10">
           <motion.div variants={item} className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3"><Trophy className="text-primary" /> Ranking Global</h3>
                 <Link href="/comunidade"><Button variant="ghost" className="text-primary font-black text-[10px] uppercase tracking-widest">Comunidade</Button></Link>
              </div>
              <div className="bg-[#1A1A1A] rounded-[3rem] border border-white/5 overflow-hidden divide-y divide-white/5">
                 {leaderboard.map((u, i) => (
                   <div key={i} className="flex items-center justify-between p-8 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-8">
                         <span className={`text-4xl font-black ${i === 0 ? 'text-yellow-500' : 'text-slate-700'}`}>#{i + 1}</span>
                         <div className="h-16 w-16 rounded-2xl bg-slate-800 flex items-center justify-center font-black text-xl">{u.user_name.charAt(0)}</div>
                         <div>
                            <div className="text-xl font-black text-white">{u.user_name}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{u.level_name} • {u.total_points} XP</div>
                         </div>
                      </div>
                      <ChevronRight className="text-slate-800" />
                   </div>
                 ))}
              </div>
           </motion.div>

           <motion.div variants={item} className="space-y-6">
              <h3 className="text-2xl font-black tracking-tighter uppercase px-2">Próximos Passos</h3>
              <div className="space-y-4">
                 {[
                   { title: "Pós-Venda: Maria", time: "Hoje, 14:00", icon: Clock, color: "text-blue-500" },
                   { title: "Entrega: Kit Nutrição", time: "Hoje, 16:30", icon: Briefcase, color: "text-primary" },
                   { title: "Treinamento Novo", time: "Pendente", icon: GraduationCap, color: "text-orange-500" }
                 ].map((task, i) => (
                   <Card key={i} className="bg-[#1A1A1A] border-none p-6 group hover:bg-white/5 transition-all cursor-pointer">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center ${task.color}`}><task.icon size={20} /></div>
                            <div>
                               <div className="font-black text-white text-sm">{task.title}</div>
                               <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{task.time}</div>
                            </div>
                         </div>
                         <ChevronRight size={16} className="text-slate-800 group-hover:text-primary transition-colors" />
                      </div>
                   </Card>
                 ))}
              </div>
           </motion.div>
        </section>

      </motion.div>
    </div>
  );
}
