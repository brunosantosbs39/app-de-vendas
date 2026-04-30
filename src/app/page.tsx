"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { 
  TrendingUp, 
  Zap, 
  Plus, 
  BarChart2, 
  Calendar,
  Loader2,
  ShoppingCart,
  Banknote,
  FileText,
  Table as TableIcon,
  Layout,
  Target,
  Edit3,
  CheckCircle2,
  Filter,
  AlertTriangle,
  User,
  Package,
  Wallet,
  CreditCard,
  CircleDollarSign,
  ChevronRight,
  ArrowRight,
  ArrowDownRight,
  Sparkles,
  X
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format, subDays, isSameDay, startOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from "@/lib/supabase";
import { generateFullReport, generateReceipt } from "@/lib/pdfGenerator";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
  const { orders, products, clients, missions, fetchInitialData, isLoading } = useAppStore();
  
  // --- ESTADOS DE FILTRO ---
  const [activeRange, setActiveTab] = useState("Semana"); 
  const [startDate, setStartDate] = useState(subDays(new Date(), 7).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  // --- ESTADOS DE METAS ---
  const [goal, setGoal] = useState<number>(0);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newGoalValue, setNewGoalValue] = useState("");

  // --- ESTADOS DE MISSÕES / DETALHES ---
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);

  // --- ESTADOS DE VENDA (UX Melhorada) ---
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [saleStep, setSaleStep] = useState(1); // 1: Cliente/Produto, 2: Pagamento/Confirmação
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [saleData, setSaleData] = useState({
    clientId: "",
    productId: "",
    quantity: 1,
    amountPaid: 0,
    paymentMethod: "pix",
    installmentsCount: 1,
    dueDates: [
      new Date().toISOString().split('T')[0],
      new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      new Date(new Date().setMonth(new Date().getMonth() + 2)).toISOString().split('T')[0]
    ]
  });

  // --- ESTADO DE PARCELAMENTO (FIADO) ---
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [selectedOrderForInstallments, setSelectedOrderForInstallments] = useState<any>(null);
  const [installmentCount, setInstallmentCount] = useState(1);

  // --- ESTADO DE EDIÇÃO DE VENDA ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<any>(null);

  // --- ESTADO DE GASTOS ---
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseData, setExpenseData] = useState({ amount: "", description: "", category: "pessoal" });

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !expenseData.amount) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase.from('transactions').insert([{
        user_id: user.id,
        amount: parseFloat(expenseData.amount),
        type: 'saida',
        category: expenseData.category,
        description: expenseData.description || (expenseData.category === 'pessoal' ? 'Gasto Pessoal' : 'Gasto manual')
      }]);

      if (error) throw error;
      
      toast.success("Gasto registrado e saldo atualizado!");
      setIsExpenseModalOpen(false);
      setExpenseData({ amount: "", description: "", category: "pessoal" });
      fetchInitialData(user.id);
    } catch (e: any) {
      toast.error("Erro ao registrar gasto: " + e.message);
    } finally {
      setIsProcessing(null as any); // Reset processing
      setIsProcessing(false);
    }
  };

  const handleGenerateOrderPDF = async (order: any) => {
    try {
      const { data: installments } = await supabase
        .from('installments')
        .select('*')
        .eq('order_id', order.id);

      generateReceipt({
        clientName: order.clients?.name || 'Cliente',
        amount: order.total_amount,
        description: `Compra de Produtos - Ref: ${order.id.slice(0,4)}`,
        date: new Date(order.created_at),
        receiptId: order.id.slice(0,6),
        paymentMethod: order.payment_method,
        isScheduled: order.status !== 'paid',
        quantity: order.quantity,
        installments: installments && installments.length > 0 ? {
          count: installments.length,
          value: installments[0].amount,
          dueDates: installments.map((i: any) => i.due_date)
        } : undefined
      });
      toast.success("Recibo gerado com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao gerar recibo: " + e.message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchInitialData(user.id);
      fetchGoal();
      checkAndSeedMissions();
    }
  }, [user]);

  const handleUpdateOrder = async () => {
    if (!selectedOrderForEdit || !user) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          amount_paid: selectedOrderForEdit.amount_paid,
          status: selectedOrderForEdit.amount_paid >= selectedOrderForEdit.total_amount ? 'paid' : 'partial',
          payment_method: selectedOrderForEdit.payment_method
        })
        .eq('id', selectedOrderForEdit.id);

      if (error) throw error;

      toast.success("Venda atualizada com sucesso!");
      setIsEditModalOpen(false);
      fetchInitialData(user.id);
    } catch (e: any) {
      toast.error("Erro ao atualizar: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenMission = (mission: any) => {
    setSelectedMission(mission);
    setIsMissionModalOpen(true);
  };

  const handleCreateInstallments = async () => {
    if (!selectedOrderForInstallments || !user) return;
    setIsProcessing(true);
    try {
      const remainingAmount = selectedOrderForInstallments.total_amount - (selectedOrderForInstallments.amount_paid || 0);
      const valuePerInstallment = remainingAmount / installmentCount;
      
      const installments = Array.from({ length: installmentCount }).map((_, i) => ({
        order_id: selectedOrderForInstallments.id,
        user_id: user.id,
        amount: valuePerInstallment,
        due_date: subDays(new Date(), -(30 * (i + 1))).toISOString(),
        status: 'pending'
      }));

      const { error } = await supabase.from('installments').insert(installments);
      if (error) throw error;

      toast.success(`${installmentCount} parcelas de ${formatCurrency(valuePerInstallment)} programadas!`);
      setIsInstallmentModalOpen(false);
      fetchInitialData(user.id);
    } catch (e: any) {
      toast.error("Erro ao parcelar: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchGoal = async () => {
    if (!user) return;
    const startOfCurrentMonth = startOfMonth(new Date()).toISOString().split('T')[0];
    const { data } = await supabase
      .from('goals')
      .select('target_amount')
      .eq('user_id', user.id)
      .eq('month_year', startOfCurrentMonth)
      .maybeSingle();
    
    if (data) setGoal(Number(data.target_amount));
  };

  const checkAndSeedMissions = async () => {
    if (!user) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: existingMissions } = await supabase
      .from('daily_missions')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', todayStr);

    if (!existingMissions || existingMissions.length === 0) {
      const defaultMissions = [
        { user_id: user.id, title: "Primeira Venda", target_value: 1, type: "vendas", xp_reward: 150, date: todayStr },
        { user_id: user.id, title: "Contatos de Ouro", target_value: 3, type: "visitas", xp_reward: 100, date: todayStr },
        { user_id: user.id, title: "Liquidação de Pendência", target_value: 1, type: "recebimentos", xp_reward: 200, date: todayStr }
      ];
      await supabase.from('daily_missions').insert(defaultMissions);
      fetchInitialData(user.id);
    }
  };

  const handleUpdateGoal = async () => {
    if (!user || !newGoalValue) return;
    const startOfCurrentMonth = startOfMonth(new Date()).toISOString().split('T')[0];
    const val = parseFloat(newGoalValue);

    try {
      // Buscar se já existe uma meta para este usuário neste mês
      const { data: existingGoal } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', user.id)
        .eq('month_year', startOfCurrentMonth)
        .maybeSingle();

      const goalData = {
        user_id: user.id,
        month_year: startOfCurrentMonth,
        target_amount: val,
        updated_at: new Date().toISOString()
      };

      const { error } = existingGoal 
        ? await supabase.from('goals').update(goalData).eq('id', existingGoal.id)
        : await supabase.from('goals').insert([goalData]);

      if (error) throw error;

      setGoal(val);
      setIsGoalModalOpen(false);
      setNewGoalValue("");
      toast.success("Meta Elite atualizada! 🎯");
    } catch (e: any) {
      console.error("Erro ao atualizar meta:", e);
      toast.error("Erro ao salvar meta: " + (e.message || "Tente novamente."));
    }
  };

  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (activeRange === "Hoje") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (activeRange === "Semana") {
      setStartDate(subDays(today, 7).toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (activeRange === "Mês") {
      setStartDate(startOfMonth(today).toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  }, [activeRange]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = order.created_at.split('T')[0];
      return orderDate >= startDate && orderDate <= endDate;
    });
  }, [orders, startDate, endDate]);

  const totalRevenue = useMemo(() => filteredOrders.reduce((acc, curr) => acc + curr.total_amount, 0), [filteredOrders]);
  
  const filteredTransactions = useMemo(() => {
    return (useAppStore.getState().transactions || []).filter(t => {
      const tDate = t.date.split('T')[0];
      return tDate >= startDate && tDate <= endDate;
    });
  }, [useAppStore.getState().transactions, startDate, endDate]);

  const totalReceived = useMemo(() => {
    return filteredOrders.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
  }, [filteredOrders]);

  const totalExpenses = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'saida')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [filteredTransactions]);

  const currentBalance = totalReceived - totalExpenses;
  
  const totalUnits = filteredOrders.length; 
  const goalProgress = goal > 0 ? (totalRevenue / goal) * 100 : 0;

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

  const handleCreateSale = async () => {
    if (!user || !saleData.clientId || !saleData.productId) {
      toast.warning("Selecione o cliente e o produto.");
      return;
    }
    setIsProcessing(true);
    try {
      const product = products.find(p => p.id === saleData.productId);
      const totalAmount = Number(product?.price || 0) * saleData.quantity;
      const isProgramada = saleData.paymentMethod === 'pendente';
      const paid = isProgramada ? 0 : Number(saleData.amountPaid || 0);
      
      const { data: order, error: orderError } = await supabase.from('orders').insert([{
        user_id: user.id,
        client_id: saleData.clientId,
        total_amount: totalAmount,
        amount_paid: paid,
        status: paid >= totalAmount ? 'paid' : 'pending',
        payment_method: saleData.paymentMethod,
        quantity: saleData.quantity
      }]).select().single();
      
      if (orderError) throw orderError;

      // Gerar parcelas se for venda programada
      if (isProgramada && saleData.installmentsCount > 0) {
         const perInst = totalAmount / saleData.installmentsCount;
         const installments = Array.from({ length: saleData.installmentsCount }).map((_, i) => ({
            order_id: order.id,
            user_id: user.id,
            amount: perInst,
            due_date: new Date(saleData.dueDates[i]).toISOString(),
            status: 'pending'
         }));
         await supabase.from('installments').insert(installments);
      }

      if (paid > 0) {
        await supabase.from('transactions').insert([{
          user_id: user.id,
          amount: paid,
          type: 'entrada',
          category: 'venda',
          description: `Venda: ${product?.name} (${saleData.quantity}x)`,
          order_id: order.id
        }]);
      }

      await supabase.from('notifications').insert([{
        user_id: user.id,
        type: 'sale',
        title: 'Venda de Elite!',
        content: `Confirmado: ${product?.name} (${saleData.quantity}x) para ${clients.find(c => c.id === saleData.clientId)?.name}.`,
        link: '/financeiro'
      }]);

      const todayStr = new Date().toISOString().split('T')[0];
      const { data: mission } = await supabase.from('daily_missions').select('*').eq('user_id', user.id).eq('date', todayStr).eq('type', 'vendas').maybeSingle();
      if (mission && !mission.is_completed) {
        const newValue = (mission.current_value || 0) + 1;
        const completed = newValue >= mission.target_value;
        await supabase.from('daily_missions').update({ current_value: newValue, is_completed: completed }).eq('id', mission.id);
        if (completed) {
          const { data: lb } = await supabase.from('leaderboard').select('total_points').eq('user_id', user.id).maybeSingle();
          await supabase.from('leaderboard').update({ total_points: (lb?.total_points || 0) + mission.xp_reward }).eq('user_id', user.id);
        }
      }

      // Atualização de estoque segura
      if (product) {
        const currentStock = Number(product.stock_quantity || 0);
        await supabase.from('products').update({ 
          stock_quantity: Math.max(0, currentStock - saleData.quantity) 
        }).eq('id', product.id);
      }

      setIsSaleModalOpen(false);
      setSaleStep(1);
      setSaleData({ 
        clientId: "", 
        productId: "", 
        quantity: 1, 
        amountPaid: 0, 
        paymentMethod: "pix",
        installmentsCount: 1,
        dueDates: [
          new Date().toISOString().split('T')[0],
          new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
          new Date(new Date().setMonth(new Date().getMonth() + 2)).toISOString().split('T')[0]
        ]
      });
      await fetchInitialData(user.id);
      toast.success("Venda registrada com sucesso! 🚀");
      
    } catch (e: any) { 
      console.error("Erro completo ao salvar:", e); 
      toast.error("Erro ao salvar: " + (e.message || "Verifique sua conexão"));
    } finally { 
      setIsProcessing(false); 
    }
  };

  const selectedProduct = useMemo(() => products.find(p => p.id === saleData.productId), [products, saleData.productId]);
  const selectedClient = useMemo(() => clients.find(c => c.id === saleData.clientId), [clients, saleData.clientId]);

  if (authLoading || isLoading) return <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center"><Zap className="text-primary animate-pulse w-10 h-10" /></div>;

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-[#F8F8F8] overflow-x-hidden">
      <Header title="Relatórios de Performance" />
      
      <motion.div 
        variants={container} 
        initial="hidden" 
        animate="show" 
        className="flex-1 px-4 sm:px-6 md:px-8 pt-24 md:pt-32 pb-32 space-y-8 max-w-2xl lg:max-w-7xl mx-auto w-full relative"
      >
        
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div className="space-y-1">
              <div className="flex items-center gap-3 text-primary">
                 <BarChart2 size={24} />
                 <h2 className="text-3xl font-black uppercase tracking-tighter italic">Relatórios</h2>
              </div>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest ml-1 italic">Análise de Performance Elite</p>
           </div>
           
           <Button 
              onClick={() => setIsExpenseModalOpen(true)}
              className="h-12 px-6 bg-secondary text-background font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-secondary/20 hover:scale-[1.05] active:scale-95 transition-all gap-2"
           >
              <ArrowDownRight size={16} /> LANÇAR GASTO
           </Button>
        </motion.div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-10 lg:items-start">
          {/* COLUNA PRINCIPAL - ESQUERDA */}
          <div className="lg:col-span-8 space-y-8">
            {/* METAS */}
            <motion.section variants={item}>
              <Card className="bg-[#1A1A1A] border border-white/5 p-6 sm:p-8 rounded-[2.5rem] space-y-6 shadow-4xl relative overflow-hidden group">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-background shadow-[0_0_20px_rgba(93,214,44,0.4)]">
                          <Target size={24} strokeWidth={3} />
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Objetivo Financeiro</div>
                          <div className="text-2xl sm:text-3xl font-black text-white tracking-tighter italic">{formatCurrency(goal)}</div>
                        </div>
                    </div>
                    <Button onClick={() => setIsGoalModalOpen(true)} className="w-full sm:w-auto h-12 px-6 bg-white/5 border border-white/10 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary hover:text-background transition-all">
                        <Edit3 size={16} className="mr-2" /> DEFINIR META
                    </Button>
                  </div>

                  <div className="space-y-3 relative z-10">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-primary">{goalProgress.toFixed(1)}% ATINGIDO</span>
                        <span className="text-slate-600 italic">Faltam {formatCurrency(Math.max(0, goal - totalRevenue))}</span>
                    </div>
                    <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-0.5">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${Math.min(100, goalProgress)}%` }} 
                          className="h-full bg-primary rounded-full shadow-[0_0_20px_#5DD62C]" 
                        />
                    </div>
                  </div>
                  <div className="absolute -right-20 -bottom-20 w-60 h-60 bg-primary/5 blur-[100px] rounded-full" />
              </Card>
            </motion.section>

            {/* FILTROS */}
            <div className="space-y-4">
              <motion.section variants={item} className="grid grid-cols-4 h-14 bg-[#1A1A1A] rounded-2xl p-1 gap-1 border border-white/5">
                  {['Hoje', 'Semana', 'Mês', 'Custom'].map((tab) => (
                    <button 
                      key={tab} 
                      onClick={() => setActiveTab(tab)} 
                      className={`rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeRange === tab ? 'bg-primary text-background shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                      {tab}
                    </button>
                  ))}
              </motion.section>

              <motion.section variants={item} className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black text-slate-600 uppercase ml-3 italic">Data Inicial</Label>
                    <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setActiveTab("Custom"); }} className="h-14 bg-[#1A1A1A] border-white/5 rounded-2xl text-xs font-black text-white uppercase px-6" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black text-slate-600 uppercase ml-3 italic">Data Final</Label>
                    <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setActiveTab("Custom"); }} className="h-14 bg-[#1A1A1A] border-white/5 rounded-2xl text-xs font-black text-white uppercase px-6" />
                  </div>
              </motion.section>
            </div>

            {/* KPIs */}
            <motion.section variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <Card className="bg-[#1A1A1A] border border-white/5 p-6 rounded-[2rem] space-y-4 hover:border-primary/20 transition-all">
                  <Banknote className="text-primary" size={20} />
                  <div>
                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Faturamento</div>
                    <div className="text-xl font-black text-white tracking-tighter">{formatCurrency(totalRevenue)}</div>
                  </div>
              </Card>
              <Card className="bg-[#1A1A1A] border border-white/5 p-6 rounded-[2rem] space-y-4 hover:border-primary/20 transition-all">
                  <TrendingUp className="text-primary" size={20} />
                  <div>
                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Recebido</div>
                    <div className="text-xl font-black text-white tracking-tighter">{formatCurrency(totalReceived)}</div>
                  </div>
              </Card>
              <Card className="bg-[#1A1A1A] border border-secondary/20 p-6 rounded-[2rem] space-y-4 hover:border-secondary/40 transition-all">
                  <ArrowDownRight className="text-secondary" size={20} />
                  <div>
                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Gastos/Despesas</div>
                    <div className="text-xl font-black text-secondary tracking-tighter">{formatCurrency(totalExpenses)}</div>
                  </div>
              </Card>
              <Card className="bg-primary/5 border border-primary/20 p-6 rounded-[2rem] space-y-4 hover:border-primary/40 transition-all">
                  <Wallet className="text-primary" size={20} />
                  <div>
                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Saldo em Caixa</div>
                    <div className="text-xl font-black text-primary tracking-tighter">{formatCurrency(currentBalance)}</div>
                  </div>
              </Card>
            </motion.section>

            {/* Gráfico */}
            <motion.section variants={item}>
              <Card className="bg-[#1A1A1A] border border-white/5 p-6 rounded-[3rem] overflow-hidden shadow-3xl">
                  <div className="flex justify-between items-center mb-6 px-4">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={12} className="text-primary" /> Tendência de Vendas
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Receita</span>
                        </div>
                    </div>
                  </div>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#5DD62C" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#5DD62C" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#475569', fontSize: 10, fontWeight: '900'}} 
                            dy={15} 
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#475569', fontSize: 9, fontWeight: 'bold'}}
                            tickFormatter={(val) => `R$ ${val}`}
                            dx={-5}
                          />
                          <Tooltip 
                            contentStyle={{backgroundColor: '#0F0F0F', border: '1px solid #333', borderRadius: '1.5rem', padding: '12px'}} 
                            itemStyle={{color: '#5DD62C', fontWeight: '900', fontSize: '14px'}}
                            labelStyle={{color: '#64748b', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 'black'}}
                            formatter={(value: any) => [formatCurrency(value), 'Receita']}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#5DD62C" 
                            strokeWidth={4} 
                            fill="url(#colorRev)" 
                            animationDuration={2000}
                            dot={{ r: 4, fill: '#5DD62C', strokeWidth: 2, stroke: '#1A1A1A' }}
                            activeDot={{ r: 8, fill: '#5DD62C' }}
                          />
                        </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 px-4 flex justify-between border-t border-white/5 pt-4">
                    <div className="text-center">
                        <p className="text-[8px] font-black text-slate-600 uppercase">Média Diária</p>
                        <p className="text-xs font-black text-white">{formatCurrency(totalRevenue / 7)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[8px] font-black text-slate-600 uppercase">Maior Pico</p>
                        <p className="text-xs font-black text-primary">{formatCurrency(Math.max(...chartData.map(d => d.revenue)))}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[8px] font-black text-slate-600 uppercase">Status</p>
                        <p className="text-xs font-black text-blue-400">ATIVO</p>
                    </div>
                  </div>
              </Card>
            </motion.section>
          </div>

          {/* COLUNA LATERAL - DIREITA (PC) / ABAIXO (MOBILE) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Missões */}
            <motion.section variants={item} className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic flex items-center gap-2 ml-2"><Zap size={12} className="text-primary" /> Missões Diárias</h3>
              <div className="space-y-2">
                  {missions.map((m) => (
                    <Card 
                      key={m.id} 
                      onClick={() => handleOpenMission(m)}
                      className={`bg-[#161616] border ${m.is_completed ? 'border-primary/30' : 'border-white/[0.03]'} p-4 rounded-xl flex items-center justify-between group transition-all cursor-pointer hover:bg-[#1A1A1A] active:scale-95`}
                    >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${m.is_completed ? 'bg-primary text-background' : 'bg-white/5 text-slate-600'}`}>
                              {m.is_completed ? <CheckCircle2 size={16} /> : <Zap size={16} />}
                          </div>
                          <div>
                              <div className={`text-[11px] font-black uppercase tracking-tight ${m.is_completed ? 'text-primary' : 'text-white'}`}>{m.title}</div>
                              <div className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">+{m.xp_reward} XP</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-[10px] font-black text-slate-400">{m.current_value}/{m.target_value}</div>
                          <ChevronRight size={12} className="text-slate-700 group-hover:text-primary transition-colors" />
                        </div>
                    </Card>
                  ))}
              </div>
            </motion.section>
          </div>
        </div>

      </motion.div>

      {/* MODAL DETALHES DA MISSÃO */}
      <Dialog open={isMissionModalOpen} onOpenChange={setIsMissionModalOpen}>
        <DialogContent className="bg-[#0F0F0F] border-white/10 rounded-[3rem] p-0 max-w-xl text-white overflow-hidden">
           <div className="p-8 space-y-6">
              <DialogHeader>
                 <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-3">
                    <Sparkles className="text-primary w-8 h-8" /> {selectedMission?.title}
                 </DialogTitle>
                 <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Itens relacionados a esta missão</p>
              </DialogHeader>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                 {selectedMission?.type === 'vendas' ? (
                    orders.length > 0 ? (
                       orders.slice(0, 5).map((order: any) => (
                          <div key={order.id} className="p-5 bg-[#1A1A1A] border border-white/5 rounded-2xl flex items-center justify-between group">
                             <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                   <Package size={20} />
                                </div>
                                <div>
                                   <p className="text-sm font-black text-white">{formatCurrency(order.total_amount)}</p>
                                   <p className="text-[9px] font-bold text-slate-500 uppercase">{format(new Date(order.created_at), "dd MMM 'às' HH:mm", { locale: ptBR })}</p>
                                </div>
                             </div>
                             <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  onClick={() => handleGenerateOrderPDF(order)}
                                  className="h-9 w-9 p-0 rounded-lg text-primary hover:bg-primary/10"
                                >
                                   <FileText size={16} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  onClick={() => { setSelectedOrderForEdit(order); setIsEditModalOpen(true); }}
                                  className="h-9 w-9 p-0 rounded-lg text-slate-500 hover:text-white"
                                >
                                   <Edit3 size={16} />
                                </Button>
                                {order.status !== 'paid' && (
                                   <Button 
                                     onClick={() => { setSelectedOrderForInstallments(order); setIsInstallmentModalOpen(true); }}
                                     className="h-9 px-3 bg-white/5 text-[9px] font-black uppercase tracking-widest rounded-lg border border-white/10 hover:bg-primary hover:text-background transition-all"
                                   >
                                      PARCELAR
                                   </Button>
                                )}
                             </div>
                          </div>
                       ))
                    ) : <p className="text-center py-10 text-slate-600 font-bold uppercase text-[10px]">Nenhuma venda hoje</p>
                 ) : (
                    <div className="text-center py-10">
                       <p className="text-slate-600 font-bold uppercase text-[10px]">Detalhes em breve para este tipo de missão</p>
                    </div>
                 )}
              </div>

              <Button onClick={() => setIsMissionModalOpen(false)} className="w-full h-14 bg-white/5 border border-white/10 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-white">FECHAR</Button>
           </div>
        </DialogContent>
      </Dialog>

      {/* MODAL EDIÇÃO DE VENDA */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 rounded-[2.5rem] p-0 max-w-sm text-white overflow-hidden z-[200]">
           <div className="p-6 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
             <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-center">Editar <span className="text-primary not-italic">Venda</span></DialogTitle>
                <p className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">Valor Total: {selectedOrderForEdit && formatCurrency(selectedOrderForEdit.total_amount)}</p>
             </DialogHeader>

             <div className="space-y-6 py-2">
                <div className="space-y-3">
                   <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Pago</Label>
                   <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-primary text-xl italic">R$</span>
                      <Input 
                          type="number" 
                          value={selectedOrderForEdit?.amount_paid || 0} 
                          onChange={(e) => setSelectedOrderForEdit({...selectedOrderForEdit, amount_paid: parseFloat(e.target.value) || 0})}
                          className="h-16 bg-[#0F0F0F] border-none rounded-2xl text-2xl font-black text-white pl-16 focus-visible:ring-primary shadow-inner" 
                      />
                   </div>
                </div>

                <div className="space-y-3">
                   <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Forma de Pagamento</Label>
                   <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'pix', icon: Zap, label: 'PIX' },
                        { id: 'dinheiro', icon: CircleDollarSign, label: 'Dinheiro' },
                        { id: 'cartao', icon: CreditCard, label: 'Cartão' },
                        { id: 'pendente', icon: AlertTriangle, label: 'Pendente' },
                      ].map((m) => (
                         <button 
                            key={m.id}
                            onClick={() => setSelectedOrderForEdit({...selectedOrderForEdit, payment_method: m.id})}
                            className={cn(
                              "h-14 rounded-xl border flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest",
                              selectedOrderForEdit?.payment_method === m.id 
                                ? "bg-primary border-primary text-background shadow-[0_0_20px_rgba(93,214,44,0.3)]" 
                                : "bg-[#0F0F0F] border-white/5 text-slate-600 hover:border-primary/30"
                            )}
                         >
                            <m.icon size={16} /> {m.label}
                         </button>
                      ))}
                   </div>
                </div>

                <div className="flex gap-4 pt-4">
                   <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} className="h-14 flex-1 rounded-xl text-slate-500 hover:bg-white/5">CANCELAR</Button>
                   <Button 
                     onClick={handleUpdateOrder} 
                     disabled={isProcessing}
                     className="h-14 flex-1 bg-primary text-background font-black uppercase text-xs tracking-widest rounded-xl shadow-xl shadow-primary/20"
                   >
                      {isProcessing ? <Loader2 className="animate-spin" /> : "SALVAR"}
                   </Button>
                </div>
             </div>
           </div>
        </DialogContent>
      </Dialog>

      {/* MODAL PARCELAMENTO (FIADO) */}
      <Dialog open={isInstallmentModalOpen} onOpenChange={setIsInstallmentModalOpen}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 rounded-[2.5rem] p-10 max-w-sm text-white">
           <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-center">Programar <span className="text-primary not-italic">Fiado</span></DialogTitle>
              <p className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">Valor pendente: {selectedOrderForInstallments && formatCurrency(selectedOrderForInstallments.total_amount - (selectedOrderForInstallments.amount_paid || 0))}</p>
           </DialogHeader>

           <div className="space-y-8 py-6">
              <div className="space-y-4 text-center">
                 <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Número de Parcelas</Label>
                 <div className="flex items-center justify-center gap-6">
                    <button onClick={() => setInstallmentCount(Math.max(1, installmentCount - 1))} className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-white border border-white/10">-</button>
                    <span className="text-4xl font-black text-primary italic">{installmentCount}x</span>
                    <button onClick={() => setInstallmentCount(installmentCount + 1)} className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-white border border-white/10">+</button>
                 </div>
                 <p className="text-[10px] font-bold text-slate-600 italic">Cada parcela de {selectedOrderForInstallments && formatCurrency((selectedOrderForInstallments.total_amount - (selectedOrderForInstallments.amount_paid || 0)) / installmentCount)}</p>
              </div>

              <Button 
                onClick={handleCreateInstallments} 
                disabled={isProcessing}
                className="w-full h-16 bg-primary text-background font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-primary/20"
              >
                 {isProcessing ? <Loader2 className="animate-spin" /> : "CONFIRMAR PROGRAMAÇÃO"}
              </Button>
           </div>
        </DialogContent>
      </Dialog>

      {/* Floating Venda - REDUZIDO E DISCRETO */}
      <button 
        onClick={() => {setIsSaleModalOpen(true); setSaleStep(1);}} 
        className="fixed bottom-28 right-6 w-11 h-11 md:w-12 md:h-12 bg-primary text-background rounded-xl shadow-[0_10px_20px_rgba(93,214,44,0.3)] flex items-center justify-center z-[110] hover:scale-110 active:scale-90 transition-all"
      >
        <Plus size={24} strokeWidth={4} />
      </button>

      {/* MODAL VENDA - UX REFORMULADA (Estilo Stepper) */}
      <Dialog open={isSaleModalOpen} onOpenChange={setIsSaleModalOpen}>
        <DialogContent className="bg-[#0F0F0F] border-white/10 rounded-[2.5rem] p-0 max-w-md text-white overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.9)] z-[200]">
          <div className="p-6 pb-12 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <DialogHeader>
              <div className="flex items-center justify-between mb-4">
                 <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1">Passo {saleStep} de 2</Badge>
                 <div className="flex gap-1.5">
                    <div className={cn("h-1.5 w-8 rounded-full transition-all", saleStep >= 1 ? "bg-primary" : "bg-white/10")} />
                    <div className={cn("h-1.5 w-8 rounded-full transition-all", saleStep >= 2 ? "bg-primary" : "bg-white/10")} />
                 </div>
              </div>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-3">
                 {saleStep === 1 ? <Package className="text-primary w-7 h-7" /> : <Wallet className="text-primary w-7 h-7" />}
                 {saleStep === 1 ? "O QUE FOI VENDIDO?" : "PAGAMENTO"}
              </DialogTitle>
            </DialogHeader>

            <AnimatePresence mode="wait">
              {saleStep === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-3">
                     <Label className="text-[9px] font-black text-slate-500 uppercase ml-1 tracking-[0.2em] flex items-center gap-2">
                        <User size={12} className="text-primary" /> SELECIONE O CLIENTE
                     </Label>
                     <div className="space-y-2">
                        <div className="relative">
                           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                           <Input 
                              placeholder="Pesquisar cliente..." 
                              value={clientSearch}
                              onChange={(e) => setClientSearch(e.target.value)}
                              className="h-12 bg-white/[0.03] border-white/5 rounded-xl pl-12 text-sm font-bold text-white placeholder:text-slate-600 focus-visible:ring-primary/50"
                           />
                        </div>
                        <Select value={saleData.clientId} onValueChange={(val) => setSaleData({...saleData, clientId: val})}>
                           <SelectTrigger className="h-14 bg-white/[0.03] border border-white/5 rounded-2xl text-base font-bold px-6 focus:ring-primary/50 w-full overflow-hidden">
                              <SelectValue>
                                 {clients.find(c => c.id === saleData.clientId)?.name || "Selecione o resultado..."}
                              </SelectValue>
                           </SelectTrigger>
                           <SelectContent className="bg-[#1A1A1A] border-white/10 text-white max-h-60">
                              {clients
                                 .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                                 .map(c => (
                                 <SelectItem key={c.id} value={c.id} className="h-12 font-bold focus:bg-primary focus:text-background text-white uppercase italic">{c.name}</SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                     </div>
                  </div>

                  <div className="space-y-3">
                     <Label className="text-[9px] font-black text-slate-500 uppercase ml-1 tracking-[0.2em] flex items-center gap-2">
                        <Package size={12} className="text-primary" /> ESCOLHA O ATIVO
                     </Label>
                     <div className="space-y-2">
                        <div className="relative">
                           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                           <Input 
                              placeholder="Pesquisar produto..." 
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                              className="h-12 bg-white/[0.03] border-white/5 rounded-xl pl-12 text-sm font-bold text-white placeholder:text-slate-600 focus-visible:ring-primary/50"
                           />
                        </div>
                        <div className="flex gap-3">
                           <Select value={saleData.productId} onValueChange={(val) => setSaleData({...saleData, productId: val})}>
                              <SelectTrigger className="h-14 bg-white/[0.03] border border-white/5 rounded-2xl text-base font-bold px-6 focus:ring-primary/50 flex-1 overflow-hidden">
                                 <SelectValue>
                                    {products.find(p => p.id === saleData.productId)?.name || "Selecione o ativo..."}
                                 </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="bg-[#1A1A1A] border-white/10 text-white max-h-60">
                                 {products
                                    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                                    .map(p => (
                                    <SelectItem key={p.id} value={p.id} className="h-12 font-bold focus:bg-primary focus:text-background text-white uppercase italic">{p.name}</SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                           <div className="w-24">
                              <Input 
                                 type="number" 
                                 min="1" 
                                 value={saleData.quantity} 
                                 onChange={(e) => setSaleData({...saleData, quantity: parseInt(e.target.value) || 1})}
                                 className="h-14 bg-white/[0.03] border-white/5 rounded-2xl text-center font-black text-xl text-primary"
                              />
                           </div>
                        </div>
                     </div>
                  </div>
                  <Button
                    disabled={!saleData.clientId || !saleData.productId}
                    onClick={() => setSaleStep(2)}
                    className="w-full h-16 bg-primary text-background font-black uppercase text-xs rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all gap-3 mt-4"
                  >
                     PRÓXIMA ETAPA <ArrowRight size={18} />
                  </Button>
                </motion.div>              ) : (
                <motion.div 
                  key="step2" 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 py-2"
                >
                  <div className="p-6 bg-white/[0.03] border border-white/10 rounded-[2rem] flex items-center justify-between">
                     <div className="space-y-1">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Resumo da Venda ({saleData.quantity}x)</p>
                        <p className="text-lg font-black text-white italic uppercase tracking-tighter">{selectedProduct?.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{selectedClient?.name}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-xl font-black text-primary tracking-tighter">{formatCurrency((selectedProduct?.price || 0) * saleData.quantity)}</p>
                        <p className="text-[8px] text-slate-600 font-black uppercase">{formatCurrency(selectedProduct?.price || 0)} /un</p>
                     </div>
                  </div>

                  <div className="space-y-3">
                     <Label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-[0.3em]">Forma de Pagamento</Label>
                     <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'pix', icon: Zap, label: 'PIX' },
                          { id: 'dinheiro', icon: CircleDollarSign, label: 'Dinheiro' },
                          { id: 'cartao', icon: CreditCard, label: 'Cartão' },
                          { id: 'pendente', icon: AlertTriangle, label: 'Venda Programada' },
                        ].map((m) => (
                           <button 
                              key={m.id}
                              onClick={() => setSaleData({...saleData, paymentMethod: m.id})}
                              className={cn(
                                "h-14 rounded-xl border flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest",
                                saleData.paymentMethod === m.id 
                                  ? "bg-primary border-primary text-background shadow-[0_0_20px_rgba(93,214,44,0.3)]" 
                                  : "bg-[#1A1A1A] border-white/5 text-slate-600 hover:border-primary/30"
                              )}
                           >
                              <m.icon size={16} /> {m.label}
                           </button>
                        ))}
                     </div>
                  </div>

                  {saleData.paymentMethod === 'pendente' ? (
                     <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-6 pt-2 border-t border-white/5 mt-4">
                        <div className="space-y-3">
                           <Label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-[0.2em]">Parcelar em quantas vezes?</Label>
                           <div className="grid grid-cols-3 gap-2">
                              {[1, 2, 3].map((num) => {
                                 const total = (selectedProduct?.price || 0) * saleData.quantity;
                                 const perInst = total / num;
                                 return (
                                    <button 
                                       key={num}
                                       onClick={() => setSaleData({...saleData, installmentsCount: num})}
                                       className={cn(
                                          "h-14 rounded-xl border flex flex-col items-center justify-center transition-all",
                                          saleData.installmentsCount === num 
                                             ? "bg-primary/20 border-primary text-primary" 
                                             : "bg-white/5 border-white/5 text-slate-500"
                                       )}
                                    >
                                       <span className="font-black text-sm">{num}x</span>
                                       <span className="text-[7px] font-bold opacity-60">(R$ {perInst.toFixed(2)})</span>
                                    </button>
                                 );
                              })}
                           </div>
                        </div>

                        <div className="space-y-3">
                           <Label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-[0.2em]">Datas de Vencimento</Label>
                           <div className="space-y-2">
                              {Array.from({ length: saleData.installmentsCount }).map((_, i) => (
                                 <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                                    <div className="w-16 text-[9px] font-black text-primary uppercase">{i + 1}ª Parcela</div>
                                    <Input 
                                       type="date" 
                                       value={saleData.dueDates[i]} 
                                       onChange={(e) => {
                                          const newDates = [...saleData.dueDates];
                                          newDates[i] = e.target.value;
                                          setSaleData({...saleData, dueDates: newDates});
                                       }}
                                       className="h-10 bg-transparent border-none text-xs font-bold text-white focus-visible:ring-0 p-0"
                                    />
                                 </div>
                              ))}
                           </div>
                        </div>
                     </motion.div>
                  ) : (
                     <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-[0.3em]">Quanto foi recebido agora?</Label>
                        <div className="relative">
                           <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-primary text-xl italic">R$</span>
                           <Input 
                              type="number" 
                              placeholder="0.00" 
                              className="h-16 bg-[#1A1A1A] border-white/5 rounded-2xl text-2xl font-black text-white pl-16 focus-visible:ring-primary shadow-inner"
                              onChange={(e) => setSaleData({...saleData, amountPaid: parseFloat(e.target.value) || 0})}
                           />
                        </div>
                     </div>
                  )}

                  <div className="flex gap-4 pt-2">
                     <Button variant="ghost" onClick={() => setSaleStep(1)} className="h-14 w-14 rounded-xl text-slate-500 hover:bg-white/5 border border-white/5"><X size={20} /></Button>
                     <Button 
                        onClick={handleCreateSale} 
                        disabled={isProcessing}
                        className="flex-1 h-14 bg-primary text-background font-black uppercase text-xs tracking-widest rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all gap-3"
                     >
                        {isProcessing ? <Loader2 className="animate-spin" /> : <><Sparkles size={18} /> FINALIZAR VENDA</>}
                     </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL META */}
      <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 rounded-[3rem] p-10 max-w-sm">
           <DialogHeader><DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-white text-center">Definir <span className="text-primary not-italic">Meta do Mês</span></DialogTitle></DialogHeader>
           <div className="space-y-8 py-6">
              <div className="space-y-4">
                 <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-primary text-xl">R$</span>
                    <Input 
                        type="number" 
                        value={newGoalValue} 
                        onChange={(e) => setNewGoalValue(e.target.value)} 
                        placeholder="0.00" 
                        className="h-20 bg-[#0F0F0F] border-none rounded-[1.5rem] text-3xl font-black text-white pl-16 pr-6 focus-visible:ring-primary shadow-inner" 
                    />
                 </div>
              </div>
              <Button onClick={handleUpdateGoal} className="w-full h-16 bg-primary text-background font-black uppercase text-xs tracking-widest rounded-2xl">Ativar Meta</Button>
           </div>
        </DialogContent>
      </Dialog>

      {/* MODAL GASTO RÁPIDO */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 rounded-[2.5rem] p-10 max-w-md">
           <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Lançar <span className="text-secondary">Despesa Pessoal</span></DialogTitle>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sem necessidade de recibo • Abate do saldo</p>
           </DialogHeader>
           <form onSubmit={handleAddExpense} className="space-y-6 py-6">
              <div className="space-y-2">
                 <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Valor do Gasto (R$)</Label>
                 <Input 
                    type="number" 
                    required 
                    autoFocus
                    placeholder="0.00" 
                    value={expenseData.amount}
                    onChange={e => setExpenseData({...expenseData, amount: e.target.value})}
                    className="h-16 bg-[#0F0F0F] border-none rounded-2xl text-xl font-black text-secondary px-6 focus-visible:ring-secondary" 
                 />
              </div>
              <div className="space-y-2">
                 <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Descrição (Opcional)</Label>
                 <Input 
                    placeholder="Ex: Almoço, Gasolina..." 
                    value={expenseData.description}
                    onChange={e => setExpenseData({...expenseData, description: e.target.value})}
                    className="h-14 bg-[#0F0F0F] border-none rounded-xl text-white px-6 focus-visible:ring-secondary" 
                 />
              </div>
              <Button type="submit" disabled={isProcessing} className="w-full h-16 bg-secondary text-background font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-secondary/20">
                 {isProcessing ? <Loader2 className="animate-spin" /> : "Confirmar Gasto"}
              </Button>
           </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
