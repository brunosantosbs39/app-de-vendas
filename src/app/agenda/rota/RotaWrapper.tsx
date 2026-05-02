"use client";

import dynamicImport from 'next/dynamic';

export const RotaContent = dynamicImport(() => import('./RotaClient'), { 
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center text-primary font-black uppercase text-[10px] tracking-[0.3em] animate-pulse">MAPEANDO ROTA DE ELITE...</div>
});
