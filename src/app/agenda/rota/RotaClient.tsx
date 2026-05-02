"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Navigation, ArrowLeft, Clock, Loader2, AlertCircle, MapPin, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/useAppStore";
import { mapsService } from "@/lib/maps";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import nextDynamic from "next/dynamic";

// Importação dinâmica do mapa para evitar erros de SSR do Leaflet
const RealTimeRouteMap = nextDynamic(
  () => import("@/components/maps/RealTimeRouteMap"),
  { ssr: false, loading: () => <div className="h-[400px] w-full bg-[#1A1A1A] rounded-[2.5rem] animate-pulse" /> }
);

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { x: -20, opacity: 0 },
  show: { x: 0, opacity: 1 }
};

export default function RouteOptimizationPage() {
  const { appointments, orders, isLoading } = useAppStore();
  const [optimizedRoute, setOptimizedRoute] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStopIndex, setActiveStopIndex] = useState(0);

  // Monitorar localização em tempo real
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocalização não suportada.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(newLoc);
        
        // Se ainda não temos rota, calcular a primeira vez
        if (optimizedRoute.length === 0 && !isCalculating && (appointments.length > 0 || orders.length > 0)) {
          calculateInitialRoute(newLoc);
        }
      },
      (err) => {
        console.error("Erro GPS:", err);
        setError("Ative o GPS para ver sua posição em tempo real.");
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [appointments, orders]);

  const calculateInitialRoute = (origin: {lat: number, lng: number}) => {
    setIsCalculating(true);
    
    const today = new Date().toISOString().split('T')[0];

    // 1. Priorizar Cobranças (Orders com saldo devedor para hoje)
    const dailyCollections = orders.filter(o => 
      o.due_date === today && 
      (o.amount_paid || 0) < o.total_amount &&
      o.clients?.latitude && 
      o.clients?.longitude
    );

    // 2. Agendar Visitas (Appointments para hoje)
    const todayAppointments = appointments.filter(apt => 
      apt.appointment_date.startsWith(today) && 
      apt.clients?.latitude && 
      apt.clients?.longitude
    );

    // Agrupar por Cliente para evitar paradas duplicadas
    const clientsToVisitMap = new Map();

    // Adicionar cobranças primeiro (prioridade)
    dailyCollections.forEach(o => {
      if (!clientsToVisitMap.has(o.client_id)) {
        clientsToVisitMap.set(o.client_id, {
          ...o.clients,
          appointment_time: today + 'T08:00:00', // Início do dia para cobrança
          type: 'cobranca',
          debt: o.total_amount - (o.amount_paid || 0)
        });
      } else {
        // Se já existe, apenas soma a dívida
        const existing = clientsToVisitMap.get(o.client_id);
        existing.debt += (o.total_amount - (o.amount_paid || 0));
      }
    });

    // Adicionar agendamentos (se o cliente não estiver na lista de cobrança)
    todayAppointments.forEach(apt => {
      if (!clientsToVisitMap.has(apt.client_id)) {
        clientsToVisitMap.set(apt.client_id, {
          ...apt.clients,
          appointment_id: apt.id,
          appointment_time: apt.appointment_date,
          type: 'visita'
        });
      }
    });

    const clientsToVisit = Array.from(clientsToVisitMap.values());

    if (clientsToVisit.length === 0) {
      setOptimizedRoute([]);
      setIsCalculating(false);
      return;
    }

    const route = mapsService.optimizeRoute(origin, clientsToVisit);
    setOptimizedRoute(route);
    setIsCalculating(false);
  };

  const openInWaze = (lat: number, lng: number) => {
    window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, "_blank");
  };

  const openInGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
  };

  const currentStop = optimizedRoute[activeStopIndex];

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-[#F8F8F8]">
      <div className="sticky top-0 z-40 bg-[#0F0F0F]/60 backdrop-blur-3xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/agenda">
              <button className="h-10 w-10 flex items-center justify-center hover:bg-white/5 rounded-xl transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
            </Link>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">Rota em Tempo Real</h1>
          </div>
          {optimizedRoute.length > 0 && (
            <Badge className="bg-primary/20 text-primary border-none font-black text-[10px] tracking-widest px-3">
              LIVE
            </Badge>
          )}
        </div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="flex-1 max-w-4xl mx-auto w-full p-6 space-y-8 pb-32"
      >
        {/* MAPA EM TEMPO REAL */}
        <div className="space-y-4">
          <div className="flex justify-between items-end px-2">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tighter uppercase italic">Mapa de Rota</h2>
              <p className="text-slate-500 font-bold uppercase text-[9px] tracking-[0.2em] flex items-center gap-2">
                <Navigation size={10} className="text-primary animate-pulse" /> Sincronizado com GPS
              </p>
            </div>
          </div>
          <RealTimeRouteMap userLocation={userLocation} route={optimizedRoute} />
        </div>

        {/* PARADA ATUAL / DESTAQUE */}
        <AnimatePresence mode="wait">
          {optimizedRoute.length > 0 && (
            <motion.div
              key="active-stop"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic ml-2">Próxima Parada</h3>
              <Card className="bg-primary text-background p-8 rounded-[3rem] shadow-[0_20px_50px_rgba(93,214,44,0.2)] border-none relative overflow-hidden group">
                 <div className="relative z-10 space-y-6">
                    <div className="flex justify-between items-start">
                       <div>
                          <div className="text-[10px] font-black uppercase opacity-70 tracking-widest mb-1">Destino Principal</div>
                          <h4 className="text-4xl font-black uppercase tracking-tighter italic leading-none">{currentStop.name}</h4>
                       </div>
                       <div className="h-14 w-14 rounded-2xl bg-black/10 flex items-center justify-center">
                          <Navigation size={28} />
                       </div>
                    </div>

                    <div className="space-y-1">
                       <p className="font-black text-sm flex items-center gap-2">
                          <MapPin size={16} /> {currentStop.address}
                       </p>
                       <p className="text-[10px] font-bold uppercase opacity-70 flex items-center gap-2">
                          <Clock size={12} /> Agendado para {format(new Date(currentStop.appointment_time), 'HH:mm')}
                       </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <Button 
                         onClick={() => openInWaze(currentStop.latitude, currentStop.longitude)}
                         className="h-16 rounded-2xl bg-black text-white font-black uppercase text-[11px] tracking-widest gap-2 hover:bg-black/80 transition-all"
                       >
                          IR COM WAZE
                       </Button>
                       <Button 
                         onClick={() => openInGoogleMaps(currentStop.latitude, currentStop.longitude)}
                         className="h-16 rounded-2xl bg-white/20 text-black border border-black/10 font-black uppercase text-[11px] tracking-widest gap-2"
                       >
                          MAPS
                       </Button>
                    </div>
                 </div>
                 {/* Círculos decorativos */}
                 <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LISTA DE SEQUÊNCIA */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Lista de Sequência</h3>
            <span className="text-[10px] font-black text-slate-600 uppercase">{optimizedRoute.length} paradas hoje</span>
          </div>

          {isCalculating ? (
            <div className="py-10 text-center opacity-30">
              <Loader2 className="animate-spin mx-auto mb-3" />
              <p className="text-[10px] font-black uppercase">Otimizando caminho...</p>
            </div>
          ) : optimizedRoute.length === 0 ? (
            <div className="py-10 text-center opacity-20">
               <AlertCircle className="mx-auto mb-4" size={48} />
               <p className="font-black uppercase text-xs tracking-widest">Nenhuma visita detectada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {optimizedRoute.map((stop, index) => (
                <motion.div 
                  key={stop.id} 
                  variants={item}
                  onClick={() => setActiveStopIndex(index)}
                  className={`cursor-pointer group relative ${index < activeStopIndex ? 'opacity-40' : ''}`}
                >
                  <Card className={cn(
                    "border-none rounded-[2rem] p-6 transition-all",
                    index === activeStopIndex ? "bg-white/5 ring-2 ring-primary/20" : "bg-[#161616] hover:bg-[#1A1A1A]"
                  )}>
                    <div className="flex items-center gap-6">
                      <div className={cn(
                        "h-12 w-12 rounded-2xl flex flex-col items-center justify-center font-black italic transition-all",
                        index === activeStopIndex ? "bg-primary text-background" : "bg-white/5 text-slate-600 group-hover:bg-white/10"
                      )}>
                        <span className="text-[8px] uppercase opacity-60 leading-none">Ponto</span>
                        <span className="text-xl tracking-tighter leading-none">{index + 1}</span>
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                           <h5 className="font-black text-white uppercase italic tracking-tighter">{stop.name}</h5>
                           <span className="text-[10px] font-black text-slate-600">{format(new Date(stop.appointment_time), 'HH:mm')}</span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[200px]">
                           {stop.address}
                        </p>
                      </div>

                      {index === activeStopIndex ? (
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                          <Play size={16} fill="currentColor" />
                        </div>
                      ) : (
                        <ChevronRight className="text-slate-800" size={20} />
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* FOOTER ACTION */}
      {optimizedRoute.length > 0 && (
         <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-50">
            <Button 
               onClick={() => openInWaze(currentStop.latitude, currentStop.longitude)}
               className="w-full h-18 bg-primary text-background font-black uppercase text-xs tracking-widest rounded-3xl shadow-[0_10px_30px_rgba(93,214,44,0.4)] flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all"
            >
               <Navigation size={20} strokeWidth={3} />
               INICIAR PRÓXIMA NAVEGAÇÃO
            </Button>
         </div>
      )}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
