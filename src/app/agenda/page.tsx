"use client";

import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { 
  Plus, 
  Clock, 
  MapPin, 
  Truck, 
  MessageSquare, 
  CheckCircle2, 
  Phone,
  MessageCircle,
  Zap,
  Calendar as CalendarIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/store/useAppStore";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function AgendaPage() {
  const { user } = useAuth();
  const { appointments, orders, installments, clients, fetchInitialData, isLoading } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newApt, setNewApt] = useState({
    clientId: "",
    title: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    time: "10:00",
    type: "visit"
  });

  useEffect(() => {
    if (user) {
      fetchInitialData(user.id);
    }
  }, [user]);

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newApt.clientId || !newApt.title) {
      toast.error("Preencha o cliente e o título.");
      return;
    }

    setIsAdding(true);
    try {
      // Garantir que a data seja processada corretamente
      const appointmentDate = new Date(`${newApt.date}T${newApt.time}`).toISOString();
      
      const { error } = await supabase.from('appointments').insert([{
        user_id: user.id,
        client_id: newApt.clientId || null,
        title: newApt.title,
        description: newApt.description,
        appointment_date: appointmentDate,
        type: newApt.type,
        status: 'scheduled'
      }]);

      if (error) throw error;

      toast.success("Compromisso agendado!");
      setShowAddModal(false);
      setNewApt({
        clientId: "",
        title: "",
        description: "",
        date: new Date().toISOString().split('T')[0],
        time: "10:00",
        type: "visit"
      });
      fetchInitialData(user.id);
    } catch (error: any) {
      toast.error("Erro ao agendar: " + error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'delivery': return { icon: Truck, color: 'text-primary', bg: 'bg-primary/10', label: 'Entrega' };
      case 'visit': return { icon: MapPin, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Visita' };
      case 'follow-up': return { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Follow-up' };
      case 'billing': return { icon: Zap, color: 'text-secondary', bg: 'bg-secondary/10', label: 'Cobrança' };
      default: return { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-500/10', label: 'Compromisso' };
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Mesclar apenas vendas programadas (cobranças)
  const getDailySchedule = (date: string) => {
    // Usar as variáveis do escopo do hook para garantir reatividade
    const orderBillings = orders
      .filter(o => {
        const oDate = o.due_date ? o.due_date.split('T')[0] : null;
        return oDate === date && (o.amount_paid || 0) < o.total_amount;
      })
      .map(o => ({
        id: `order-${o.id}`,
        time: "08:00",
        title: `Receber: ${formatCurrency(o.total_amount - (o.amount_paid || 0))}`,
        description: `${o.description || 'Pedido'} - Vencimento Direto`,
        type: 'billing',
        client: o.clients,
        raw_date: o.due_date
      }));

    const installmentBillings = (installments || [])
      .filter(inst => {
        const instDate = inst.due_date ? inst.due_date.split('T')[0] : null;
        return instDate === date && inst.status === 'pending';
      })
      .map(inst => ({
        id: `inst-${inst.id}`,
        time: "08:10", 
        title: `Parcela: ${formatCurrency(inst.amount)}`,
        description: `${inst.orders?.description || 'Pedido'} - Parcela Programada`,
        type: 'billing',
        client: inst.client,
        raw_date: inst.due_date
      }));

    return [...orderBillings, ...installmentBillings].sort((a, b) => a.time.localeCompare(b.time));
  };

  const todaySchedule = getDailySchedule(today);
  const tomorrowSchedule = getDailySchedule(tomorrow);

  // --- ESTADO DE COBRANÇA ---
  const [isConfirmingBilling, setIsConfirmingBilling] = useState(false);
  const [billingPreview, setBillingPreview] = useState({ message: "", phone: "", item: null as any });

  const handleOpenBillingConfirm = (item_apt: any) => {
    const clientName = item_apt.client?.name || 'Cliente';
    const amount = item_apt.title.includes('Receber:') ? item_apt.title.split('Receber: ')[1] : '';
    const dueDate = item_apt.raw_date ? format(new Date(item_apt.raw_date), 'dd/MM/yyyy') : '—';
    const product = item_apt.description?.split(' - ')[0] || 'Pedido';

    let message = `Olá ${clientName}, tudo bem? Estou passando para lembrar da sua pendência. Podemos acertar hoje?`;
    
    if (useAppStore.getState().userProfile?.default_billing_message) {
      message = useAppStore.getState().userProfile.default_billing_message
        .replace(/\{cliente\}/g, clientName)
        .replace(/\{valor\}/g, amount)
        .replace(/\{vencimento\}/g, dueDate)
        .replace(/\{produto\}/g, product);
    }

    setBillingPreview({
      message,
      phone: item_apt.client?.phone?.replace(/\D/g, '') || '',
      item: item_apt
    });
    setIsConfirmingBilling(true);
  };

  const handleSendToWhatsApp = () => {
    window.open(`https://wa.me/55${billingPreview.phone}?text=${encodeURIComponent(billingPreview.message)}`, '_blank');
    setIsConfirmingBilling(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-[#F8F8F8]">
      <Header title="Agenda" />
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="flex-1 px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 md:pt-10 pb-32 md:pb-40 space-y-6 md:space-y-10 max-w-6xl mx-auto w-full"
      >
        {/* Header Action */}
        <motion.section variants={item} className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-4xl font-black tracking-tighter">Cronograma</h2>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Gestao de Tempo</p>
          </div>
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger>
              <div role="button" className="h-14 w-14 rounded-2xl bg-primary text-background shadow-lg shadow-primary/20 active:scale-90 transition-transform flex items-center justify-center cursor-pointer">
                <Plus size={28} />
              </div>
            </DialogTrigger>
            <DialogContent className="bg-[#1A1A1A] border-white/10 rounded-[2.5rem] p-8 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Novo <span className="text-primary not-italic">Compromisso</span></DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddAppointment} className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Cliente</Label>
                  <select 
                    value={newApt.clientId} 
                    onChange={e => setNewApt({...newApt, clientId: e.target.value})}
                    className="w-full h-14 bg-[#0F0F0F] border-none rounded-xl px-4 text-white focus:ring-2 focus:ring-primary outline-none appearance-none"
                    required
                  >
                    <option value="">Selecione um cliente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Título do Agendamento</Label>
                  <Input value={newApt.title} onChange={e => setNewApt({...newApt, title: e.target.value})} className="h-14 bg-[#0F0F0F] border-none rounded-xl" placeholder="Ex: Entrega de pedido" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Data</Label>
                    <Input type="date" value={newApt.date} onChange={e => setNewApt({...newApt, date: e.target.value})} className="h-14 bg-[#0F0F0F] border-none rounded-xl" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Horário</Label>
                    <Input type="time" value={newApt.time} onChange={e => setNewApt({...newApt, time: e.target.value})} className="h-14 bg-[#0F0F0F] border-none rounded-xl" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Tipo</Label>
                  <select 
                    value={newApt.type} 
                    onChange={e => setNewApt({...newApt, type: e.target.value})}
                    className="w-full h-14 bg-[#0F0F0F] border-none rounded-xl px-4 text-white focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="visit">Visita</option>
                    <option value="delivery">Entrega</option>
                    <option value="follow-up">Follow-up</option>
                  </select>
                </div>
                <Button type="submit" disabled={isAdding} className="btn-primary w-full">SALVAR AGENDAMENTO</Button>
              </form>
            </DialogContent>
          </Dialog>
        </motion.section>

        {/* Date Tabs */}
        <motion.section variants={item}>
          <Tabs defaultValue="today" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-14 bg-[#202020] rounded-2xl p-2 gap-2">
              <TabsTrigger value="today" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-background font-black text-[10px] uppercase tracking-widest">Hoje</TabsTrigger>
              <TabsTrigger value="tomorrow" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-background font-black text-[10px] uppercase tracking-widest">Amanha</TabsTrigger>
              <TabsTrigger value="week" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-background font-black text-[10px] uppercase tracking-widest">Semana</TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="mt-10 space-y-6">
              {todaySchedule.length === 0 ? (
                 <div className="text-center py-20 opacity-20 font-black uppercase tracking-widest">Nenhum compromisso ou cobrança hoje</div>
              ) : todaySchedule.map((item_apt) => {
                const style = getTypeStyle(item_apt.type);
                return (
                  <motion.div variants={item} key={item_apt.id}>
                    <Card className="bg-[#202020] border-none card-morph group overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex">
                          {/* Time Indicator */}
                          <div className={`sm:w-20 w-[4.5rem] flex flex-col items-center justify-center gap-2 ${style.bg} ${style.color} border-r border-white/5`}>
                            <span className="text-xl font-black tracking-tighter">{item_apt.time}</span>
                            <style.icon size={20} />
                          </div>
                          
                          {/* Main Content */}
                          <div className="flex-1 sm:p-8 p-5 space-y-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <h4 className="sm:text-2xl text-xl font-black text-[#F8F8F8] tracking-tight truncate max-w-[200px]">{item_apt.client?.name || 'Cliente'}</h4>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${style.color}`}>
                                  {style.label}
                                </span>
                              </div>
                              <Zap size={18} className={cn("text-primary", item_apt.type === 'billing' ? "text-secondary fill-secondary" : "fill-primary")} />
                            </div>
                            
                            <p className="text-slate-400 font-medium line-clamp-2 leading-relaxed">
                              {item_apt.description || item_apt.title}
                            </p>
                            
                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                              <div className="flex gap-4">
                                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleOpenBillingConfirm(item_apt)}>
                                  <MessageCircle size={20} />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-primary hover:bg-primary/10">
                                  <Phone size={20} />
                                </Button>
                              </div>
                              <Button variant="outline" className="h-10 rounded-xl border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 font-black text-[10px] uppercase tracking-widest gap-2">
                                <CheckCircle2 size={14} /> CONCLUIR
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </TabsContent>

            <TabsContent value="tomorrow" className="mt-10 space-y-6">
              {tomorrowSchedule.length === 0 ? (
                 <div className="text-center py-20 opacity-20 font-black uppercase tracking-widest">Nenhum compromisso amanhã</div>
              ) : tomorrowSchedule.map((item_apt) => {
                const style = getTypeStyle(item_apt.type);
                return (
                  <motion.div variants={item} key={item_apt.id}>
                    <Card className="bg-[#202020] border-none card-morph group overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex">
                          <div className={`sm:w-20 w-[4.5rem] flex flex-col items-center justify-center gap-2 ${style.bg} ${style.color} border-r border-white/5`}>
                            <span className="text-xl font-black tracking-tighter">{item_apt.time}</span>
                            <style.icon size={20} />
                          </div>
                          <div className="flex-1 sm:p-8 p-5 space-y-4">
                             <h4 className="sm:text-2xl text-xl font-black text-[#F8F8F8] tracking-tight">{item_apt.client?.name || 'Cliente'}</h4>
                             <p className="text-slate-400 font-medium">{item_apt.title}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </TabsContent>
          </Tabs>
        </motion.section>

        {/* Empty State / Productivity */}
        <motion.div variants={item} className="pt-8">
          <Card className="glass border-none card-morph sm:p-10 p-6 flex flex-col items-center text-center gap-6">
            <div className="h-20 w-20 rounded-[2rem] bg-slate-800 flex items-center justify-center text-slate-500">
              <CalendarIcon size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tight text-[#F8F8F8]">Otimize sua Rota</h3>
              <p className="text-slate-500 font-medium">Você tem {todaySchedule.length} atendimentos hoje em bairros próximos.</p>
            </div>
            <Link href="/agenda/rota" className="w-full">
               <Button className="btn-secondary w-full">VER MAPA DE ROTAS</Button>
            </Link>
          </Card>
        </motion.div>
      </motion.div>
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
