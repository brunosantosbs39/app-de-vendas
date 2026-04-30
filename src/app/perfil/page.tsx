"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { 
  UserCircle, 
  Camera, 
  Globe, 
  MessageCircle, 
  Save, 
  Loader2,
  Trophy,
  ShieldCheck,
  MapPin,
  Smartphone,
  Award,
  Zap,
  Star
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function ProfilePage() {
  const { user } = useAuth();
  const { profile, loading, updateProfile, uploadAvatar } = useProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [achievements, setAchievements] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    user_name: "",
    full_name: "",
    bio: "",
    whatsapp: "",
    instagram: "",
    default_billing_message: ""
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        user_name: profile.user_name || "",
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        whatsapp: profile.whatsapp || "",
        instagram: profile.instagram || "",
        default_billing_message: profile.default_billing_message || ""
      });
      fetchAchievements();
    }
  }, [profile]);

  const fetchAchievements = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', user.id);
    if (data) setAchievements(data);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F0F0F]">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const result = await updateProfile(formData);
    if (result?.success) {
      toast.success("Perfil atualizado com sucesso!");
    } else {
      toast.error("Erro ao atualizar perfil.");
    }
    setIsSaving(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const url = await uploadAvatar(file);
      if (url) {
        toast.success("Foto atualizada!");
      }
      setIsUploading(false);
    }
  };

  const handleAddTag = (tag: string) => {
    const textarea = document.getElementById('billing-message-input') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.default_billing_message;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newText = before + tag + after;
    setFormData({ ...formData, default_billing_message: newText });
    
    // Devolve o foco ao textarea após um pequeno delay
    setTimeout(() => {
      textarea.focus();
      const newPos = start + tag.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-[#F8F8F8]">
      <Header title="Meu Perfil" />
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="flex-1 px-4 sm:px-6 md:px-12 pt-6 md:pt-10 pb-40 space-y-12 max-w-4xl mx-auto w-full"
      >
        {/* Header de Perfil */}
        <motion.section variants={item} className="relative group">
           <Card className="bg-[#1A1A1A] border border-white/5 rounded-[3rem] p-10 overflow-hidden relative shadow-3xl">
              <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                 <div className="relative">
                    <Avatar className="h-40 w-40 border-4 border-primary/20 p-1.5 shadow-2xl">
                       <AvatarImage src={profile?.avatar_url} />
                       <AvatarFallback className="bg-slate-800 text-5xl font-black text-primary">{profile?.user_name?.[0] || user?.email?.[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 h-12 w-12 bg-primary text-background rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer"
                      disabled={isUploading}
                    >
                       {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
                 </div>
                 
                 <div className="text-center md:text-left space-y-4">
                    <div className="flex items-center justify-center md:justify-start gap-4">
                       <h1 className="text-4xl font-black tracking-tighter uppercase italic">{profile?.user_name || "Agente Elite"}</h1>
                       <ShieldCheck className="text-primary w-8 h-8" />
                    </div>
                    <Badge className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 font-black uppercase text-[10px] tracking-widest">
                       {profile?.role === 'expert' ? 'Expert Master' : 'Agente Autoridade'}
                    </Badge>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-slate-500 font-bold text-xs uppercase tracking-widest pt-2">
                       <div className="flex items-center gap-2"><MapPin size={14} className="text-primary" /> Brasil</div>
                       <div className="flex items-center gap-2"><Trophy size={14} className="text-primary" /> Level 12</div>
                    </div>
                 </div>
              </div>
              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-primary/5 blur-[100px] rounded-full" />
           </Card>
        </motion.section>

        {/* Galeria de Troféus (Conquistas) */}
        <motion.section variants={item} className="space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 italic flex items-center gap-2">
                <Award size={14} className="text-primary" /> Troféus de Elite
              </h3>
              <Badge className="bg-white/5 text-slate-400 border-none text-[8px] font-black">{achievements.length} CONQUISTAS</Badge>
           </div>
           
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {achievements.length > 0 ? achievements.map((ach) => (
                <Card key={ach.id} className="bg-[#1A1A1A] border border-primary/20 p-6 rounded-3xl flex flex-col items-center text-center gap-3 group hover:scale-105 transition-all shadow-lg shadow-primary/5">
                   <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-background transition-all">
                      <Star size={32} strokeWidth={3} className="fill-current" />
                   </div>
                   <div className="space-y-1">
                      <div className="text-[9px] font-black text-white uppercase tracking-tighter">{ach.title}</div>
                      <div className="text-[7px] font-bold text-slate-600 uppercase tracking-widest italic">DESBLOQUEADO</div>
                   </div>
                </Card>
              )) : (
                <div className="col-span-full py-10 bg-white/[0.02] border border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center opacity-30">
                   <Zap size={32} className="mb-3" />
                   <p className="font-black uppercase text-[10px] tracking-widest">Complete missões para ganhar troféus</p>
                </div>
              )}
           </div>
        </motion.section>

        {/* Formulário de Edição */}
        <motion.section variants={item}>
           <form onSubmit={handleSave} className="space-y-8">
              <Card className="bg-[#1A1A1A] border border-white/5 rounded-[3rem] p-10 shadow-2xl">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                       <Label className="text-[10px] font-black text-slate-600 uppercase ml-4 tracking-[0.4em]">Nome de Exibição</Label>
                       <Input 
                        value={formData.user_name} 
                        onChange={e => setFormData({...formData, user_name: e.target.value})}
                        className="bg-white/5 border-none h-16 rounded-2xl font-black italic px-6 focus-visible:ring-primary" 
                        placeholder="Como quer ser chamado?"
                       />
                    </div>
                    <div className="space-y-4">
                       <Label className="text-[10px] font-black text-slate-600 uppercase ml-4 tracking-[0.4em]">Nome Completo</Label>
                       <Input 
                        value={formData.full_name} 
                        onChange={e => setFormData({...formData, full_name: e.target.value})}
                        className="bg-white/5 border-none h-16 rounded-2xl font-black px-6 focus-visible:ring-primary" 
                       />
                    </div>
                    <div className="md:col-span-2 space-y-4">
                       <Label className="text-[10px] font-black text-slate-600 uppercase ml-4 tracking-[0.4em]">Bio Profissional</Label>
                       <Textarea 
                        value={formData.bio} 
                        onChange={e => setFormData({...formData, bio: e.target.value})}
                        className="bg-white/5 border-none min-h-[120px] rounded-3xl p-6 font-medium text-slate-300 focus-visible:ring-primary resize-none" 
                        placeholder="Conte sua trajetória de sucesso..."
                       />
                    </div>
                 </div>
              </Card>

              {/* Redes Sociais */}
              <Card className="bg-[#1A1A1A] border border-white/5 rounded-[3rem] p-10 shadow-2xl">
                 <h3 className="text-[10px] font-black uppercase text-slate-500 mb-8 tracking-[0.3em]">Conexões e Redes</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                       <div className="flex items-center gap-3 ml-4 mb-2">
                          <Globe size={18} className="text-primary" />
                          <Label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Instagram</Label>
                       </div>
                       <Input 
                        value={formData.instagram} 
                        onChange={e => setFormData({...formData, instagram: e.target.value})}
                        className="bg-white/5 border-none h-16 rounded-2xl font-black px-6 focus-visible:ring-primary" 
                        placeholder="@seuusuario"
                       />
                    </div>
                    <div className="space-y-4">
                       <div className="flex items-center gap-3 ml-4 mb-2">
                          <Smartphone size={18} className="text-primary" />
                          <Label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">WhatsApp</Label>
                       </div>
                       <Input 
                        value={formData.whatsapp} 
                        onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                        className="bg-white/5 border-none h-16 rounded-2xl font-black px-6 focus-visible:ring-primary" 
                        placeholder="(00) 00000-0000"
                       />
                    </div>
                 </div>
              </Card>

              {/* MENSAGEM PREDEFINIDA DE COBRANÇA */}
              <Card className="bg-[#1A1A1A] border border-secondary/20 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-5">
                    <MessageCircle size={120} />
                 </div>
                 <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                          <Zap size={20} />
                       </div>
                       <div>
                          <h3 className="text-sm font-black uppercase italic tracking-tighter text-white">Mensagem de Cobrança Elite</h3>
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">Automatize seus lembretes de pagamento</p>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <Label className="text-[10px] font-black text-slate-600 uppercase ml-4 tracking-[0.4em]">Texto do WhatsApp</Label>
                       <Textarea 
                        id="billing-message-input"
                        value={formData.default_billing_message} 
                        onChange={e => setFormData({...formData, default_billing_message: e.target.value})}
                        className="bg-white/5 border-none min-h-[150px] rounded-3xl p-6 font-medium text-slate-300 focus-visible:ring-secondary resize-none" 
                        placeholder="Ex: Olá {cliente}, tudo bem? Passando para lembrar da sua parcela de {valor} que vence hoje. Podemos confirmar o recebimento?"
                       />
                       <div className="flex flex-wrap gap-2 px-2">
                          <span className="text-[8px] font-black bg-white/5 text-slate-500 px-2 py-1 rounded-md">TAGS CLICÁVEIS:</span>
                          <button type="button" onClick={() => handleAddTag('{cliente}')} className="text-[8px] font-black bg-secondary/10 text-secondary px-2 py-1 rounded-md hover:bg-secondary/20 transition-colors">{"{cliente}"}</button>
                          <button type="button" onClick={() => handleAddTag('{produto}')} className="text-[8px] font-black bg-secondary/10 text-secondary px-2 py-1 rounded-md hover:bg-secondary/20 transition-colors">{"{produto}"}</button>
                          <button type="button" onClick={() => handleAddTag('{valor}')} className="text-[8px] font-black bg-secondary/10 text-secondary px-2 py-1 rounded-md hover:bg-secondary/20 transition-colors">{"{valor}"}</button>
                          <button type="button" onClick={() => handleAddTag('{vencimento}')} className="text-[8px] font-black bg-secondary/10 text-secondary px-2 py-1 rounded-md hover:bg-secondary/20 transition-colors">{"{vencimento}"}</button>
                       </div>
                    </div>
                 </div>
              </Card>

              <Button type="submit" disabled={isSaving} className="w-full h-20 bg-primary text-background font-black uppercase text-sm rounded-[2rem] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all gap-4">
                 {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />} SALVAR ALTERAÇÕES DE ELITE
              </Button>
           </form>
        </motion.section>
      </motion.div>
    </div>
  );
}
