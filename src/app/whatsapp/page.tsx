"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { 
  MessageCircle, 
  Send, 
  Zap, 
  Users, 
  Sparkles,
  ArrowRight,
  RefreshCw,
  Gift,
  Clock,
  Plus,
  MessageSquare,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  Layers,
  Heart,
  Target,
  ArrowUpRight,
  TrendingUp,
  X,
  CheckCircle2,
  CalendarDays,
  Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

// --- Funis de Comunicação ---
const FUNNELS = [
  {
    id: "nutricao",
    title: "Funil de Nutrição",
    description: "Para clientes inativos há 30+ dias",
    icon: RefreshCw,
    color: "text-primary",
    bg: "bg-primary/5",
    templates: [
      { step: "Passo 1", title: "Dica Técnica", text: "Olá {nome}. Tudo bem? Identifiquei uma informação sobre {dica} que pode ser relevante para seu perfil. Sabia que isso impacta no {beneficio}? Espero que ajude." },
      { step: "Passo 2", title: "Acompanhamento", text: "Oi {nome}. Gostaria de saber como está sua experiência com o {produto_anterior}. Tenho novos dados sobre a durabilidade dele." },
      { step: "Passo 3", title: "Condição Especial", text: "{nome}, verifiquei uma oportunidade de 15% para sua próxima reposição. Caso tenha interesse, posso reservar para você." }
    ]
  },
  {
    id: "pos_venda",
    title: "Funil de Pós-Venda",
    description: "Garantia de satisfação e suporte",
    icon: CheckCircle2,
    color: "text-primary",
    bg: "bg-primary/5",
    templates: [
      { step: "24h", title: "Confirmação", text: "Olá {nome}. Agradeço pela preferência. Já iniciou o uso do {produto}? Estou à disposição para suporte." },
      { step: "7 Dias", title: "Feedback", text: "Oi {nome}. Passando para validar se o {produto} está atendendo suas expectativas técnicas. Alguma dúvida?" },
      { step: "20 Dias", title: "Complemento", text: "{nome}, o uso do {produto} apresenta melhor performance quando associado ao {complemento}. Gostaria de conhecer?" }
    ]
  },
  {
    id: "followup",
    title: "Funil de Follow-up",
    description: "Conversão de propostas pendentes",
    icon: Target,
    color: "text-primary",
    bg: "bg-primary/5",
    templates: [
      { step: "12h", title: "Retorno Técnico", text: "Olá {nome}. Gostaria de validar se restou alguma dúvida técnica sobre a proposta do {produto}." },
      { step: "48h", title: "Disponibilidade", text: "Oi {nome}. Informo que a disponibilidade do {produto} em estoque é limitada (2 unidades). Posso garantir sua reserva?" }
    ]
  }
];

export default function WhatsAppPage() {
  const { user } = useAuth();
  const { clients, products, appointments, orders, fetchInitialData } = useAppStore();
  const [activeTab, setActiveTab] = useState("smart");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showFunnelModal, setShowFunnelModal] = useState(false);
  const [selectedFunnel, setSelectedFunnel] = useState<any>(null);
  const [activeFunnels, setActiveFunnels] = useState<any[]>([]);
  
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
      const saved = localStorage.getItem(`active_funnels_${user.id}`);
      if (saved) setActiveFunnels(JSON.parse(saved));
    }
  }, [user]);

  useEffect(() => {
    if (user && activeFunnels.length > 0) {
      localStorage.setItem(`active_funnels_${user.id}`, JSON.stringify(activeFunnels));
    }
  }, [activeFunnels, user]);

  const sendMessage = (phone: string, message: string, clientName?: string) => {
    let finalMessage = message;
    if (clientName) {
      finalMessage = message.replace(/{nome}/g, clientName);
    }
    const encoded = encodeURIComponent(finalMessage);
    const cleanPhone = phone?.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, "_blank");
  };

  const handleStartFunnel = (funnel: any) => {
    setSelectedFunnel(funnel);
    setShowFunnelModal(true);
  };

  const handleActivateFunnel = (client: any, funnel: any) => {
    const newActiveFunnel = {
      id: Date.now().toString(),
      clientId: client.id,
      clientName: client.name,
      phone: client.phone,
      funnelId: funnel.id,
      funnelTitle: funnel.title,
      currentStep: 0,
      startDate: new Date().toISOString(),
      lastSentDate: new Date().toISOString(),
      nextStepDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Próximo passo em 24h por padrão
      status: 'active'
    };

    setActiveFunnels(prev => [...prev, newActiveFunnel]);
    sendMessage(client.phone, funnel.templates[0].text, client.name);
    setShowFunnelModal(false);
    toast.success(`Funil ${funnel.title} ativado para ${client.name}! 🚀`);
  };

  const handleCompleteStep = (activeFunnel: any) => {
    const funnelDef = FUNNELS.find(f => f.id === activeFunnel.funnelId);
    if (!funnelDef) return;

    const nextStep = activeFunnel.currentStep + 1;
    
    if (nextStep < funnelDef.templates.length) {
      const updated = activeFunnels.map(f => f.id === activeFunnel.id ? {
        ...f,
        currentStep: nextStep,
        lastSentDate: new Date().toISOString(),
        nextStepDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // Ex: Próximos passos a cada 48h
      } : f);
      setActiveFunnels(updated);
      sendMessage(activeFunnel.phone, funnelDef.templates[nextStep].text, activeFunnel.clientName);
    } else {
      setActiveFunnels(activeFunnels.filter(f => f.id !== activeFunnel.id));
      toast.success("Funil concluído com sucesso! ✅");
    }
  };

  // Sugestões de Funil baseadas em ações recentes
  const actionSuggestions = useMemo(() => {
    const suggestions: any[] = [];
    
    // 1. Sugerir Pós-Venda para pedidos recentes (últimas 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentOrders = orders.filter(o => new Date(o.created_at) > oneDayAgo);
    
    recentOrders.forEach(order => {
      const alreadyInFunnel = activeFunnels.some(f => f.clientId === order.client_id && f.funnelId === 'pos_venda');
      if (!alreadyInFunnel) {
        suggestions.push({
          id: `order-${order.id}`,
          clientName: order.clients?.name,
          client: clients.find(c => c.id === order.client_id),
          reason: "Nova venda detectada",
          funnel: FUNNELS.find(f => f.id === 'pos_venda'),
          message: "Iniciar sequência de satisfação e garantia."
        });
      }
    });

    // 2. Sugerir Follow-up para novos clientes sem pedidos
    const recentClients = clients.filter(c => new Date(c.created_at) > oneDayAgo && !orders.some(o => o.client_id === c.id));
    recentClients.forEach(client => {
      const alreadyInFunnel = activeFunnels.some(f => f.clientId === client.id && f.funnelId === 'followup');
      if (!alreadyInFunnel) {
        suggestions.push({
          id: `newclient-${client.id}`,
          clientName: client.name,
          client: client,
          reason: "Novo contato sem proposta",
          funnel: FUNNELS.find(f => f.id === 'followup'),
          message: "Converter novo contato em primeira venda."
        });
      }
    });

    return suggestions;
  }, [orders, clients, activeFunnels]);

  // Mensagens pendentes para hoje
  const pendingSteps = useMemo(() => {
    const now = new Date();
    return activeFunnels.filter(f => new Date(f.nextStepDate) <= now);
  }, [activeFunnels]);

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newApt.clientId || !newApt.title) return;

    setIsAdding(true);
    try {
      const appointmentDate = `${newApt.date}T${newApt.time}:00Z`;
      const { error } = await supabase.from('appointments').insert([{
        user_id: user.id,
        client_id: newApt.clientId,
        title: newApt.title,
        description: newApt.description,
        appointment_date: appointmentDate,
        type: newApt.type,
        status: 'scheduled'
      }]);

      if (error) throw error;
      setShowAddModal(false);
      fetchInitialData(user.id);
      setNewApt({
        clientId: "",
        title: "",
        description: "",
        date: new Date().toISOString().split('T')[0],
        time: "10:00",
        type: "visit"
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  // Sugestões Inteligentes baseadas em dados reais
  const smartSuggestions = useMemo(() => {
    const suggestions: any[] = [];
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const inactiveClients = clients.filter(c => {
        const lastOrder = c.last_order_date ? new Date(c.last_order_date) : new Date(0);
        return lastOrder < thirtyDaysAgo;
    });

    inactiveClients.slice(0, 3).forEach(c => {
        suggestions.push({
            id: `inactive-${c.id}`,
            clientName: c.name,
            phone: c.phone,
            reason: "Ausência de transações: 30+ dias",
            suggestion: "Sequência de Reativação",
            message: `Olá ${c.name}. Identificamos que sua última reposição foi há mais de 30 dias. Temos novas atualizações de estoque que podem ser do seu interesse. Podemos conversar?`
        });
    });

    clients.slice(3, 5).forEach(c => {
        suggestions.push({
            id: `bday-${c.id}`,
            clientName: c.name,
            phone: c.phone,
            reason: "Data comemorativa detectada",
            suggestion: "Bonificação de Fidelidade",
            message: `Olá ${c.name}. Parabéns pelo seu dia. Como parte do nosso programa de fidelidade, disponibilizamos uma condição especial para sua próxima aquisição. Deseja validar?`
        });
    });

    return suggestions;
  }, [clients]);

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-[#F8F8F8]">
      <Header title="Comunicação Corporativa" />
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="flex-1 px-4 sm:px-6 md:px-12 pt-4 sm:pt-6 md:pt-10 pb-32 md:pb-40 space-y-8 max-w-7xl mx-auto w-full"
      >
        {/* Assistant Header - Minimalista */}
        <motion.section variants={item} className="space-y-4">
          <div className="bg-[#1A1A1A] p-6 md:p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Zap className="h-5 w-5 fill-primary" />
                </div>
                <span className="text-primary font-black uppercase text-[10px] md:text-xs tracking-[0.2em]">Sincronização Ativa</span>
              </div>
              <h2 className="text-3xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">Gestão de <br/> <span className="text-primary not-italic">Contatos</span></h2>
              <p className="text-slate-500 text-sm md:text-xl font-bold leading-relaxed max-w-xl uppercase tracking-tight">
                Otimização de fluxos de mensagens baseada em métricas de consumo e engajamento.
              </p>
            </div>
          </div>
        </motion.section>

        <Tabs defaultValue="smart" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-16 sm:h-20 bg-[#1A1A1A] rounded-[2rem] p-2 gap-2 border border-white/5">
            <TabsTrigger value="smart" className="rounded-[1.5rem] data-[state=active]:bg-primary data-[state=active]:text-background font-black uppercase text-[10px] md:text-xs tracking-widest gap-2">
              Insights
            </TabsTrigger>
            <TabsTrigger value="funnels" className="rounded-[1.5rem] data-[state=active]:bg-primary data-[state=active]:text-background font-black uppercase text-[10px] md:text-xs tracking-widest gap-2">
              Fluxos
            </TabsTrigger>
            <TabsTrigger value="reminders" className="rounded-[1.5rem] data-[state=active]:bg-primary data-[state=active]:text-background font-black uppercase text-[10px] md:text-xs tracking-widest gap-2">
              Agendamentos
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: Sugestões Inteligentes */}
          <TabsContent value="smart" className="mt-10 space-y-10">
            {/* 1. LEMBRETES DE FUNIS ATIVOS (CRÍTICO) */}
            {pendingSteps.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                   <Clock className="text-primary animate-pulse" size={20} />
                   <h3 className="text-lg font-black uppercase tracking-widest text-white italic">Próximos Passos <span className="text-primary">Pendentes</span></h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                   {pendingSteps.map(f => {
                     const funnelDef = FUNNELS.find(fd => fd.id === f.funnelId);
                     const step = funnelDef?.templates[f.currentStep];
                     return (
                       <Card key={f.id} className="bg-primary/5 border border-primary/20 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_30px_rgba(93,214,44,0.05)]">
                          <div className="flex items-center gap-5">
                             <div className="h-14 w-14 rounded-2xl bg-primary text-background flex items-center justify-center font-black text-xl">
                                {f.currentStep + 1}
                             </div>
                             <div>
                                <h4 className="font-black text-lg text-white uppercase italic leading-none">{f.clientName}</h4>
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-2">{f.funnelTitle} • {step?.title}</p>
                             </div>
                          </div>
                          
                          <div className="flex-1 max-w-md bg-black/20 p-4 rounded-xl border border-white/5 italic text-[11px] text-slate-400">
                             "{step?.text.replace(/{nome}/g, f.clientName)}"
                          </div>

                          <Button 
                            onClick={() => handleCompleteStep(f)}
                            className="btn-primary h-14 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest w-full md:w-auto"
                          >
                             ENVIAR AGORA
                          </Button>
                       </Card>
                     );
                   })}
                </div>
              </div>
            )}

            {/* 2. SUGESTÕES BASEADAS EM AÇÕES (NOVO) */}
            {actionSuggestions.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                   <Sparkles className="text-primary" size={20} />
                   <h3 className="text-lg font-black uppercase tracking-widest text-white italic">Sugestões de <span className="text-primary">Ativação</span></h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {actionSuggestions.map(sug => (
                     <Card key={sug.id} className="bg-[#1A1A1A] border border-white/5 rounded-[2.5rem] p-8 space-y-6 hover:border-primary/30 transition-all group">
                        <div className="flex justify-between items-start">
                           <div className="space-y-1">
                              <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase mb-2">{sug.reason}</Badge>
                              <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">{sug.clientName}</h4>
                           </div>
                           <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-primary group-hover:scale-110 transition-all">
                              <Zap size={24} fill="currentColor" />
                           </div>
                        </div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">{sug.message}</p>
                        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                           <div>
                              <span className="text-[9px] font-black text-slate-600 uppercase block mb-1">Funil Sugerido</span>
                              <span className="text-white font-black uppercase text-[11px]">{sug.funnel?.title}</span>
                           </div>
                           <Button 
                             onClick={() => handleActivateFunnel(sug.client, sug.funnel)}
                             className="h-12 px-6 rounded-xl bg-primary text-background font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all"
                           >
                              ATIVAR
                           </Button>
                        </div>
                     </Card>
                   ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between px-2 border-l-4 border-primary">
              <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic ml-4">Insights <span className="text-primary not-italic">de Fidelidade</span></h3>
              <Badge className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 font-black text-[10px]">{smartSuggestions.length} PONTOS DE CONTATO</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {smartSuggestions.map((sug) => (
                <motion.div variants={item} key={sug.id}>
                  <Card className="bg-[#1A1A1A] border border-white/5 rounded-[2.5rem] group hover:border-primary/20 transition-all overflow-hidden">
                    <CardContent className="p-6 md:p-10 space-y-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <h4 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter uppercase">{sug.clientName}</h4>
                          <div className="flex items-center gap-2 text-slate-600 font-bold text-[10px] md:text-xs uppercase tracking-widest">
                             {sug.reason}
                          </div>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500">
                          <MessageSquare size={24} />
                        </div>
                      </div>

                      <div className="bg-[#0F0F0F] rounded-2xl p-6 border border-white/5 relative">
                        <p className="text-slate-500 font-bold uppercase text-[10px] md:text-xs leading-relaxed">
                          "{sug.message}"
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex flex-col">
                          <span className="text-primary font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em]">Ação Sugerida</span>
                          <span className="text-white font-black uppercase text-sm">{sug.suggestion}</span>
                        </div>
                        <Button 
                          className="btn-primary h-14 md:h-16 px-8 md:px-12 rounded-2xl"
                          onClick={() => sendMessage(sug.phone, sug.message, sug.clientName)}
                        >
                          <Send size={18} /> <span className="hidden sm:inline">EXECUTAR CONTATO</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* ABA 2: Funis de Comunicação */}
          <TabsContent value="funnels" className="mt-10 space-y-12">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {FUNNELS.map((funnel) => (
                  <motion.div variants={item} key={funnel.id}>
                    <Card className="bg-[#1A1A1A] border border-white/5 rounded-[3rem] p-8 md:p-10 space-y-8 flex flex-col h-full group hover:border-primary/10 transition-all">
                       <div className="flex items-center gap-6">
                          <div className={`h-16 w-16 rounded-[1.5rem] bg-white/5 text-primary flex items-center justify-center group-hover:bg-primary/10 transition-all`}>
                             <funnel.icon size={28} />
                          </div>
                          <div className="space-y-1">
                             <h4 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic text-white">{funnel.title}</h4>
                             <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{funnel.description}</p>
                          </div>
                       </div>

                       <div className="space-y-4 flex-1">
                          {funnel.templates.map((step, idx) => (
                             <div key={idx} className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-2 hover:bg-white/[0.03] transition-colors group/step">
                                <div className="flex justify-between items-center">
                                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{step.step}</span>
                                </div>
                                <div className="text-[11px] font-black text-white uppercase tracking-tight">{step.title}</div>
                                <p className="text-[10px] text-slate-600 font-medium leading-relaxed line-clamp-2 uppercase">{step.text}</p>
                             </div>
                          ))}
                       </div>

                       <Button 
                        onClick={() => handleStartFunnel(funnel)}
                        className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest hover:bg-primary hover:text-background transition-all"
                       >
                        ATIVAR SEQUÊNCIA
                       </Button>
                    </Card>
                  </motion.div>
                ))}
             </div>
          </TabsContent>

          {/* ABA 3: Lembretes e Agendamento */}
          <TabsContent value="reminders" className="mt-10 space-y-10">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic">Compromissos <span className="text-primary not-italic">Confirmados</span></h3>
              <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogTrigger>
                   <div role="button" className="btn-primary h-12 md:h-14 px-8 rounded-2xl font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-primary/20">
                      <Plus size={18} /> <span className="hidden sm:inline">NOVO REGISTRO</span>
                   </div>
                </DialogTrigger>
                <DialogContent className="bg-[#1A1A1A] border-white/10 rounded-[2.5rem] p-6 md:p-10 max-w-[95vw] md:max-w-lg overflow-hidden">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Novo <span className="text-primary not-italic">Agendamento</span></DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddAppointment} className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Cliente</Label>
                      <div className="relative">
                        <select 
                          value={newApt.clientId} 
                          onChange={e => setNewApt({...newApt, clientId: e.target.value})}
                          className="w-full h-14 bg-[#0F0F0F] border border-white/5 rounded-2xl px-4 text-white focus:ring-2 focus:ring-primary outline-none appearance-none transition-all"
                          required
                        >
                          <option value="">Selecione o destinatário...</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                           <Users size={16} />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Descrição</Label>
                      <Input 
                        value={newApt.title} 
                        onChange={e => setNewApt({...newApt, title: e.target.value})} 
                        className="h-14 bg-[#0F0F0F] border border-white/5 rounded-2xl focus-visible:ring-primary px-4 w-full" 
                        placeholder="Título do contato" 
                        required 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Data</Label>
                        <Input 
                          type="date" 
                          value={newApt.date} 
                          onChange={e => setNewApt({...newApt, date: e.target.value})} 
                          className="h-14 bg-[#0F0F0F] border border-white/5 rounded-2xl focus-visible:ring-primary w-full" 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Horário</Label>
                        <Input 
                          type="time" 
                          value={newApt.time} 
                          onChange={e => setNewApt({...newApt, time: e.target.value})} 
                          className="h-14 bg-[#0F0F0F] border border-white/5 rounded-2xl focus-visible:ring-primary w-full" 
                          required 
                        />
                      </div>
                    </div>
                    <Button type="submit" disabled={isAdding} className="btn-primary w-full h-16 rounded-[1.5rem] font-black text-xs tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
                      {isAdding ? <Loader2 className="animate-spin" /> : "CONFIRMAR NO CRONOGRAMA"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {appointments.filter(a => a.status === 'scheduled').slice(0, 8).map((apt) => (
                <Card key={apt.id} className="bg-[#1A1A1A] border border-white/5 p-6 md:p-8 rounded-[2rem] group hover:bg-white/[0.02] transition-all">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center text-slate-600 group-hover:text-primary transition-all border border-white/5">
                        <CalendarDays size={24} />
                      </div>
                      <div className="space-y-1">
                        <div className="font-black text-lg md:text-xl text-white uppercase tracking-tighter italic leading-none">{apt.clients?.name || 'Cliente'}</div>
                        <div className="text-slate-600 font-bold text-[10px] uppercase tracking-widest">{apt.title}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <Badge className="bg-[#0F0F0F] text-slate-500 border border-white/5 font-black text-[9px] px-3 py-1 uppercase">{apt.appointment_date.split('T')[0]}</Badge>
                      <Button size="icon" variant="ghost" className="h-12 w-12 rounded-xl text-primary hover:bg-primary/10" onClick={() => sendMessage(apt.clients?.phone, `Olá ${apt.clients?.name}. Confirmamos nosso próximo contato conforme cronograma.`, apt.clients?.name)}>
                        <Send size={22} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {appointments.length === 0 && (
                 <div className="col-span-full py-20 text-center opacity-10 border-2 border-dashed border-white/5 rounded-[3rem]">
                    <Layers size={64} className="mx-auto mb-4" />
                    <p className="font-black uppercase tracking-widest text-xs">Aguardando dados</p>
                 </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* MODAL DE ATIVAÇÃO DE FUNIL */}
        <Dialog open={showFunnelModal} onOpenChange={setShowFunnelModal}>
          <DialogContent className="bg-[#1A1A1A] border-white/10 rounded-[2.5rem] p-10 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
                Ativar <span className="text-primary not-italic">{selectedFunnel?.title}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-8 py-6">
               <div className="space-y-3">
                  <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Para qual cliente deseja iniciar?</Label>
                  <Select onValueChange={(val) => {
                    const client = clients.find(c => c.id === val);
                    if (client && selectedFunnel) {
                      handleActivateFunnel(client, selectedFunnel);
                    }
                  }}>
                    <SelectTrigger className="h-16 bg-[#0F0F0F] border-none rounded-2xl text-white px-6">
                      <SelectValue placeholder="Selecione o destinatário..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-white/10 text-white max-h-60 overflow-y-auto">
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
               </div>

               <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                  <div className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-4">Primeira Mensagem (Automática)</div>
                  <p className="text-sm text-slate-400 italic leading-relaxed uppercase">
                    "{selectedFunnel?.templates[0].text.replace(/{nome}/g, "Cliente")}"
                  </p>
               </div>

               <div className="flex gap-4">
                  <Button variant="ghost" onClick={() => setShowFunnelModal(false)} className="flex-1 h-14 rounded-xl font-black uppercase text-[10px] text-slate-500">Cancelar</Button>
               </div>
            </div>
          </DialogContent>
        </Dialog>

      </motion.div>
    </div>
  );
}
