"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  isSyncing?: boolean;
  pendingItems?: number;
}

export function ConnectionStatus({ isSyncing = false, pendingItems = 0 }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const Icon = !isOnline ? CloudOff : isSyncing ? RefreshCw : CheckCircle2;
  const label = !isOnline
    ? "Offline"
    : isSyncing
      ? "Sincronizando"
      : pendingItems > 0
        ? `${pendingItems} pendente${pendingItems > 1 ? "s" : ""}`
        : "Online";

  return (
    <div
      className={cn(
        "hidden md:flex h-10 items-center gap-2 rounded-2xl border px-3 text-[11px] font-black uppercase tracking-widest",
        !isOnline
          ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
          : pendingItems > 0 || isSyncing
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-white/10 bg-white/5 text-slate-400",
      )}
      title={label}
    >
      <Icon size={15} className={cn(isSyncing && "animate-spin")} />
      <span>{label}</span>
    </div>
  );
}

