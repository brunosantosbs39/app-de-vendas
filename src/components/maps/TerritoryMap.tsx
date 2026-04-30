"use client";

import { motion } from "framer-motion";
import { MapPin, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Territory {
  id: string;
  name: string;
  salesCount: number;
  visitFrequency: number;
  lastVisitDays: number;
  status: 'hot' | 'normal' | 'cold' | 'urgent';
}

interface TerritoryMapProps {
  territories: Territory[];
}

export function TerritoryMap({ territories }: TerritoryMapProps) {
  return (
    <div className="space-y-6">
      <div className="relative aspect-square w-full max-w-md mx-auto bg-[#1A1A1A] rounded-[3rem] p-8 border border-white/5 overflow-hidden">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#5DD62C 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        
        {/* Territory Points Visualization */}
        {territories.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.1, type: "spring" }}
            className="absolute"
            style={{ 
              top: `${20 + (i * 15)}%`, 
              left: `${20 + (Math.sin(i) * 30 + 30)}%` 
            }}
          >
            <div className="relative group cursor-pointer">
              {/* Pulsing ring for urgent/hot areas */}
              {(t.status === 'urgent' || t.status === 'hot') && (
                <div className={`absolute -inset-4 rounded-full animate-ping opacity-20 ${t.status === 'urgent' ? 'bg-red-500' : 'bg-primary'}`} />
              )}
              
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 ${
                t.status === 'hot' ? 'bg-primary text-background' :
                t.status === 'urgent' ? 'bg-red-500 text-white' :
                t.status === 'cold' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-white'
              }`}>
                <MapPin size={24} />
              </div>
              
              {/* Tooltip on hover */}
              <div className="absolute top-14 left-1/2 -translate-x-1/2 w-32 bg-[#252525] p-3 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                <div className="font-black text-[10px] text-white uppercase mb-1">{t.name}</div>
                <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{t.salesCount} Vendas</div>
              </div>
            </div>
          </motion.div>
        ))}
        
        {/* Map Legend */}
        <div className="absolute bottom-6 left-6 right-6 flex justify-between gap-2">
          <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase">Quente</Badge>
          <Badge className="bg-red-500/20 text-red-500 border-none text-[8px] font-black uppercase">Retornar</Badge>
          <Badge className="bg-slate-800 text-slate-500 border-none text-[8px] font-black uppercase">Estável</Badge>
        </div>
      </div>

      {/* Suggested Routes List */}
      <div className="space-y-4">
        <h4 className="text-white font-black uppercase text-[10px] tracking-widest px-2">Sugestões de Rota Hoje</h4>
        {territories.filter(t => t.status === 'urgent' || t.status === 'cold').map((t, i) => (
          <Card key={i} className="bg-[#202020] border-none p-5 flex items-center justify-between group hover:bg-white/5 transition-all">
            <div className="flex items-center gap-4">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${t.status === 'urgent' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                {t.status === 'urgent' ? <AlertCircle size={20} /> : <TrendingUp size={20} />}
              </div>
              <div>
                <div className="font-black text-white">{t.name}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Última visita: {t.lastVisitDays} dias atrás
                </div>
              </div>
            </div>
            <Button variant="ghost" className="text-primary font-black uppercase text-[10px] tracking-widest hover:bg-primary/10">Ver Rota</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
