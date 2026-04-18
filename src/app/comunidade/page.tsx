"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { 
  Trophy, 
  Flame, 
  Star, 
  MessageSquare, 
  Zap, 
  TrendingUp,
  Crown,
  Medal,
  Award
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { gamificationService, CommunityPost } from "@/lib/gamification";
import { useAuth } from "@/hooks/useAuth";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function CommunityPage() {
  const { user } = useAuth();
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Consultor";
  const [feed, setFeed] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();

    // Set up Realtime Subscriptions
    const postsChannel = supabase
      .channel('public:community_posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' }, (payload) => {
        setFeed(prev => [payload.new, ...prev.slice(0, 9)]);
      })
      .subscribe();

    const leaderboardChannel = supabase
      .channel('public:leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, (payload) => {
        // Refresh leaderboard when any change happens
        fetchLeaderboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(leaderboardChannel);
    };
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const posts = await gamificationService.getRecentPosts();
      setFeed(posts || []);
      await fetchLeaderboard();
    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const board = await gamificationService.getLeaderboard();
      setLeaderboard(board || []);
      
      const currentUserEntry = board?.find((u: { user_id: string }) => u.user_id === user?.id) || board?.[0];
      setCurrentUserRank(currentUserEntry);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return "Agora";
    if (diffInMinutes < 60) return `${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-[#F8F8F8]">
      <Header title="Comunidade & Ranking" />
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="flex-1 p-8 space-y-10 pb-32"
      >
        {/* Global Level Progress */}
        <motion.section variants={item}>
          <Card className="bg-[#202020] border-none card-morph p-8 relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 opacity-5 group-hover:rotate-12 transition-transform">
              <Trophy size={180} />
            </div>
            <div className="flex items-center gap-6 relative z-10">
              <div className="h-20 w-20 rounded-[2rem] bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(93,214,44,0.4)]">
                <span className="text-3xl font-black text-background">
                  {currentUserRank?.level || 1}
                </span>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-slate-400 font-black uppercase text-xs tracking-widest">Nivel Atual</span>
                  <span className="text-primary font-black">
                    {currentUserRank?.total_points || 0} / {((currentUserRank?.level || 1) * 500)} XP
                  </span>
                </div>
                <div className="h-3 w-full bg-[#0F0F0F] rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentUserRank?.total_points % 500) / 500) * 100}%` }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
            </div>
          </Card>
        </motion.section>

        {/* Live Feed */}
        <motion.section variants={item} className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-2xl font-black tracking-tighter flex items-center gap-2">
              <Flame className="text-orange-500 fill-orange-500" size={24} /> Feed de Conquistas
            </h3>
            <Badge className="bg-orange-500/20 text-orange-500 border-none">AO VIVO</Badge>
          </div>

          <div className="space-y-4">
            {isLoading && <div className="text-center py-10 text-slate-500">Carregando feed...</div>}
            {!isLoading && feed.length === 0 && <div className="text-center py-10 text-slate-500">Nenhuma atividade recente.</div>}
            
            <AnimatePresence mode="popLayout">
              {feed.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <Card className="bg-[#1A1A1A] border-none card-morph p-6 group hover:bg-white/5 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                          post.type === 'sale' ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {post.type === 'sale' ? <Zap size={20} /> : <Star size={20} />}
                        </div>
                        <div>
                          <div className="font-black text-white">
                            <span className="text-primary">{post.user_name}</span> {post.content}
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {formatTime(post.created_at)}
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-white/5 text-slate-400 border-none font-black">+{post.points_earned} XP</Badge>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* Leaderboard Ranking */}
        <motion.section variants={item} className="space-y-6">
          <h3 className="text-2xl font-black tracking-tighter px-2 flex items-center gap-2">
            <Crown className="text-yellow-500 fill-yellow-500" size={24} /> Top Consultores
          </h3>
          
          <div className="bg-[#202020] rounded-[2.5rem] p-4 border border-white/5">
            {leaderboard.length === 0 && <div className="text-center py-10 text-slate-500">Nenhum consultor no ranking ainda.</div>}
            
            {leaderboard.map((entry, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-6 rounded-3xl ${
                  entry.user_id === currentUserRank?.user_id ? 'bg-primary/5 border border-primary/20 shadow-[0_0_20px_rgba(93,214,44,0.05)]' : ''
                }`}
              >
                <div className="flex items-center gap-6">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black ${
                    i === 0 ? 'bg-yellow-500 text-background' :
                    i === 1 ? 'bg-slate-300 text-background' :
                    i === 2 ? 'bg-orange-600 text-white' : 'text-slate-500'
                  }`}>
                    {i === 0 ? <Crown size={16} /> : i + 1}
                  </div>
                  <div>
                    <div className="font-black text-white text-lg leading-none">{entry.user_name}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">Nivel {entry.level_number ?? entry.level}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-white tracking-tighter">{entry.total_points} pts</div>
                  <div className="text-[10px] font-black uppercase flex items-center justify-end gap-1 text-primary">
                    <TrendingUp size={10} /> Subindo
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Call to Action */}
        <motion.div variants={item}>
          <Button className="btn-primary w-full gap-4 h-16 text-lg" onClick={() => {
            if (!user) return;
            gamificationService.recordAction(
              user.id,
              displayName,
              "tip",
              "postou uma dica sobre retenção de clientes!",
              20
            );
          }}>
            <MessageSquare size={24} /> COMPARTILHAR DICA (+20 XP)
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
