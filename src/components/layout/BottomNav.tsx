"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Trophy, CalendarDays, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const items = [
  { icon: LayoutDashboard, label: "Home", href: "/" },
  { icon: Users, label: "Clientes", href: "/clientes" },
  { icon: Banknote, label: "Finanças", href: "/financeiro" },
  { icon: CalendarDays, label: "Cronograma", href: "/agenda" },
  { icon: Trophy, label: "Comunidade", href: "/comunidade" },
];

export function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const hideRoutes = ["/login", "/auth", "/register", "/welcome", "/onboarding"];
  if (hideRoutes.some(route => pathname?.startsWith(route))) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pointer-events-none">
      <div className="mx-auto max-w-lg bg-[#1A1A1A]/80 backdrop-blur-xl rounded-[2.5rem] h-20 flex items-center justify-around px-4 border border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] pointer-events-auto">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center flex-1 h-full group"
            >
              <div className="relative flex flex-col items-center justify-center w-14 h-14">
                {isActive && (
                  <div className="absolute inset-0 bg-primary rounded-2xl -z-10 shadow-[0_0_25px_rgba(93,214,44,0.4)]" />
                )}
                <item.icon 
                  className={cn(
                    "h-6 w-6 transition-all duration-300",
                    isActive ? "text-background scale-110" : "text-slate-500 group-hover:text-slate-300"
                  )} 
                />
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
