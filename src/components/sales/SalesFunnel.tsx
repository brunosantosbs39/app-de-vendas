"use client";

import { motion } from "framer-motion";
import { 
  MessageCircle, 
  Target, 
  Handshake, 
  CheckCircle2, 
  HeartHandshake,
  ChevronRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STAGES = [
  { id: 'contato', label: 'Contato', icon: MessageCircle, color: 'bg-blue-500' },
  { id: 'interessado', label: 'Interessado', icon: Target, color: 'bg-orange-500' },
  { id: 'negociacao', label: 'Negociação', icon: Handshake, color: 'bg-yellow-500' },
  { id: 'fechado', label: 'Fechado', icon: CheckCircle2, color: 'bg-primary' },
  { id: 'pos_venda', label: 'Pós-Venda', icon: HeartHandshake, color: 'bg-purple-500' },
];

interface SalesFunnelProps {
  clients: any[];
}

export function SalesFunnel({ clients }: SalesFunnelProps) {
  const getStageCount = (stageId: string) => {
    return clients.filter(c => (c.funnel_stage || 'contato') === stageId).length;
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      {STAGES.map((stage, i) => {
        const count = getStageCount(stage.id);
        const percentage = clients.length > 0 ? (count / clients.length) * 100 : 0;

        return (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="bg-[#202020] border-none p-4 flex items-center gap-4 overflow-hidden relative group">
              {/* Progress background bar */}
              <div 
                className={`absolute left-0 top-0 bottom-0 opacity-5 ${stage.color} transition-all duration-1000`}
                style={{ width: `${percentage}%` }}
              />
              
              <div className={`h-12 w-12 rounded-xl ${stage.color} flex items-center justify-center text-background shadow-lg`}>
                <stage.icon size={24} />
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-black text-white uppercase text-[10px] tracking-widest">{stage.label}</span>
                  <span className="font-black text-white text-lg">{count}</span>
                </div>
                <div className="h-1.5 w-full bg-[#0F0F0F] rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className={`h-full ${stage.color}`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Badge className="bg-white/5 text-slate-500 border-none font-black text-[10px]">
                  {Math.round(percentage)}%
                </Badge>
                <ChevronRight className="text-slate-800 group-hover:text-slate-500 transition-colors" />
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
