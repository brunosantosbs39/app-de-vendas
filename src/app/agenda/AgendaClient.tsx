"use client";

import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { 
  Navigation,
  MapPin,
  Clock,
  Zap,
  AlertCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/useAppStore";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { mapsService } from "@/lib/maps";
import nextDynamic from "next/dynamic";
import { cn } from "@/lib/utils";

// Importação dinâmica do mapa
const RealTimeRouteMap = nextDynamic(
  () => import("@/components/maps/RealTimeRouteMap"),
  { ssr: false, loading: () => <div className="h-[300px] w-full bg-[#1A1A1A] rounded-[2.5rem] animate-pulse" /> }
);

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function AgendaClient() {
  const { user } = useAuth();
  const { installments, orders, appointments, clients, fetchInitialData } = useAppStore();
  const { profile } = useProfile();
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [optimizedRoute, setOptimizedRoute] = useState<any[]>([]);
  
  useEffect(() => {
    if (user) {
      fetchInitialData(user.id);
    }
  }, [user]);

  // Monitorar localização e calcular rota
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const origin = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(origin);
      },
      (err) => console.error("Erro GPS:", err)
    );
  }, []);

  // Unificar fontes de dados (Parcelas, Pedidos Pendentes e Agendamentos)
  const combinedData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Clientes com parcelas pendentes
    const pendingInst = installments.filter(i => i.status === 'pending');
    
    // 2. Pedidos pendentes (sem parcelas criadas ainda)
    const pendingOrders = orders.filter(o => 
      o.status === 'pending' || 
      o.payment_method === 'fiado' || 
      o.payment_method === 'pendente'
    );

    // 3. Agendamentos para hoje
    const todayAppts = appointments.filter(a => 
      String(a.appointment_date || "").startsWith(today) && 
      a.status === 'scheduled'
    );

    // Agrupar tudo por cliente para evitar paradas duplicadas
    const clientsToVisitMap = new Map();

    const processItem = (clientId: string, amount: number, date: string, type: 'cobranca' | 'visita') => {
      if (!clientId || (amount <= 0 && type !== 'visita')) return;
      
      // Buscar dados completos do cliente na lista global de clientes
      const fullClient = clients.find(c => c.id === clientId);
      if (!fullClient) return;

      const itemDate = date ? date.split('T')[0] : today;
      const existing = clientsToVisitMap.get(clientId);
      
      if (existing) {
        existing.totalDue += amount;
        // Priorizar a data de hoje se houver algo para hoje, senão manter a mais antiga (atrasada)
        if (itemDate === today) {
           existing.nextDue = today;
        } else if (existing.nextDue !== today && itemDate < existing.nextDue) {
           existing.nextDue = itemDate;
        }
        if (type === 'cobranca') existing.hasCobranca = true;
        if (type === 'visita') existing.hasVisita = true;
      } else {
        clientsToVisitMap.set(clientId, {
          ...fullClient,
          totalDue: amount,
          nextDue: itemDate,
          hasCobranca: type === 'cobranca',
          hasVisita: type === 'visita',
          type: 'misto'
        });
      }
    };

    pendingInst.forEach(i => processItem(i.client_id || (i as any).orders?.client_id, Number(i.amount || 0), i.due_date, 'cobranca'));
    pendingOrders.forEach(o => processItem(o.client_id, Number(o.total_amount || 0) - Number(o.amount_paid || 0), o.due_date || o.created_at, 'cobranca'));
    todayAppts.forEach(a => processItem(a.client_id, 0, a.appointment_date, 'visita'));

    return Array.from(clientsToVisitMap.values());
  }, [installments, orders, appointments, clients]);

  // Calcular rota otimizada
  useEffect(() => {
    if (userLocation && combinedData.length > 0) {
      // Separar os que tem coordenadas dos que não tem
      const withCoords = combinedData.filter(c => c.latitude && c.longitude);
      const withoutCoords = combinedData.filter(c => !c.latitude || !c.longitude);

      if (withCoords.length > 0) {
        const route = mapsService.optimizeRoute(userLocation, withCoords);
        setOptimizedRoute([...route, ...withoutCoords]);
      } else {
        setOptimizedRoute(withoutCoords);
      }
    } else {
      setOptimizedRoute(combinedData);
    }
  }, [userLocation, combinedData]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getStatusInfo = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dueDate);
    date.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { label: "HOJE", color: "text-yellow-500", bg: "bg-yellow-500/10" };
    if (diffDays < 0) return { label: "ATRASADO", color: "text-red-500", bg: "bg-red-500/10" };
    return { label: `PROGRAMADO`, color: "text-primary", bg: "bg-primary/10" };
  };

  const handleCobrar = (stop: any) => {
    const defaultMsg = "Olá {cliente}, tudo bem? Estou passando para lembrar do seu acerto de {valor} que vence hoje. Como prefere pagar?";
    const msgTemplate = profile?.default_billing_message || defaultMsg;
    
    const vencimentoFormatado = stop.nextDue ? new Date(stop.nextDue).toLocaleDateString('pt-BR') : 'hoje';
    const produtoExemplo = stop.installments?.[0]?.description || 'seu pedido';

    const finalMsg = msgTemplate
      .replace(/{cliente}/g, stop.name)
      .replace(/{valor}/g, formatCurrency(stop.totalDue))
      .replace(/{vencimento}/g, vencimentoFormatado)
      .replace(/{produto}/g, produtoExemplo);

    const phone = stop.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(finalMsg)}`, "_blank");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-[#F8F8F8] overflow-x-hidden">
      <Header title="Cronograma" />
      
      <motion.div 
        variants={container} 
        initial="hidden" 
        animate="show" 
        className="flex-1 sm:p-8 p-6 pt-10 pb-44 space-y-10 max-w-4xl mx-auto w-full"
      >
        {/* CABEÇALHO */}
        <section>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">Próximas Cobranças</p>
          <h2 className="mt-2 text-4xl font-black uppercase tracking-tighter italic text-white">Agenda</h2>
        </section>

        {/* MAPA DE ROTA */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-2">
            <div className="space-y-1">
              <h3 className="text-lg font-black tracking-tighter uppercase italic">Rota Otimizada</h3>
              <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.2em] flex items-center gap-2">
                <Navigation size={10} className="text-primary animate-pulse" /> Metodologia de proximidade
              </p>
            </div>
            {optimizedRoute.length > 0 && (
              <Badge className="bg-primary/20 text-primary border-none font-black text-[9px] tracking-widest px-3">
                {optimizedRoute.length} PARADAS
              </Badge>
            )}
          </div>
          <Card className="rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
            <RealTimeRouteMap userLocation={userLocation} route={optimizedRoute.filter(r => r.latitude && r.longitude)} />
            {optimizedRoute.length > 0 && optimizedRoute[0].latitude && (
               <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[80%] z-20">
                  <Button 
                    onClick={() => window.open(`https://waze.com/ul?ll=${optimizedRoute[0].latitude},${optimizedRoute[0].longitude}&navigate=yes`, "_blank")}
                    className="w-full h-14 bg-primary text-background font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-[0_15px_35px_rgba(93,214,44,0.3)] gap-3 hover:scale-[1.02] transition-transform"
                  >
                    <Navigation size={16} strokeWidth={3} /> Iniciar Rota
                  </Button>
               </div>
            )}
          </Card>
        </section>

        {/* LISTA DE PARADAS */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Paradas do Dia</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ordem de proximidade</p>
          </div>
          
          <div className="grid grid-cols-1 gap-5">
            {optimizedRoute.length === 0 ? (
               <Card className="bg-[#1A1A1A] border-dashed border-white/10 sm:p-10 p-6 rounded-[2.5rem] text-center">
                  <Clock size={40} className="mx-auto text-slate-700 mb-4" />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhuma cobrança identificada</p>
               </Card>
            ) : optimizedRoute.map((stop, index) => {
                const status = getStatusInfo(stop.nextDue);
                const hasCoords = !!(stop.latitude && stop.longitude);

                return (
                  <motion.div key={stop.id} variants={item}>
                    <Card className="bg-[#1A1A1A] border-white/5 p-0 rounded-[2.5rem] hover:bg-[#202020] transition-all group overflow-hidden border-l-4 border-l-transparent hover:border-l-primary">
                       <div className="flex flex-col sm:flex-row">
                          {/* Stop Number Indicator */}
                          <div className={cn(
                            "flex items-center justify-center p-6 sm:w-20 w-[4.5rem] text-3xl font-black italic",
                            hasCoords ? "bg-primary text-background" : "bg-white/5 text-slate-600"
                          )}>
                             {index + 1}º
                          </div>
                          
                          <div className="flex-1 sm:p-8 p-5 space-y-4">
                             <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                   <div className={cn(
                                     "px-3 py-1 rounded-full text-[9px] font-black tracking-[0.2em] w-fit mb-2",
                                     status.bg, status.color
                                   )}>
                                      {status.label}
                                   </div>
                                   <h4 className="sm:text-2xl text-xl font-black text-white uppercase italic tracking-tight group-hover:text-primary transition-colors">
                                     {stop.name}
                                   </h4>
                                   {stop.store_name && (
                                     <p className="text-primary font-bold text-xs italic">{stop.store_name}</p>
                                   )}
                                   {stop.address && (
                                     <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider flex items-center gap-1.5 mt-1">
                                       <MapPin size={10} /> {stop.address}
                                     </p>
                                   )}
                                </div>
                                <div className="text-right">
                                   <p className="text-2xl font-black text-white italic">
                                     {formatCurrency(stop.totalDue)}
                                   </p>
                                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                      Total em aberto
                                   </p>
                                </div>
                             </div>

                             {/* Ações da Parada */}
                             <div className="flex gap-3 pt-2">
                                {hasCoords ? (
                                  <Button 
                                    onClick={() => window.open(`https://waze.com/ul?ll=${stop.latitude},${stop.longitude}&navigate=yes`, "_blank")}
                                    variant="outline" 
                                    className="h-11 flex-1 rounded-2xl border-white/10 bg-white/5 font-black text-[10px] tracking-widest uppercase hover:bg-primary hover:text-background transition-all"
                                  >
                                    <Navigation size={14} /> Navegar
                                  </Button>
                                ) : (
                                  <Button 
                                    disabled
                                    variant="outline" 
                                    className="h-11 flex-1 rounded-2xl border-white/10 bg-white/5 font-black text-[10px] tracking-widest uppercase opacity-30"
                                  >
                                    <AlertCircle size={14} /> Sem GPS
                                  </Button>
                                )}
                                <Button 
                                  onClick={() => handleCobrar(stop)}
                                  variant="outline" 
                                  className="h-11 flex-1 rounded-2xl border-white/10 bg-white/5 font-black text-[10px] tracking-widest uppercase hover:bg-green-500/20 hover:text-green-500 transition-all"
                                >
                                  <Zap size={14} /> Cobrar agora
                                </Button>
                             </div>
                          </div>
                       </div>
                    </Card>
                  </motion.div>
                );
            })}
          </div>
        </section>
      </motion.div>
    </div>
  );
}
