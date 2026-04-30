"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  X, 
  Package, 
  DollarSign, 
  Calendar, 
  Trophy, 
  MessageSquare,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "../ui/button";

export function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, fetchInitialData } = useAppStore();
  const { user } = useAuth();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'sale': return { icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' };
      case 'stock': return { icon: Package, color: 'text-orange-500', bg: 'bg-orange-500/10' };
      case 'payment': return { icon: AlertTriangle, color: 'text-secondary', bg: 'bg-secondary/10' };
      case 'community': return { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' };
      case 'achievement': return { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
      default: return { icon: Bell, color: 'text-slate-400', bg: 'bg-slate-400/10' };
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id);
    
    fetchInitialData(user.id);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all relative text-slate-400 hover:text-white"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-primary rounded-full border-2 border-[#0F0F0F] animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-[160]" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-[350px] md:w-[400px] bg-[#1A1A1A] border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[170] overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                 <div className="flex items-center gap-3">
                    <h3 className="text-lg font-black uppercase italic tracking-tighter text-white">Notificações</h3>
                    {unreadCount > 0 && (
                      <Badge className="bg-primary text-background font-black text-[10px]">{unreadCount}</Badge>
                    )}
                 </div>
                 <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X size={20} />
                 </button>
              </div>

              <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                 {notifications.length === 0 ? (
                    <div className="py-20 text-center opacity-20">
                       <Zap size={48} className="mx-auto mb-4" />
                       <p className="text-xs font-black uppercase tracking-widest">Nada por aqui ainda</p>
                    </div>
                 ) : (
                    <div className="divide-y divide-white/5">
                       {notifications.map((n) => {
                          const style = getIcon(n.type);
                          return (
                            <div 
                              key={n.id} 
                              className={`p-6 flex gap-4 hover:bg-white/[0.03] transition-colors cursor-pointer relative group ${!n.is_read ? 'bg-primary/[0.02]' : ''}`}
                            >
                               <div className={`h-12 w-12 rounded-2xl ${style.bg} ${style.color} flex items-center justify-center shrink-0`}>
                                  <style.icon size={22} />
                               </div>
                               <div className="flex-1 space-y-1">
                                  <div className="flex justify-between items-start gap-2">
                                     <h4 className={`text-sm font-black uppercase tracking-tight leading-none ${!n.is_read ? 'text-white' : 'text-slate-400'}`}>
                                        {n.title || 'Sistema'}
                                     </h4>
                                     <span className="text-[9px] font-bold text-slate-600 uppercase flex items-center gap-1 whitespace-nowrap">
                                        <Clock size={10} /> {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                                     </span>
                                  </div>
                                  <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                                     {n.content}
                                  </p>
                               </div>
                               {!n.is_read && (
                                 <div className="absolute right-6 bottom-6 h-2 w-2 bg-primary rounded-full" />
                               )}
                            </div>
                          );
                       })}
                    </div>
                 )}
              </div>

              {notifications.length > 0 && (
                <div className="p-4 border-t border-white/5 bg-white/[0.02]">
                   <Button 
                    onClick={markAllAsRead}
                    variant="ghost" 
                    className="w-full text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/5 h-12"
                   >
                     Marcar todas como lidas
                   </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full ${className}`}>
      {children}
    </span>
  );
}
