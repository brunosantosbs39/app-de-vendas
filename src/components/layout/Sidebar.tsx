"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCircle,
  Menu,
  X,
  LogOut,
  CreditCard,
  LayoutDashboard,
  Users,
  Package,
  GraduationCap,
  Heart,
  CalendarDays,
  MessageCircle,
  Bot
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

import { useProfile } from "@/hooks/useProfile";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();

  const menuGroups = [
    {
      title: "Principal",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", href: "/" },
        { icon: UserCircle, label: "Meu Perfil", href: "/perfil" },
        { icon: Users, label: "Clientes", href: "/clientes" },
        { icon: Package, label: "Produtos & Estoque", href: "/estoque" },
        { icon: CreditCard, label: "Financeiro", href: "/financeiro" },
      ]
    },
    {
      title: "Operação",
      items: [
        { icon: CalendarDays, label: "Agenda", href: "/agenda" },
        { icon: MessageCircle, label: "WhatsApp", href: "/whatsapp" },
        { icon: Bot, label: "JARVIS", href: "/jarvis" },
      ]
    },
    {
      title: "Crescimento",
      items: [
        { icon: GraduationCap, label: "Treinamentos", href: "/treinamentos" },
        { icon: Heart, label: "Comunidade", href: "/comunidade" },
      ]
    }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger render={
        <button 
          className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <Menu className="text-white" size={24} />
          )}
        </button>
      } />

      <SheetContent 
        side="left" 
        className="w-80 bg-[#0F0F0F] border-r border-white/5 p-8 flex flex-col z-[100001] text-white"
      >
        <SheetHeader className="text-left mb-12">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center font-black text-background shadow-[0_0_20px_rgba(93,214,44,0.3)]">S</div>
                 <SheetTitle className="font-black text-xl tracking-tighter text-white uppercase">SISTEMA <span className="text-primary">ELITE</span></SheetTitle>
              </div>
           </div>
        </SheetHeader>

        <nav className="flex-1 space-y-8 overflow-y-auto custom-scrollbar pr-2">
          {menuGroups.map((group) => (
            <div key={group.title} className="space-y-2">
              <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 ml-4">{group.title}</div>
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
                    <div className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl transition-all group",
                      isActive ? "bg-primary text-background shadow-lg shadow-primary/20" : "text-slate-400 hover:bg-white/5"
                    )}>
                      <item.icon size={20} className={cn(isActive ? "text-background" : "text-slate-500 group-hover:text-primary transition-colors")} />
                      <span className="font-black text-sm">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="pt-8 mt-auto border-t border-white/5 space-y-2">
          <button 
            onClick={() => signOut()}
            className="flex items-center gap-4 p-4 w-full rounded-2xl text-red-500 hover:bg-red-500/10 transition-all group"
          >
              <LogOut size={20} />
              <span className="font-bold text-sm">Sair do Sistema</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
