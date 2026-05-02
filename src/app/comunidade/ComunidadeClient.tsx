"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, 
  Heart, 
  Plus, 
  Users, 
  Globe,
  Zap,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function CommunityPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { user } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'feed' | 'tribes' | 'directs'>('feed');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false });
      setPosts(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // --- EARLY RETURN APÓS TODOS OS HOOKS ---
  if (!mounted) return <div className="min-h-screen bg-[#0F0F0F]" />;

  return (
    <div className="flex min-h-screen flex-col bg-[#071006] text-[#F8F8F8]">
      <div className="border-b border-primary/10 bg-[#0F0F0F]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Comunidade</p>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Diamante</h2>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-300 hover:bg-white/10">
              <MessageSquare size={20} />
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-300 hover:bg-white/10">
              <Globe size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-36 pt-8">
        <div className="flex gap-5 overflow-x-auto pb-8">
          <button className="flex shrink-0 flex-col items-center gap-3">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-primary/40 bg-white/5 text-primary">
              <Plus size={28} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Você</span>
          </button>
          {[user?.email?.[0] || "E", "C", "B"].map((letter, index) => (
            <button key={index} className="flex shrink-0 flex-col items-center gap-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary bg-slate-800 text-lg font-black text-white shadow-[0_0_24px_rgba(93,214,44,.25)]">
                {letter.toUpperCase()}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Diamante</span>
            </button>
          ))}
        </div>

        <div className="mb-8 flex gap-3 overflow-x-auto">
          {["Diamante", "Vendas", "Metas", "Dicas"].map((tab, index) => (
            <button key={tab} className={`flex h-11 shrink-0 items-center gap-2 rounded-full border px-6 text-[10px] font-black uppercase tracking-widest ${index === 0 ? "border-primary bg-primary text-background" : "border-white/10 bg-white/5 text-slate-400"}`}>
              <Users size={14} /> {tab}
            </button>
          ))}
        </div>

        {posts.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
            <Sparkles size={68} className="text-white/20" />
            <h3 className="mt-6 text-xl font-black uppercase tracking-[0.25em] text-slate-700">Inicie a conversa nesta tribo</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {posts.map(post => (
               <Card key={post.id} className="bg-[#1A1A1A] border-none p-6 rounded-[2rem]">
                  <div className="flex items-center gap-4 mb-4">
                     <Avatar className="h-10 w-10 border border-white/10">
                        <AvatarImage src={post.avatar_url} />
                        <AvatarFallback>{post.user_name?.[0]}</AvatarFallback>
                     </Avatar>
                     <div>
                        <div className="font-black text-white text-sm">{post.user_name}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Membro Elite</div>
                     </div>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed mb-6">{post.content}</p>
                  <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                     <button className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors">
                        <Heart size={18} /> <span className="text-[10px] font-black">{post.likes_count || 0}</span>
                     </button>
                     <button className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors">
                        <MessageSquare size={18} /> <span className="text-[10px] font-black">{post.comments_count || 0}</span>
                     </button>
                  </div>
               </Card>
            ))}
          </div>
        )}

        <button className="fixed bottom-32 right-8 z-[90] flex h-20 w-20 items-center justify-center rounded-[2rem] bg-primary text-background shadow-[0_0_40px_rgba(93,214,44,.35)] transition-transform hover:scale-105">
          <Plus size={36} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
