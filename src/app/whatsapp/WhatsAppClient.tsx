"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { 
  MessageCircle, 
  Zap
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { NoSSR } from "@/components/layout/NoSSR";

function WhatsAppContent() {
  const { user } = useAuth();
  const { clients, fetchInitialData } = useAppStore();
  
  useEffect(() => {
    if (user) fetchInitialData(user.id);
  }, [user]);

  const smartSuggestions = useMemo(() => {
    return clients.slice(0, 3).map(c => ({
        id: c.id,
        clientName: c.name,
        phone: c.phone,
        reason: "Contato sugerido por inatividade"
    }));
  }, [clients]);

  const sendMessage = (phone: string) => {
    const cleanPhone = phone?.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleanPhone}`, "_blank");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-[#F8F8F8]">
      <Header title="WhatsApp" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 px-4 sm:px-6 pt-10 pb-32 space-y-8 max-w-7xl mx-auto w-full">
         <h2 className="text-4xl font-black uppercase italic tracking-tighter">Fluxos <span className="text-primary not-italic">Elite</span></h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {smartSuggestions.map(sug => (
               <Card key={sug.id} className="bg-[#1A1A1A] border-none p-8 rounded-[2.5rem]">
                  <h4 className="text-2xl font-black text-white">{sug.clientName}</h4>
                  <p className="text-xs text-slate-500 font-bold uppercase mt-2">{sug.reason}</p>
                  <Button className="btn-primary mt-6 w-full" onClick={() => sendMessage(sug.phone)}>INICIAR CONTATO</Button>
               </Card>
            ))}
         </div>
      </motion.div>
    </div>
  );
}

export default function WhatsAppPage() {
  return (
    <NoSSR fallback={<div className="min-h-screen bg-[#0F0F0F]" />}>
      <WhatsAppContent />
    </NoSSR>
  );
}
