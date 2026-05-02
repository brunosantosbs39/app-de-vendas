"use client";

import { useState, useEffect } from "react";
import { 
  Bell, 
  X, 
  DollarSign, 
  Package,
  AlertTriangle,
  MessageSquare,
  Trophy,
  Zap,
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

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
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    fetchInitialData(user.id);
  };

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 relative text-slate-400">
        <Bell size={22} />
        {unreadCount > 0 && <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-primary rounded-full border-2 border-[#0F0F0F]" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-4 w-[350px] bg-[#1A1A1A] border border-white/10 rounded-[2.5rem] shadow-2xl z-[170] overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
             <h3 className="text-lg font-black uppercase italic text-white">Notificações</h3>
             <button onClick={() => setIsOpen(false)}><X size={20} /></button>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
             {notifications.length === 0 ? (
                <div className="py-20 text-center opacity-20"><Zap size={48} className="mx-auto mb-4" /><p className="text-xs font-black uppercase">Nada por aqui</p></div>
             ) : (
                notifications.map(n => {
                   const style = getIcon(n.type);
                   return (
                     <div key={n.id} className="p-6 flex gap-4 hover:bg-white/[0.03] transition-colors border-b border-white/5">
                        <div className={`h-10 w-10 rounded-xl ${style.bg} ${style.color} flex items-center justify-center`}><style.icon size={20} /></div>
                        <div>
                           <h4 className="text-sm font-black text-white">{n.title}</h4>
                           <p className="text-xs text-slate-500 mt-1">{n.content}</p>
                        </div>
                     </div>
                   );
                })
             )}
          </div>
          <Button onClick={markAllAsRead} variant="ghost" className="w-full text-xs font-black text-primary">MARCAR TODAS LIDAS</Button>
        </div>
      )}
    </div>
  );
}
