"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { 
  PlayCircle, 
  Loader2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTrainings } from "@/hooks/useTrainings";
import { NoSSR } from "@/components/layout/NoSSR";

function TreinamentosContent() {
  const { trainings, loading } = useTrainings();

  if (loading) return <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-[#F8F8F8]">
      <Header title="Academy" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 px-4 sm:px-6 pt-10 pb-32 space-y-12 max-w-6xl mx-auto w-full">
         <h2 className="text-4xl font-black uppercase italic tracking-tighter">Treinamentos <span className="text-primary not-italic">Elite</span></h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trainings.map(t => (
               <Card key={t.id} className="bg-[#1A1A1A] border-none p-6 rounded-[2.5rem]">
                  <div className="flex items-center gap-6">
                     <PlayCircle size={32} className="text-primary" />
                     <div>
                        <h4 className="text-xl font-black text-white uppercase">{t.title}</h4>
                        <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black mt-2">{t.module_name}</Badge>
                     </div>
                  </div>
               </Card>
            ))}
         </div>
      </motion.div>
    </div>
  );
}

export default function TrainingPage() {
  return (
    <NoSSR fallback={<div className="min-h-screen bg-[#0F0F0F]" />}>
      <TreinamentosContent />
    </NoSSR>
  );
}
