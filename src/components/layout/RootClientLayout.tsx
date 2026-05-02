"use client";

import { Providers } from "@/components/Providers";
import { BottomNav } from "@/components/layout/BottomNav";

export function RootClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <main className="flex-1 overflow-x-hidden pt-20 md:pt-24">
        {children}
      </main>
      <BottomNav />
    </Providers>
  );
}
