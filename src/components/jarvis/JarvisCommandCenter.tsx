"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gamificationService } from "@/lib/gamification";
import { useAuth } from "@/hooks/useAuth";

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export function JarvisCommandCenter() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [audioLevel, setAudioLevel] = useState(1);
  const [lastTranscript, setLastTranscript] = useState("");
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Função de Síntese de Voz (O Jarvis Responde)
  const speak = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.1;
      utterance.pitch = 0.8;
      
      utterance.onstart = () => {
        setStatus('speaking');
        // Inicia análise de áudio para a fala do Jarvis
        simulateSpeakingPulse();
      };
      
      utterance.onend = () => {
        setStatus('idle');
        setAudioLevel(1);
        stopAudioAnalysis();
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const simulateSpeakingPulse = () => {
    const pulse = () => {
      if (window.speechSynthesis.speaking) {
        setAudioLevel(1.2 + Math.random() * 0.8);
        requestAnimationFrame(pulse);
      }
    };
    pulse();
  };

  // Inicialização do Reconhecimento de Voz
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log("Jarvis detectou voz:", transcript);
        setLastTranscript(transcript);
      };

      recognitionRef.current.onend = () => {
        if (status === 'listening') {
          handleProcessSpeech();
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Erro no reconhecimento de voz:", event.error);
        setStatus('idle');
        stopAudioAnalysis();
      };
    }
    
    return () => {
      stopAudioAnalysis();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [status]);

  const startAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (analyserRef.current && status === 'listening') {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          // Pulso Radial agressivo reativo à voz real
          setAudioLevel(1 + (average / 15)); 
          animationFrameRef.current = requestAnimationFrame(updateVolume);
        }
      };
      updateVolume();
      return true;
    } catch (err) { 
      console.error("Microfone não autorizado ou erro de áudio:", err);
      return false;
    }
  };

  const stopAudioAnalysis = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  const handleInteraction = async () => {
    if (status === 'idle') {
      const micReady = await startAudioAnalysis();
      if (micReady) {
        setStatus('listening');
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.warn("Reconhecimento já estava ativo");
          }
        }
      } else {
        alert("Por favor, ative o microfone no seu navegador para falar com o Jarvis.");
      }
    }
  };

  const handleProcessSpeech = () => {
    setStatus('processing');
    stopAudioAnalysis();

    // Lógica de resposta baseada no que foi ouvido
    setTimeout(() => {
      const text = (lastTranscript || "").toLowerCase();
      let response = "Desculpe, não entendi o comando. Pode repetir?";

      if (text.includes("vendi") || text.includes("venda") || text.includes("vendas")) {
        response = "Excelente! Registrei sua venda no sistema. Já adicionei 60 pontos de XP ao seu perfil de elite.";
        if (user) {
          const displayName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Consultor";
          gamificationService.recordAction(user.id, displayName, "sale", "Venda Vocal Real", 60);
        }
      } else if (text.includes("dica") || text.includes("ajuda")) {
        response = "Com base no seu histórico, recomendo abordar clientes que não compram há mais de 15 dias. Há 5 deles no seu funil agora.";
      } else if (text.includes("obrigado") || text.includes("jarvis")) {
        response = "Sempre aqui para otimizar sua performance. Sistemas em standby.";
      }

      speak(response);
      setLastTranscript(""); // Limpa para a próxima
    }, 1500);
  };

  const allParticles = useMemo(() => {
    const total = 500;
    return Array.from({ length: total }).map((_, i) => {
      const phi = Math.acos(-1 + (2 * i) / total);
      const theta = Math.sqrt(total * Math.PI) * phi;
      return {
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.sin(phi) * Math.sin(theta),
        z: Math.cos(phi),
        size: Math.random() * 2 + 2,
        layer: Math.random() > 0.8 ? 'inner' : 'outer'
      };
    });
  }, []);

  const getStatusColor = () => {
    if (status === 'listening') return '#FF0033'; 
    if (status === 'processing') return '#00E0FF'; 
    if (status === 'speaking') return '#66FF00'; 
    return '#33FF00';
  };

  return (
    <div className="flex flex-col h-full bg-black rounded-[4rem] relative overflow-hidden shadow-2xl border border-white/5">
      
      <motion.div 
        animate={{ 
          backgroundColor: getStatusColor(),
          opacity: status === 'idle' ? 0.05 : 0.3,
          scale: status !== 'idle' ? audioLevel : 1
        }}
        className="absolute inset-0 blur-[200px] transition-colors duration-1000"
      />

      <div 
        className="flex-1 flex items-center justify-center relative cursor-pointer" 
        onClick={handleInteraction}
        style={{ perspective: '1500px' }}
      >
        
        <motion.div 
          animate={{ rotateY: 360, rotateX: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="relative w-1 h-1 flex items-center justify-center"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {allParticles.map((p, i) => {
            const color = getStatusColor();
            const baseRadius = p.layer === 'inner' ? 80 : 160;
            const radius = (status === 'idle' ? baseRadius : baseRadius + 20) * audioLevel;
            
            return (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{ 
                  width: p.size, 
                  height: p.size, 
                  backgroundColor: color, 
                  boxShadow: `0 0 15px ${color}, 0 0 30px ${color}`,
                  transform: `translate3d(${p.x * radius}px, ${p.y * radius}px, ${p.z * radius}px)`,
                  opacity: status === 'idle' ? 0.15 : 0.8,
                }}
              />
            );
          })}
        </motion.div>

        <AnimatePresence>
          {status !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                  opacity: 0.3 * audioLevel, 
                  scale: audioLevel * 2.2,
                  backgroundColor: getStatusColor()
              }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute w-40 h-40 rounded-full blur-[100px] pointer-events-none"
            />
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-4 pointer-events-none">
         <div className="h-0.5 w-48 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              animate={{ 
                width: status === 'idle' ? '15%' : '100%',
                backgroundColor: getStatusColor(),
                x: status === 'processing' ? ['-100%', '100%'] : '0%'
              }}
              transition={{ x: { repeat: Infinity, duration: 1.2 } }}
              className="h-full"
            />
         </div>
      </div>

      {status === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary opacity-20 mt-[20rem]">Sistema em Prontidão</span>
        </div>
      )}
    </div>
  );
}
