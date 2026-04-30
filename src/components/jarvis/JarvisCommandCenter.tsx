"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gamificationService } from "@/lib/gamification";
import { useAuth } from "@/hooks/useAuth";

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface Particle {
  x: number; y: number; z: number; ox: number; oy: number; oz: number; size: number;
}

export function JarvisCommandCenter() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [audioLevel, setAudioLevel] = useState(1);
  const [history, setHistory] = useState<{role: 'user' | 'model', content: string}[]>([]);
  
  // Refs para controle de estado sem closures e lógica de áudio avançada
  const statusRef = useRef<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const transcriptRef = useRef(""); // O texto acumulado
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const recognitionRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restartLockRef = useRef(false);
  const isListeningRef = useRef(false);
  const isProactiveModeRef = useRef(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rotationRef = useRef({ x: 0, y: 0 });

  // Tenta iniciar automaticamente ao montar (requer interação prévia em alguns browsers)
  useEffect(() => {
    const autoStart = async () => {
      setTimeout(async () => {
        if (statusRef.current === 'idle') {
          await handleInteraction();
        }
      }, 1000);
    };
    autoStart();

    // WATCHDOG: Garante que o microfone nunca fique "morto" se o status for listening
    const watchdog = setInterval(() => {
      if (isListeningRef.current && 
          statusRef.current === 'listening' && 
          !recognitionRef.current && 
          !restartLockRef.current) {
        console.log("[JARVIS] Watchdog: Reiniciando microfone travado...");
        startRec();
      }
    }, 2000);

    return () => clearInterval(watchdog);
  }, []);

  useEffect(() => {
    statusRef.current = status;
    if (status === 'idle') {
       isListeningRef.current = false;
       stopRec();
    }
  }, [status]);

  // Inicialização das partículas - Otimizada para Mobile
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const total = isMobile ? 150 : 400; // Reduz partículas no mobile
    const particles: Particle[] = [];
    for (let i = 0; i < total; i++) {
      const phi = Math.acos(-1 + (2 * i) / total);
      const theta = Math.sqrt(total * Math.PI) * phi;
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta);
      const z = Math.cos(phi);
      particles.push({ x, y, z, ox: x, oy: y, oz: z, size: Math.random() * 1.5 + 1 });
    }
    particlesRef.current = particles;
  }, []);

  // Loop de Animação 3D
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const render = () => {
      frame++;
      const width = canvas.width = canvas.offsetWidth;
      const height = canvas.height = canvas.offsetHeight;
      const centerX = width / 2;
      const centerY = height / 2;

      const breathing = Math.sin(frame * 0.03) * 0.04 + 1;
      const baseRadius = Math.min(width, height) * 0.25;
      const currentStatus = statusRef.current;
      const dynamicScale = currentStatus === 'idle' ? breathing : 1 + (audioLevel - 1) * 0.7;
      const radius = baseRadius * dynamicScale;

      ctx.clearRect(0, 0, width, height);
      const rotationSpeed = currentStatus === 'processing' ? 0.015 : 0.005;
      rotationRef.current.y += rotationSpeed;
      rotationRef.current.x += rotationSpeed * 0.4;

      const cosY = Math.cos(rotationRef.current.y);
      const sinY = Math.sin(rotationRef.current.y);
      const cosX = Math.cos(rotationRef.current.x);
      const sinX = Math.sin(rotationRef.current.x);

      const color = getStatusColorSync(currentStatus);
      ctx.shadowBlur = currentStatus === 'idle' ? 15 : 25 * audioLevel;
      ctx.shadowColor = color;

      particlesRef.current.forEach((p, i) => {
        let x = p.ox; let y = p.oy; let z = p.oz;
        let tx = x * cosY - z * sinY; let tz = x * sinY + z * cosY; x = tx; z = tz;
        let ty = y * cosX - z * sinX; tz = y * sinX + z * cosX; y = ty; z = tz;

        const jitter = (Math.random() - 0.5) * 0.01 * (currentStatus === 'idle' ? 0.5 : audioLevel);
        const noise = Math.sin(frame * 0.08 + i) * 0.015 * dynamicScale;
        const scale = radius * (1 + noise + jitter);
        
        const perspective = 1000 / (1000 - z * scale);
        const px = centerX + x * scale * perspective;
        const py = centerY + y * scale * perspective;
        const pSize = p.size * perspective * (currentStatus === 'idle' ? 1 : audioLevel * 1.2);

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.globalAlpha = ((z + 1) / 2 * 0.7 + 0.3) * (Math.random() * 0.2 + 0.8); 
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };
    render();
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [audioLevel]);

  const getStatusColorSync = (s: string) => {
    if (s === 'listening') return '#00f2ff'; 
    if (s === 'processing') return '#7000ff'; 
    if (s === 'speaking') return '#00ff41'; 
    return '#0084ff'; 
  };

  // --- LÓGICA DE RECONHECIMENTO INSPIRADA NO PROJETO ORIGINAL ---

  const stopRec = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.abort(); } catch(e) {}
      recognitionRef.current = null;
    }
  };

  const startRec = () => {
    if (!isListeningRef.current || restartLockRef.current || statusRef.current === 'speaking' || statusRef.current === 'processing') {
      return;
    }

    stopRec();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'pt-BR';
      rec.continuous = true; // Escuta continuamente como no original
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        if (statusRef.current !== 'listening') setStatus('listening');
        console.log("[JARVIS] Microfone Aberto");
      };

      rec.onresult = (e: any) => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            transcriptRef.current += (transcriptRef.current ? ' ' : '') + t.trim();
          } else {
            interim += t;
          }
        }

        // Resposta ultra-rápida: Debounce reduzido para 500ms (antes 1000ms)
        if (transcriptRef.current) {
          debounceTimerRef.current = setTimeout(processFinalSpeech, 500);
        } else if (interim) {
          // Se for interim mas o usuário pausou, processa em 800ms
          debounceTimerRef.current = setTimeout(() => {
            if (!transcriptRef.current) transcriptRef.current = interim;
            processFinalSpeech();
          }, 800);
        }
      };

      rec.onerror = (e: any) => {
        console.warn("[JARVIS] Erro REC:", e.error);
        if (e.error === 'not-allowed') {
          isListeningRef.current = false;
          setStatus('idle');
        } else {
          // Reinicia imediatamente em qualquer outro erro
          restartLockRef.current = false;
          startRec();
        }
      };

      rec.onend = () => {
        // Reinício IMEDIATO e AGRESSIVO
        if (isListeningRef.current && statusRef.current !== 'speaking' && statusRef.current !== 'processing') {
          startRec();
        }
      };

      rec.start();
      recognitionRef.current = rec;
    } catch(err) {
      console.error("[JARVIS] startRec error:", err);
      setTimeout(startRec, 100);
    }
  };

  const processFinalSpeech = async () => {
    const text = transcriptRef.current.trim();
    transcriptRef.current = ""; 
    
    if (!text || text.length < 2) return;

    // Filtro MUITO MAIS sensível e permissivo
    const lowerText = text.toLowerCase();
    const commonVariations = ["jarvis", "jarvas", "java", "avis", "servis", "computador", "ei", "oi", "ajuda"];
    const hasWakeWord = commonVariations.some(v => lowerText.includes(v)) || lowerText.length > 20; // Se a frase for longa, assume que é comando

    if (!hasWakeWord && !lowerText.includes("vendi")) {
      console.log("[JARVIS] Ruído ignorado.");
      return;
    }

    console.log("[JARVIS] Comando detectado:", text);
    stopRec(); 
    setStatus('processing');
    
    try {
      const response = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, context: { totalRevenue: 15420.5 }, userId: user?.id })
      });
      const data = await response.json();
      const jarvisText = data.content || "Falha na resposta neural.";
      
      setHistory(prev => [...prev, { role: 'user', content: text }, { role: 'model', content: jarvisText }].slice(-10));
      
      if (lowerText.includes("vendi") || lowerText.includes("venda")) {
         if (user) {
           const displayName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Consultor";
           gamificationService.recordAction(user.id, displayName, "sale", "Venda Vocal", 60);
         }
      }

      speak(jarvisText);
    } catch (e) {
      speak("Erro de conexão com o núcleo.");
    }
  };

  // Ciclo Proativo: Jarvis pode falar sozinho baseado em eventos do sistema
  useEffect(() => {
    if (!isListeningRef.current) return;

    const proactiveCheck = setInterval(() => {
      if (statusRef.current === 'listening') {
        const triggers = [
          "Senhor, notei que o faturamento hoje está 15% acima da média. Excelente desempenho.",
          "Atenção: Três itens do seu estoque atingiram o nível crítico. Deseja que eu gere uma lista de reposição?",
          "Lembrete: Você tem uma reunião de fechamento em 20 minutos com um cliente VIP.",
          "O núcleo de dados está processando novas tendências de mercado. O setor de beleza está em alta hoje."
        ];
        const randomTrigger = triggers[Math.floor(Math.random() * triggers.length)];
        
        // Só fala proativamente se houver silêncio (audioLevel baixo)
        if (audioLevel < 1.05) {
          console.log("[JARVIS] Interação Proativa ativada.");
          stopRec();
          speak(randomTrigger);
        }
      }
    }, 1000 * 60 * 5); // A cada 5 minutos

    return () => clearInterval(proactiveCheck);
  }, [audioLevel]);

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      utterance.pitch = 0.8; 

      utterance.onstart = () => { 
        setStatus('speaking'); 
        simulateSpeakingPulse(); 
      };

      utterance.onend = () => { 
        setStatus('listening'); // Volta a ouvir automaticamente
        setAudioLevel(1);
        if (isListeningRef.current) startRec(); // Reinicia microfone
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const simulateSpeakingPulse = () => {
    let frame = 0;
    const pulse = () => {
      if (window.speechSynthesis.speaking) {
        frame++;
        setAudioLevel(1.2 + Math.sin(frame * 0.4) * 0.15 + Math.random() * 0.05);
        requestAnimationFrame(pulse);
      }
    };
    pulse();
  };

  const startMicAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      audioContextRef.current = ctx;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const update = () => {
        if (analyserRef.current && statusRef.current === 'listening') {
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(1 + (avg / 25)); 
          requestAnimationFrame(update);
        } else if (statusRef.current === 'idle') {
          return; // Para loop se desligou
        } else {
          requestAnimationFrame(update); // Continua verificando
        }
      };
      update();
      return true;
    } catch (e) { return false; }
  };

  const handleInteraction = async () => {
    if (status === 'idle') {
      transcriptRef.current = "";
      isListeningRef.current = true;
      const ok = await startMicAnalysis();
      if (ok) {
        startRec();
      }
    } else {
      // Clique desliga o Jarvis
      isListeningRef.current = false;
      setStatus('idle');
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <motion.div 
        animate={{ backgroundColor: getStatusColorSync(status), opacity: status === 'idle' ? 0.05 : 0.2 }}
        className="absolute w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none transition-colors duration-500"
      />
      <canvas ref={canvasRef} className="relative w-full h-full cursor-pointer z-10" onClick={handleInteraction} />
      
      <AnimatePresence>
        {status === 'idle' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="absolute z-30 flex flex-col items-center"
          >
            <button 
              onClick={handleInteraction}
              className="px-8 py-3 bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/50 rounded-full text-blue-400 text-xs font-bold uppercase tracking-[0.3em] backdrop-blur-md transition-all duration-300 group"
            >
              <span className="group-hover:tracking-[0.5em] transition-all duration-300">Conectar Link Neural</span>
            </button>
            <div className="mt-4 text-[8px] text-white/30 uppercase tracking-widest">Aguardando autorização do consultor</div>
          </motion.div>
        )}

        {status !== 'idle' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-10 flex flex-col items-center z-20 pointer-events-none">
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40 mb-2">
              {status === 'listening' ? 'Sistema em Prontidão (Diga "Jarvis")' : status === 'processing' ? 'Acessando Núcleo...' : 'Transmitindo Dados'}
            </span>
            <div className="text-[8px] uppercase tracking-widest text-white/20 mt-1">
              Link Neural Ativo • Toque no núcleo para desconectar
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-10 left-10 border-l border-white/10 pl-4 py-2 opacity-30 pointer-events-none">
        <div className="text-[8px] uppercase tracking-widest">Protocolo</div>
        <div className="text-[10px] font-mono">MARK-VII-NEURAL</div>
      </div>
    </div>
  );
}
