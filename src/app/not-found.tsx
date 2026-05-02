"use client";

import Link from "next/link";
import { Zap } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white flex flex-col items-center justify-center p-6 text-center">
      <Zap className="text-primary mb-6 animate-pulse" size={48} />
      <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-4">
        Destino <span className="text-primary not-italic">Desconhecido</span>
      </h2>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-10 max-w-sm leading-relaxed">
        A rota solicitada não existe.
      </p>
      <Link href="/">
        <button className="h-14 px-8 rounded-2xl bg-primary text-background font-black uppercase text-xs tracking-widest shadow-[0_10px_30px_rgba(93,214,44,0.2)] hover:scale-105 transition-transform">
          Voltar ao Início
        </button>
      </Link>
    </div>
  );
}