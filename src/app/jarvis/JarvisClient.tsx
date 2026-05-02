"use client";

export const dynamic = 'force-dynamic';

import { JarvisCommandCenter } from "@/components/jarvis/JarvisCommandCenter";
import { motion } from "framer-motion";

import { useState, useEffect } from "react";

export default function JarvisPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div className="fixed inset-0 bg-black" />;

  return (
    <div className="fixed inset-0 bg-black text-[#F8F8F8] overflow-hidden">
      
      {/* Background Decorativo - Grade Hexagonal Sutil */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-rule='evenodd' stroke='%23fff' stroke-width='1' fill='none'/%3E%3C/svg%3E")`, backgroundSize: '60px' }} />

      {/* Overlay de Vinheta */}
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" 
           style={{ background: 'radial-gradient(circle, transparent 40%, black 100%)' }} />

      <main className="relative w-full h-full flex items-center justify-center">
        <JarvisCommandCenter />
      </main>

      {/* Marca d'água de sistema */}
      <div className="absolute bottom-6 right-8 flex flex-col items-end opacity-20 pointer-events-none">
        <div className="text-[10px] font-black tracking-[0.5em] mb-1">SYSTEM ONLINE</div>
        <div className="h-0.5 w-32 bg-blue-500" />
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-6 left-8 opacity-20 pointer-events-none"
      >
        <div className="text-[8px] font-mono tracking-widest uppercase">Biometric Auth: Enabled</div>
        <div className="text-[8px] font-mono tracking-widest uppercase">Neural Link: Active</div>
      </motion.div>
    </div>
  );
}
