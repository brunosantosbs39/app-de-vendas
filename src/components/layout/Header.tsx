"use client";

import { Search } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { NotificationPanel } from "./NotificationPanel";
import { ConnectionStatus } from "./ConnectionStatus";
import { useProfile } from "@/hooks/useProfile";
import { useSyncManager } from "@/hooks/useSyncManager";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { profile } = useProfile();
  const { isSyncing, pendingItems } = useSyncManager();

  return (
    <header className="fixed top-0 left-0 right-0 h-20 md:h-24 flex items-center justify-between px-4 sm:px-6 md:px-8 bg-[#0F0F0F]/80 backdrop-blur-xl border-b border-white/5 z-50">
      <div className="flex items-center gap-3 md:gap-6">
        <Sidebar />
        <h1 className="text-xl md:text-3xl font-black tracking-tighter text-white uppercase truncate max-w-[200px] md:max-w-none">{title}</h1>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
        <ConnectionStatus isSyncing={isSyncing} pendingItems={pendingItems} />
        <button className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-slate-400 hover:text-white">
          <Search size={22} />
        </button>
        <NotificationPanel />
        <div className="hidden sm:block">
           <Avatar className="h-12 w-12 border-2 border-white/5 p-0.5">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-slate-800 text-white font-black">{profile?.user_name?.[0] || '?'}</AvatarFallback>
           </Avatar>
        </div>
      </div>
    </header>
  );
}
