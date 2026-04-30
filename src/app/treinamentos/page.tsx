"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { 
  PlayCircle, 
  Plus, 
  Loader2,
  Upload,
  X,
  Star,
  Play,
  Lock,
  Search,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Trophy,
  Zap,
  Download,
  FileText,
  Table as TableIcon,
  Clock,
  Layout
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTrainings, Training } from "@/hooks/useTrainings";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function TrainingPage() {
  const { trainings, loading, addTraining } = useTrainings();
  const { user } = useAuth();
  const [activeVideo, setActiveVideo] = useState<Training | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [lastPositions, setLastPositions] = useState<{[key: string]: number}>({});
  
  const IS_CREATOR = user?.user_metadata?.role === 'expert' || user?.email?.includes('admin'); 

  useEffect(() => {
    if (user) loadProgress();
  }, [user]);

  const loadProgress = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('training_progress')
      .select('training_id, completed, last_position')
      .eq('user_id', user.id);
    
    if (data) {
      setCompletedLessons(data.filter(d => d.completed).map(d => d.training_id));
      const positions: {[key: string]: number} = {};
      data.forEach(d => {
        if (d.last_position) positions[d.training_id] = d.last_position;
      });
      setLastPositions(positions);
    }
  };

  const markAsComplete = async (id: string) => {
    if (!user) return;
    await supabase.from('training_progress').upsert({ 
      user_id: user.id, 
      training_id: id, 
      completed: true,
      updated_at: new Date().toISOString()
    });
    setCompletedLessons([...completedLessons, id]);
  };

  // Agrupar por módulos
  const modules = trainings.reduce((acc: {[key: string]: Training[]}, curr) => {
    const modName = curr.module_name || "Fundamentos de Elite";
    if (!acc[modName]) acc[modName] = [];
    acc[modName].push(curr);
    return acc;
  }, {});

  const handleStartLesson = (t: Training) => {
    setActiveVideo(t);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-[#F8F8F8]">
      <Header title="Synkra Academy" />
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="flex-1 px-4 sm:px-6 md:px-12 pt-6 md:pt-10 pb-40 space-y-12 md:space-y-16 max-w-[1800px] mx-auto w-full"
      >
        {/* Hero Section Cinema - Otimizado para Mobile */}
        {!activeVideo && (
          <motion.section variants={item} className="relative min-h-[450px] md:h-[600px] w-full rounded-[2rem] md:rounded-[3rem] overflow-hidden group border border-white/5">
             <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#0F0F0F] via-[#0F0F0F]/80 md:via-[#0F0F0F]/60 to-transparent z-10" />
             <img src="https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2074&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-1000" />
             
             <div className="relative z-20 h-full flex flex-col justify-end md:justify-center p-6 sm:p-10 md:p-20 max-w-4xl space-y-6 md:space-y-8">
                <div className="flex flex-wrap items-center gap-3">
                   <Badge className="bg-primary text-background font-black uppercase text-[8px] md:text-[10px] px-3 md:px-4 py-1.5 tracking-widest shadow-[0_0_30px_#5DD62C]">Módulo Master</Badge>
                   <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                     <Clock size={12} /> 12h 40m de Conteúdo
                   </span>
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-8xl font-black tracking-tighter leading-tight text-white uppercase italic">DOMÍNIO <br/><span className="text-primary not-italic">ABSOLUTO</span></h1>
                <p className="text-slate-400 font-bold text-sm sm:text-lg md:text-2xl leading-relaxed max-w-2xl hidden sm:block">
                   O treinamento definitivo para quem deseja escalar vendas e liderar o mercado local com inteligência emocional e técnica.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                   <Button onClick={() => trainings[0] && handleStartLesson(trainings[0])} className="btn-primary h-16 md:h-20 px-8 md:px-12 gap-4 text-sm md:text-xl w-full sm:w-auto">
                      <Play className="fill-background" size={24} /> COMEÇAR AGORA
                   </Button>
                   <Button variant="outline" className="h-16 md:h-20 px-8 md:px-10 rounded-[1.2rem] md:rounded-[1.5rem] border-white/10 bg-white/5 font-black text-sm md:text-xl hover:bg-white/10 w-full sm:w-auto">VER MÓDULOS</Button>
                </div>
             </div>
          </motion.section>
        )}

        {/* Player de Vídeo Cinema Mode - Responsivo */}
        <AnimatePresence>
          {activeVideo && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="w-full space-y-6 md:space-y-8">
               <div className="aspect-video w-full bg-black rounded-[1.5rem] md:rounded-[3rem] border border-primary/20 shadow-[0_0_100px_rgba(93,214,44,0.1)] overflow-hidden relative group">
                  <iframe 
                    src={`${activeVideo.content_url.replace('watch?v=', 'embed/')}?autoplay=1`} 
                    className="w-full h-full" 
                    allow="autoplay; fullscreen"
                    allowFullScreen 
                  />
                  <button onClick={() => setActiveVideo(null)} className="absolute top-4 right-4 md:top-8 md:right-8 h-10 w-10 md:h-14 md:w-14 rounded-full bg-black/60 backdrop-blur-xl flex items-center justify-center text-white hover:bg-red-500 transition-all z-30">
                     <X size={20} />
                  </button>
               </div>
               
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 md:p-8 bg-[#1A1A1A] rounded-[1.5rem] md:rounded-[2rem] border border-white/5 gap-6">
                        <div className="flex items-center gap-4 md:gap-6">
                          <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><Zap size={24} /></div>
                          <div>
                              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter truncate max-w-[200px] sm:max-w-md">{activeVideo.title}</h3>
                              <p className="text-slate-500 font-bold text-[10px] md:text-sm uppercase tracking-widest flex items-center gap-2">
                                {lastPositions[activeVideo.id] ? `Continuando de ${Math.floor(lastPositions[activeVideo.id] / 60)}min` : 'Sincronizando progresso...'}
                              </p>
                          </div>
                        </div>
                        <Button onClick={() => markAsComplete(activeVideo.id)} className="bg-primary/10 text-primary border border-primary/20 h-12 md:h-14 px-6 md:px-8 font-black uppercase text-[10px] md:text-xs tracking-widest rounded-xl hover:bg-primary hover:text-background transition-all w-full sm:w-auto">CONCLUIR AULA</Button>
                    </div>

                    {activeVideo.content_text && (
                      <Card className="bg-[#1A1A1A] border border-white/5 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-10">
                        <h4 className="text-lg md:text-xl font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-3">
                          <Layout size={20} /> Resumo da Aula
                        </h4>
                        <div className="text-slate-300 leading-relaxed font-medium space-y-4">
                          {activeVideo.content_text.split('\n').map((line, i) => (
                            <p key={i}>{line}</p>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* Sidebar de Materiais - Incremental */}
                  <div className="space-y-6">
                    <Card className="bg-[#1A1A1A] border border-white/5 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8">
                      <h4 className="text-sm md:text-base font-black uppercase tracking-widest text-white mb-6 flex items-center gap-3">
                        <Download size={18} className="text-primary" /> Materiais de Apoio
                      </h4>
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-primary/30 transition-all cursor-pointer">
                           <div className="flex items-center gap-3">
                              <FileText className="text-slate-500 group-hover:text-primary transition-colors" size={20} />
                              <div>
                                <p className="text-xs font-black text-white uppercase tracking-tight">E-book: Guia do Script</p>
                                <p className="text-[8px] text-slate-600 font-bold uppercase">PDF • 2.4 MB</p>
                              </div>
                           </div>
                           <Download size={16} className="text-slate-700 group-hover:text-primary" />
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-primary/30 transition-all cursor-pointer">
                           <div className="flex items-center gap-3">
                              <TableIcon className="text-slate-500 group-hover:text-primary transition-colors" size={20} />
                              <div>
                                <p className="text-xs font-black text-white uppercase tracking-tight">Planilha de Projeção</p>
                                <p className="text-[8px] text-slate-600 font-bold uppercase">XLSX • 1.1 MB</p>
                              </div>
                           </div>
                           <Download size={16} className="text-slate-700 group-hover:text-primary" />
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-primary/5 border border-primary/10 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 text-center space-y-4">
                        <Trophy className="mx-auto text-primary" size={32} />
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest">Recompensa</p>
                          <p className="text-xl font-black text-white">+{activeVideo.xp_reward} XP ELITE</p>
                        </div>
                    </Card>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grade de Módulos - Otimizado para Mobile */}
        <section className="space-y-16 md:space-y-24">
           {Object.entries(modules).map(([modName, modTrainings]) => (
              <div key={modName} className="space-y-8 md:space-y-12">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-6 md:pb-8 gap-6">
                    <div className="flex items-center gap-4 md:gap-6">
                       <div className="h-10 w-10 md:h-14 md:w-14 rounded-2xl md:rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                          <BookOpen className="text-primary w-5 h-5 md:w-7 md:h-7" />
                       </div>
                       <div>
                          <h2 className="text-2xl md:text-5xl font-black text-white uppercase tracking-tighter italic">{modName}</h2>
                          <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{modTrainings.length} SESSÕES DISPONÍVEIS</span>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="text-right">
                          <div className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Seu Progresso</div>
                          <div className="text-sm md:text-lg font-black text-primary">
                            {modTrainings.length > 0 ? Math.round((modTrainings.filter(t => completedLessons.includes(t.id)).length / modTrainings.length) * 100) : 0}%
                          </div>
                       </div>
                       <Progress value={modTrainings.length > 0 ? (modTrainings.filter(t => completedLessons.includes(t.id)).length / modTrainings.length) * 100 : 0} className="w-24 md:w-32 h-1.5 md:h-2 bg-white/5" />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-10">
                    {modTrainings.map((t) => (
                       <motion.div key={t.id} variants={item} layout>
                          <Card 
                             onClick={() => handleStartLesson(t)}
                             className="bg-[#1A1A1A] border border-white/5 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden group cursor-pointer hover:border-primary/40 hover:-translate-y-2 transition-all duration-500 relative"
                          >
                             <div className="relative h-48 md:h-64 bg-[#0F0F0F] overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] to-transparent z-10" />
                                <img src={`https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop`} className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700" />
                                
                                <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-primary text-background flex items-center justify-center shadow-[0_0_50px_rgba(93,214,44,0.4)]">
                                      <Play size={24} className="ml-1 fill-current" />
                                   </div>
                                </div>

                                {completedLessons.includes(t.id!) && (
                                  <div className="absolute top-4 left-4 md:top-6 md:left-6 z-30 bg-primary rounded-full p-1.5 md:p-2 shadow-2xl">
                                     <CheckCircle2 size={12} className="text-background" />
                                  </div>
                                )}
                                <Badge className="absolute top-4 right-4 md:top-6 md:right-6 z-30 bg-black/80 backdrop-blur-xl border-none text-[8px] md:text-[10px] font-black px-3 md:px-4">{t.duration || "15:00"}</Badge>
                             </div>

                             <CardContent className="p-6 md:p-8 space-y-4 md:space-y-6">
                                <div className="flex justify-between items-center">
                                   <Badge className="bg-primary/10 text-primary border border-primary/20 text-[7px] md:text-[8px] font-black uppercase tracking-widest px-2 md:px-3">{t.category}</Badge>
                                   <div className="flex items-center gap-1.5 text-primary">
                                      <Trophy size={12} className="fill-primary" />
                                      <span className="text-[8px] md:text-[10px] font-black">+{t.xp_reward} XP</span>
                                   </div>
                                </div>
                                <h3 className="text-lg md:text-xl font-black text-white leading-tight uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-2 italic">{t.title}</h3>
                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                   <div className="flex flex-col">
                                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Nível: {t.min_level_required}</span>
                                      {lastPositions[t.id] && !completedLessons.includes(t.id) && (
                                        <span className="text-[7px] text-primary font-bold uppercase animate-pulse">Continuar Aula</span>
                                      )}
                                   </div>
                                   <ChevronRight size={16} className="text-slate-700 group-hover:text-primary transition-colors" />
                                </div>
                             </CardContent>
                          </Card>
                       </motion.div>
                    ))}
                 </div>
              </div>
           ))}
        </section>
      </motion.div>
    </div>
  );
}
