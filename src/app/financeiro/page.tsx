"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { 
  TrendingUp, 
  DollarSign, 
  AlertCircle, 
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Calendar,
  Plus,
  Loader2,
  Filter,
  BarChart3,
  Download,
  Receipt,
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  User,
  History,
  Ban
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { generateReceipt } from "@/lib/pdfGenerator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function FinancePage() {
  const { user } = useAuth();
  const { orders, transactions, fetchInitialData } = useAppStore();
  
  const [activeTab, setActiveTab] = useState("fluxo");
  const [billingDate, setBillingDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [expenseData, setExpenseData] = useState({ amount: "", description: "", category: "operacional" });

  // --- ESTADO DE COBRANÇA ---
  const [isConfirmingBilling, setIsConfirmingBilling] = useState(false);
  const [billingPreview, setBillingPreview] = useState({ message: "", phone: "", sale: null as any });

  useEffect(() => {
    if (user) fetchInitialData(user.id);
  }, [user]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Cálculo de Métricas
  const cashInHand = useMemo(() => {
    const revenue = orders.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
    const expenses = transactions
      .filter(t => t.type === 'saida')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
    return revenue - expenses;
  }, [orders, transactions]);

  const totalDebts = useMemo(() => orders.reduce((acc, curr) => acc + (curr.total_amount - (curr.amount_paid || 0)), 0), [orders]);
  
  // Lista de Inadimplentes (Vendas com saldo devedor)
  const overdueSales = useMemo(() => orders.filter(o => (o.amount_paid || 0) < o.total_amount), [orders]);

  // Agrupamento por Cliente para Cobrança
  const groupedOverdue = useMemo(() => {
    const filtered = overdueSales.filter(sale => {
      if (!billingDate) return true;
      return sale.due_date === billingDate;
    });

    const groups: Record<string, { client: any, total_debt: number, orders: any[] }> = {};
    
    filtered.forEach(sale => {
      const clientId = sale.client_id;
      if (!groups[clientId]) {
        groups[clientId] = {
          client: sale.clients,
          total_debt: 0,
          orders: []
        };
      }
      groups[clientId].total_debt += (sale.total_amount - (sale.amount_paid || 0));
      groups[clientId].orders.push(sale);
    });

    return Object.values(groups);
  }, [overdueSales, billingDate]);

  const handleExportReport = () => {
    toast.info(`Relatório financeiro gerado!\nMovimentações: ${transactions.length}\nSaldo em Caixa: ${formatCurrency(cashInHand)}`);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !expenseData.amount) return;
    setLoadingAction('adding_expense');

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
      setIsAddingExpense(false);
      setExpenseData({ amount: "", description: "", category: "operacional" });
      fetchInitialData(user.id);
    } catch (e: any) {
      toast.error("Erro ao registrar gasto: " + e.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleOpenBillingConfirm = (sale: any) => {
    const clientName = sale.clients?.name || 'Cliente';
    const amount = formatCurrency(sale.total_amount - (sale.amount_paid || 0));
    const dueDate = sale.due_date ? format(new Date(sale.due_date), 'dd/MM/yyyy') : '—';
    const product = sale.description || 'Pedido';
    
    let message = `Olá ${clientName}, tudo bem? Estou passando para lembrar da sua pendência no valor de ${amount}. Podemos acertar hoje?`;
    
    if (useAppStore.getState().userProfile?.default_billing_message) {
      message = useAppStore.getState().userProfile.default_billing_message
        .replace(/\{cliente\}/g, clientName)
        .replace(/\{valor\}/g, amount)
        .replace(/\{vencimento\}/g, dueDate)
        .replace(/\{produto\}/g, product);
    }

    setBillingPreview({
      message,
      phone: sale.clients?.phone?.replace(/\D/g, '') || '',
      sale
    });
    setIsConfirmingBilling(true);
  };

  const handleSendToWhatsApp = () => {
    window.open(`https://wa.me/55${billingPreview.phone}?text=${encodeURIComponent(billingPreview.message)}`, '_blank');
    setIsConfirmingBilling(false);
  };

  const handleRegisterPayment = async (orderId: string, currentPaid: number, total: number, amount: number) => {
    if (!user || amount <= 0) return;
    setLoadingAction(orderId);
    
    const newPaid = (currentPaid || 0) + amount;
    const { error } = await supabase
      .from('orders')
      .update({ amount_paid: newPaid, status: newPaid >= total ? 'paid' : 'partial' })
      .eq('id', orderId);

    if (!error) {
      await supabase.from('transactions').insert([{
        user_id: user.id,
        amount: amount,
        type: 'entrada',
        category: 'recebimento_pendente',
        description: `Recebimento parcial - Venda #${orderId.slice(0,4)}`,
        order_id: orderId
      }]);
      
      await fetchInitialData(user.id);
    }
    setLoadingAction(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-[#F8F8F8]">
      <Header title="Gestão Financeira" />
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="flex-1 px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 md:pt-10 pb-32 md:pb-40 space-y-8 md:space-y-12 max-w-[1600px] mx-auto w-full"
      >
        
        {/* Top Cards KPIs */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <motion.div variants={item}>
              <Card className="dots-luminous bg-[#202020] border border-white/5 p-6 rounded-[2.5rem] flex flex-col justify-between h-full relative overflow-hidden group">
                 <div className="flex justify-between items-start">
                    <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                       <DollarSign size={24} />
                    </div>
                    <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase">Disponível</Badge>
                 </div>
                 <div className="mt-8">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Saldo em Caixa</div>
                    <div className="text-4xl font-black text-white">{formatCurrency(cashInHand)}</div>
                 </div>
              </Card>
           </motion.div>

           <motion.div variants={item}>
              <Card className="dots-luminous bg-[#202020] border border-white/5 p-6 rounded-[2.5rem] flex flex-col justify-between h-full relative overflow-hidden group">
                 <div className="flex justify-between items-start">
                    <div className="h-12 w-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                       <Ban size={24} />
                    </div>
                    <Badge className="bg-secondary/10 text-secondary border-none font-black text-[10px] uppercase">Risco de Caixa</Badge>
                 </div>
                 <div className="mt-8">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total em Vendas Programadas</div>
                    <div className="text-4xl font-black text-secondary">{formatCurrency(totalDebts)}</div>
                 </div>
              </Card>
           </motion.div>

           <motion.div variants={item}>
              <Card className="dots-luminous bg-primary/5 border border-primary/10 p-6 rounded-[2.5rem] flex flex-col justify-between h-full group">
                 <div className="flex justify-between items-start">
                    <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                       <History size={24} />
                    </div>
                    <button className="text-[10px] font-black text-primary uppercase hover:underline">Ver Histórico</button>
                 </div>
                 <div className="mt-8">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Inadimplentes</div>
                    <div className="text-4xl font-black text-white">{overdueSales.length} <span className="text-sm text-slate-600 font-bold uppercase ml-2">Clientes</span></div>
                 </div>
              </Card>
           </motion.div>
        </section>

        {/* Navegação por Abas */}
        <motion.div variants={item} className="space-y-8">
           <Tabs defaultValue="fluxo" onValueChange={setActiveTab} className="w-full">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                 <TabsList className="bg-[#1A1A1A] p-1.5 rounded-full border border-white/5 h-16 w-full lg:w-[400px] grid grid-cols-2 shadow-2xl">
                    <TabsTrigger 
                       value="fluxo" 
                       className="rounded-full h-full data-[state=active]:bg-[#5DD62C] data-[state=active]:text-[#0E150B] data-[state=active]:shadow-[0_0_25px_rgba(93,214,44,0.3)] font-black uppercase text-[9px] sm:text-[10px] tracking-[0.15em] px-4 transition-all duration-500 gap-2 border border-transparent data-[state=active]:border-white/10"
                    >
                       <History size={16} className="data-[state=active]:scale-110 transition-transform" /> FLUXO
                    </TabsTrigger>
                    <TabsTrigger 
                       value="cobrancas" 
                       className="rounded-full h-full data-[state=active]:bg-[#5DD62C] data-[state=active]:text-[#0E150B] data-[state=active]:shadow-[0_0_25px_rgba(93,214,44,0.3)] font-black uppercase text-[9px] sm:text-[10px] tracking-[0.15em] px-4 transition-all duration-500 gap-2 border border-transparent data-[state=active]:border-white/10"
                    >
                       <Zap size={16} className="data-[state=active]:scale-110 transition-transform" /> COBRANÇAS
                    </TabsTrigger>
                 </TabsList>

                 <div className="grid grid-cols-2 lg:flex items-center gap-3">
                    <Button onClick={handleExportReport} variant="outline" className="h-[70px]! px-4 sm:px-6 border-white/10 bg-[#202020] rounded-full font-black uppercase text-[10px] sm:text-xs tracking-widest gap-2">
                       <Download size={18} /> <span className="hidden sm:inline">Exportar</span><span className="sm:hidden">PDF</span>
                    </Button>
                    
                    <Dialog open={isAddingExpense} onOpenChange={setIsAddingExpense}>
                       <DialogTrigger render={
                          <button className="shiny-cta h-[70px]! min-h-[70px]! px-4 sm:px-8 rounded-full flex items-center justify-center relative overflow-hidden flex-shrink-0">
                             <span className="relative z-[100] text-white text-[10px] sm:text-xs font-black uppercase tracking-widest drop-shadow-md">
                                Lançar Gasto
                             </span>
                          </button>
                       } />
                       <DialogContent className="bg-[#1A1A1A] border-white/10 rounded-[2.5rem] p-10 max-w-md">
                          <DialogHeader>
                             <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Registrar <span className="text-secondary">Saída</span></DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleAddExpense} className="space-y-6 py-6">
                             <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Valor do Gasto (R$)</Label>
                                <Input 
                                   type="number" 
                                   required 
                                   placeholder="0.00" 
                                   value={expenseData.amount}
                                   onChange={e => setExpenseData({...expenseData, amount: e.target.value})}
                                   className="h-16 bg-[#0F0F0F] border-none rounded-2xl text-xl font-black text-secondary px-6" 
                                />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Descrição/Motivo</Label>
                                <Input 
                                   placeholder="Ex: Reposição de Embalagens" 
                                   value={expenseData.description}
                                   onChange={e => setExpenseData({...expenseData, description: e.target.value})}
                                   className="h-14 bg-[#0F0F0F] border-none rounded-xl text-white px-6" 
                                />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Categoria</Label>
                                <select 
                                   value={expenseData.category}
                                   onChange={e => setExpenseData({...expenseData, category: e.target.value})}
                                   className="w-full h-14 bg-[#0F0F0F] border-none rounded-xl text-white px-4 font-bold text-sm outline-none"
                                >
                                   <option value="operacional">Operacional</option>
                                   <option value="estoque">Estoque</option>
                                   <option value="marketing">Marketing</option>
                                   <option value="pessoal">Pessoal / Retirada</option>
                                   <option value="outros">Outros</option>
                                </select>
                             </div>
                             <Button type="submit" disabled={loadingAction === 'adding_expense'} className="w-full h-16 bg-secondary text-background font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-secondary/20">
                                {loadingAction === 'adding_expense' ? <Loader2 className="animate-spin" /> : "Confirmar Saída"}
                             </Button>
                          </form>
                       </DialogContent>
                    </Dialog>
                 </div>
              </div>

              <AnimatePresence mode="wait">
                {activeTab === "fluxo" && (
                  <TabsContent value="fluxo" className="mt-10 space-y-6 focus-visible:outline-none">
                    <motion.div
                      key="fluxo-content"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="grid grid-cols-1 gap-4"
                    >
                        {transactions.length === 0 ? (
                          <div className="py-20 text-center opacity-20 bg-[#202020] rounded-[2.5rem] border border-dashed border-white/10">
                              <BarChart3 size={48} className="mx-auto mb-4" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma movimentação registrada</p>
                          </div>
                        ) : transactions.map((t) => (
                          <Card key={t.id} className="bg-[#202020] border border-white/5 p-6 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all">
                              <div className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${t.type === 'entrada' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                                    {t.type === 'entrada' ? <ArrowUpRight /> : <ArrowDownRight />}
                                </div>
                                <div>
                                    <div className="text-sm font-black text-white uppercase tracking-tight">{t.description}</div>
                                    <div className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">{format(new Date(t.date), 'dd MMM yyyy', {locale: ptBR})} • {t.category}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-lg font-black ${t.type === 'entrada' ? 'text-primary' : 'text-secondary'}`}>
                                    {t.type === 'entrada' ? '+' : '-'} {formatCurrency(t.amount)}
                                </div>
                                <button 
                                    onClick={async () => {
                                      const order = orders.find(o => o.id === t.order_id);
                                      let installmentInfo = undefined;
                                      
                                      if (order) {
                                          const { data: inst } = await supabase
                                            .from('installments')
                                            .select('*')
                                            .eq('order_id', order.id)
                                            .order('due_date', { ascending: true });
                                          
                                          if (inst && inst.length > 0) {
                                            installmentInfo = { 
                                                count: inst.length, 
                                                value: inst[0].amount,
                                                dueDates: inst.map(i => i.due_date)
                                            };
                                          }
                                      }

                                      generateReceipt({ 
                                         clientName: order?.clients?.name || 'Venda Direta', 
                                         amount: t.amount, 
                                         description: t.description, 
                                         date: new Date(t.date), 
                                         receiptId: t.id.slice(0,6),
                                         paymentMethod: order?.payment_method || 'Dinheiro',
                                         isScheduled: order ? order.status !== 'paid' : false,
                                         installments: installmentInfo,
                                         address: order?.clients?.address,
                                         city: order?.clients?.city
                                      });                                    }} 
                                    className="text-[8px] font-black text-slate-500 uppercase hover:text-primary transition-colors"
                                >
                                    Ver Recibo
                                </button>
                              </div>
                          </Card>
                        ))}
                    </motion.div>
                  </TabsContent>
                )}

                {activeTab === "cobrancas" && (
                  <TabsContent value="cobrancas" forceMount className="mt-10 space-y-6 focus-visible:outline-none">
                    <motion.div
                      key="cobrancas-content"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="space-y-6"
                    >
                        {/* Filtro de Data de Cobrança */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#1A1A1A] p-6 rounded-[2rem] border border-white/5">
                            <div className="flex items-center gap-3">
                              <Calendar className="text-primary" size={20} />
                              <div>
                                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data da Cobrança</p>
                                  <p className="text-sm font-black text-white italic">Filtre para organizar seu dia</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <Input 
                                  type="date" 
                                  value={billingDate} 
                                  onChange={(e) => setBillingDate(e.target.value)}
                                  className="h-12 bg-[#0F0F0F] border-none rounded-xl text-xs font-black text-white px-4 min-w-[150px]"
                              />
                              <Button 
                                  variant={billingDate === new Date().toISOString().split('T')[0] ? "default" : "ghost"}
                                  onClick={() => setBillingDate(new Date().toISOString().split('T')[0])}
                                  className={cn(
                                    "h-12 px-6 rounded-xl font-black text-[10px] tracking-widest transition-all",
                                    billingDate === new Date().toISOString().split('T')[0] 
                                        ? "bg-primary text-background shadow-lg shadow-primary/20" 
                                        : "text-slate-500 hover:text-white bg-white/5"
                                  )}
                              >
                                  HOJE
                              </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {groupedOverdue.length === 0 ? (
                              <div className="py-20 text-center opacity-20 bg-[#202020] rounded-[2.5rem] border border-dashed border-white/10">
                                  <CheckCircle2 size={48} className="mx-auto mb-4 text-primary" />
                                  <p className="text-[10px] font-black uppercase tracking-widest">Sem cobranças para esta data</p>
                              </div>
                            ) : groupedOverdue.map((group) => (
                              <Card key={group.client?.id} className="bg-[#202020] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group">
                                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                                    <div className="flex items-center gap-6">
                                        <div className="h-16 w-16 bg-white/5 rounded-[1.5rem] flex items-center justify-center relative">
                                          <User className="text-slate-500 w-8 h-8" />
                                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-secondary rounded-full border-4 border-[#202020]" />
                                        </div>
                                        <div>
                                          <h4 className="text-xl font-black text-white uppercase tracking-tighter">{group.client?.name || 'Cliente'}</h4>
                                          <div className="flex items-center gap-3 mt-1">
                                              <Badge className="bg-secondary/10 text-secondary border-none text-[8px] font-black px-2 py-0.5">
                                                {group.orders.length} {group.orders.length === 1 ? 'VENDA PENDENTE' : 'VENDAS JUNTAS'}
                                              </Badge>
                                              <span className="text-[10px] text-slate-500 font-bold uppercase">Total a receber hoje</span>
                                          </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                                        <div className="text-center sm:text-right">
                                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Saldo Total Devedor</div>
                                          <div className="text-2xl sm:text-3xl font-black text-secondary">{formatCurrency(group.total_debt)}</div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
                                          <Button 
                                              onClick={() => handleOpenBillingConfirm(group.orders[0])} 
                                              variant="ghost" 
                                              className="h-14 sm:w-14 rounded-2xl bg-white/5 text-primary hover:bg-primary/10 flex items-center justify-center"
                                          >
                                              <MessageSquare size={20} />
                                          </Button>
                                          
                                          <Dialog>
                                              <DialogTrigger asChild>
                                                <Button className="h-14 px-4 sm:px-8 bg-primary text-background font-black uppercase text-[10px] tracking-widest rounded-2xl">Detalhes</Button>
                                              </DialogTrigger>
                                              <DialogContent className="bg-[#1A1A1A] border-white/10 rounded-[2.5rem] p-8 max-w-lg max-h-[90vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Histórico de <span className="text-primary">{group.client?.name}</span></DialogTitle>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Liquidando pendências individuais</p>
                                                </DialogHeader>
                                                
                                                <div className="space-y-6 py-6">
                                                    {group.orders.map((order) => (
                                                      <div key={order.id} className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                                                          <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="text-[10px] font-black text-primary uppercase">Venda #{order.id.slice(0,6)}</p>
                                                                <p className="text-sm font-bold text-white uppercase">{format(new Date(order.created_at), 'dd/MM/yyyy')}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[9px] font-black text-slate-500 uppercase">Restante</p>
                                                                <p className="text-lg font-black text-secondary">{formatCurrency(order.total_amount - (order.amount_paid || 0))}</p>
                                                            </div>
                                                          </div>

                                                          <div className="flex gap-2">
                                                            <Input 
                                                                type="number" 
                                                                placeholder="Valor" 
                                                                id={`pay-amount-${order.id}`}
                                                                className="h-12 bg-[#0F0F0F] border-none rounded-xl text-sm font-black text-primary px-4"
                                                            />
                                                            <Button 
                                                                onClick={async () => {
                                                                  const input = document.getElementById(`pay-amount-${order.id}`) as HTMLInputElement;
                                                                  const amount = parseFloat(input.value) || 0;
                                                                  if (amount > 0) {
                                                                      await handleRegisterPayment(order.id, order.amount_paid, order.total_amount, amount);
                                                                      toast.success('Pagamento registrado!');
                                                                  }
                                                                }}
                                                                className="h-12 px-6 bg-primary text-background font-black uppercase text-[10px] rounded-xl"
                                                            >
                                                                Pagar
                                                            </Button>
                                                          </div>
                                                      </div>
                                                    ))}
                                                </div>
                                              </DialogContent>
                                          </Dialog>
                                        </div>
                                    </div>
                                  </div>
                                  
                                  {/* Rodapé do Card com as Vendas resumidas */}
                                  <div className="mt-8 pt-6 border-t border-white/5">
                                    <div className="flex flex-wrap gap-2">
                                        {group.orders.map(o => (
                                          <Badge key={o.id} variant="outline" className="bg-white/5 border-white/5 text-[8px] font-bold text-slate-400 py-1">
                                              {formatCurrency(o.total_amount - (o.amount_paid || 0))} • Venc. {format(new Date(o.due_date), 'dd/MM')}
                                          </Badge>
                                        ))}
                                    </div>
                                  </div>
                              </Card>
                            ))}
                        </div>
                    </motion.div>
                  </TabsContent>
                )}
              </AnimatePresence>
           </Tabs>
        </motion.div>

      </motion.div>

      {/* Floating Plus Button - PADRONIZADO COM O DASHBOARD */}
      <button 
        onClick={() => setIsAddingExpense(true)} 
        className="fixed bottom-28 right-6 w-11 h-11 md:w-12 md:h-12 bg-primary text-background rounded-xl shadow-[0_10px_20px_rgba(93,214,44,0.3)] flex items-center justify-center z-[110] hover:scale-110 active:scale-90 transition-all"
      >
        <Plus size={24} strokeWidth={4} />
      </button>

      {/* MODAL CONFIRMAÇÃO DE COBRANÇA */}
      <Dialog open={isConfirmingBilling} onOpenChange={setIsConfirmingBilling}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 rounded-[2.5rem] p-10 max-w-md">
           <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Confirmar <span className="text-primary">Cobrança</span></DialogTitle>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Edite a mensagem antes de enviar se necessário</p>
           </DialogHeader>
           
           <div className="space-y-6 py-6">
              <div className="space-y-2">
                 <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Mensagem para WhatsApp</Label>
                 <textarea 
                    value={billingPreview.message}
                    onChange={(e) => setBillingPreview({...billingPreview, message: e.target.value})}
                    className="w-full h-48 bg-[#0F0F0F] border-none rounded-2xl p-6 text-sm font-medium text-slate-300 focus:ring-1 focus:ring-primary resize-none"
                 />
              </div>

              <div className="flex gap-3">
                 <Button 
                    variant="ghost" 
                    onClick={() => setIsConfirmingBilling(false)}
                    className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:text-white"
                 >
                    Cancelar
                 </Button>
                 <Button 
                    onClick={handleSendToWhatsApp}
                    className="flex-[2] h-16 bg-primary text-background font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-primary/20"
                 >
                    Enviar WhatsApp
                 </Button>
              </div>
           </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
