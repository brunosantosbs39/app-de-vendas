"use client";

import { useState } from "react";
import { Mic, Square, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface VoiceRegistrationProps {
  onRegister: (saleData: any) => void;
}

export function VoiceRegistration({ onRegister }: VoiceRegistrationProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleRecord = () => {
    if (isRecording) {
      // Pára a gravação e simula o processamento do áudio pela IA
      setIsRecording(false);
      setIsProcessing(true);

      setTimeout(() => {
        setIsProcessing(false);
        setIsSuccess(true);
        
        // Simulação do retorno da IA extraindo dados da frase
        // Ex: "Venda de 2 perfumes, cliente João, 50 reais"
        const mockParsedData = {
          clientName: "João",
          product: "2 Perfumes",
          amount: 50.00
        };

        setTimeout(() => {
          onRegister(mockParsedData);
          setIsSuccess(false);
          setIsOpen(false);
        }, 1500);

      }, 2500);
    } else {
      // Inicia a gravação
      setIsRecording(true);
      setIsSuccess(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={
        <Button variant="ghost" className="h-16 w-16 rounded-[2rem] bg-[#202020] border border-white/10 flex items-center justify-center group hover:bg-white/5 transition-all relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Mic className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors" />
        </Button>
      } />
      
      <DialogContent className="bg-[#1A1A1A] border-white/5 text-white rounded-[3rem] p-10 flex flex-col items-center justify-center text-center">
        <DialogHeader className="mb-8">
          <DialogTitle className="text-2xl font-black tracking-tighter text-center">Registro Inteligente</DialogTitle>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center mt-2">
            Fale os detalhes da venda
          </p>
        </DialogHeader>

        <div className="relative flex items-center justify-center w-full h-40">
          {/* Ondas sonoras animadas (simulação) */}
          {isRecording && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-50">
              {[1, 2, 3, 4, 5].map((i) => (
                <div 
                  key={i} 
                  className="w-2 bg-primary rounded-full animate-pulse"
                  style={{ 
                    height: `${20 + (i * 10)}px`,
                    animationDuration: `${0.5 + (i * 0.1)}s`
                  }} 
                />
              ))}
            </div>
          )}

          <Button 
            onClick={handleToggleRecord}
            disabled={isProcessing || isSuccess}
            className={`h-24 w-24 rounded-full relative z-10 transition-all duration-300 shadow-2xl ${
              isRecording ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-red-500/50' : 
              isProcessing ? 'bg-slate-800' :
              isSuccess ? 'bg-primary' :
              'bg-primary hover:bg-primary hover:scale-105 shadow-primary/30'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="h-10 w-10 text-white animate-spin" />
            ) : isSuccess ? (
              <CheckCircle2 className="h-10 w-10 text-background" />
            ) : isRecording ? (
              <Square className="h-8 w-8 fill-white text-white" />
            ) : (
              <Mic className="h-10 w-10 text-background" />
            )}
          </Button>
        </div>

        <div className="mt-8 h-10 flex items-center justify-center">
          {isRecording && <span className="text-red-500 font-black uppercase text-xs tracking-widest animate-pulse">Gravando...</span>}
          {isProcessing && <span className="text-slate-400 font-black uppercase text-xs tracking-widest">Processando Áudio via IA...</span>}
          {isSuccess && <span className="text-primary font-black uppercase text-xs tracking-widest">Venda Registrada!</span>}
          {!isRecording && !isProcessing && !isSuccess && (
             <span className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Ex: "Venda de 2 perfumes, cliente João, 50 reais"</span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
