"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  UserCircle, 
  Loader2,
  MessageSquare,
  Save,
  User,
  Info,
  Search,
  Bell,
  Zap,
  Camera,
  AtSign
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";
import { NoSSR } from "@/components/layout/NoSSR";
import { toast } from "sonner";

function PerfilContent() {
  const { profile, loading, updateProfile, uploadAvatar } = useProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    user_name: "",
    bio: "",
    default_billing_message: ""
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        user_name: profile.user_name || "",
        bio: profile.bio || "",
        default_billing_message: profile.default_billing_message || "Olá {cliente}, tudo bem? Estou passando para lembrar do seu acerto de {valor} que vence hoje. Como prefere pagar?"
      });
    }
  }, [profile]);

  const insertTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      default_billing_message: prev.default_billing_message + tag
    }));
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const url = await uploadAvatar(file);
    setIsUploading(false);

    if (url) {
      toast.success("Foto de perfil atualizada!");
    } else {
      toast.error("Erro ao fazer upload da foto.");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateProfile(formData);
    setIsSaving(false);
    if (result?.success) toast.success("Configurações salvas!");
  };

  if (loading) return <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-[#F8F8F8]">
      <header className="fixed top-0 left-0 right-0 h-20 flex items-center justify-between px-6 bg-[#0F0F0F] z-50">
        <div className="flex items-center gap-4">
           <Sidebar />
           <h1 className="text-xl font-black tracking-tighter uppercase italic">Meu Perfil</h1>
        </div>
        <div className="flex items-center gap-4">
           <button className="text-slate-400"><Search size={24} /></button>
           <button className="text-slate-400 relative">
              <Bell size={24} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
           </button>
        </div>
      </header>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 px-4 pt-24 pb-44 space-y-8 max-w-lg mx-auto w-full">
         
         {/* SEÇÃO 1: PERFIL PÚBLICO (FOTO E INFO) */}
         <Card className="bg-[#111111] border-none p-8 rounded-[2.5rem] flex flex-col items-center gap-8 shadow-xl">
            <div className="relative group">
              <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-[0_0_40px_rgba(93,214,44,0.1)]">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-slate-800 text-4xl font-black text-white">
                  {profile?.full_name?.[0] || profile?.user_name?.[0] || <User size={40} />}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-1 right-1 h-10 w-10 bg-primary text-background rounded-full flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-lg">
                {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={isUploading} />
              </label>
            </div>

            <div className="w-full space-y-5">
               <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Identidade Elite</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <Input 
                      value={formData.full_name}
                      onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="h-14 pl-12 rounded-2xl border-white/5 bg-white/5 font-bold focus:border-primary/50 transition-all" 
                      placeholder="Nome Completo"
                    />
                  </div>
               </div>

               <div className="space-y-1.5">
                  <div className="relative">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <Input 
                      value={formData.user_name}
                      onChange={e => setFormData(prev => ({ ...prev, user_name: e.target.value }))}
                      className="h-14 pl-12 rounded-2xl border-white/5 bg-white/5 font-bold focus:border-primary/50 transition-all" 
                      placeholder="Nome de Usuário"
                    />
                  </div>
               </div>

               <div className="space-y-1.5">
                  <Textarea 
                    value={formData.bio}
                    onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    className="min-h-[80px] rounded-2xl border-white/5 bg-white/5 font-medium resize-none p-4 focus:border-primary/50 transition-all" 
                    placeholder="Sua bio para a comunidade..."
                  />
               </div>
            </div>
         </Card>

         {/* SEÇÃO 2: MENSAGEM DE COBRANÇA */}
         <Card className="bg-[#111111] border-none p-8 rounded-[2.5rem] relative overflow-hidden">
            <div className="absolute top-8 left-8">
               <Zap className="text-primary" size={24} fill="currentColor" />
            </div>
            <div className="pl-10 space-y-1">
               <h2 className="text-lg font-black uppercase italic leading-none tracking-tight">Mensagem de Cobrança Elite</h2>
               <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Automatize seus lembretes de pagamento</p>
            </div>

            <div className="mt-10 space-y-4">
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-center text-white">Texto do WhatsApp</p>
               
               <div className="relative">
                  <div className="absolute -right-2 top-4 w-4 h-4 bg-primary/10 border-r border-t border-primary/20 rotate-45 z-0" />
                  <Textarea 
                    value={formData.default_billing_message}
                    onChange={e => setFormData(prev => ({ ...prev, default_billing_message: e.target.value }))}
                    className="min-h-[200px] rounded-[2rem] border-2 border-primary/30 bg-primary/5 text-sm font-bold leading-relaxed resize-none p-6 relative z-10 focus:border-primary transition-colors"
                    placeholder="Escreva sua mensagem..."
                  />
               </div>

               <div className="space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Tags Clicáveis:</p>
                  <div className="flex flex-wrap gap-2">
                     {['{cliente}', '{produto}', '{valor}', '{vencimento}'].map(tag => (
                        <button 
                          key={tag}
                          onClick={() => insertTag(tag)}
                          className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-primary hover:bg-primary/10 transition-colors"
                        >
                          {tag}
                        </button>
                     ))}
                  </div>
               </div>
            </div>
         </Card>

         <div className="px-2">
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full h-16 rounded-2xl bg-primary text-background font-black uppercase text-xs tracking-widest shadow-[0_10px_30px_rgba(93,214,44,0.2)]"
            >
              {isSaving ? <Loader2 className="animate-spin" /> : "Salvar Arsenal"}
            </Button>
         </div>
      </motion.div>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <NoSSR fallback={<div className="min-h-screen bg-[#0F0F0F]" />}>
      <PerfilContent />
    </NoSSR>
  );
}
