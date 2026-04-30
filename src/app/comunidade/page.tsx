"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, 
  Heart, 
  Share2, 
  Plus, 
  Users, 
  MoreHorizontal,
  X,
  Camera,
  Globe,
  MapPin,
  BarChart2,
  Sparkles,
  Bell,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Search,
  Lock,
  ChevronRight,
  UserPlus,
  Send,
  MessageCircle,
  User,
  Trash2,
  Flag,
  UserCheck,
  ImageIcon,
  Phone,
  Video,
  Info,
  MoreVertical
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const { user } = useAuth();
  const router = useRouter();
  
  // States
  const [activeTab, setActiveTab] = useState<'feed' | 'tribes' | 'directs'>('feed');
  const [selectedTribe, setSelectedTribe] = useState<any>(null);
  const [tribes, setTribes] = useState<any[]>([]);
  const [myTribes, setMyTribes] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateTribe, setShowCreateTribe] = useState(false);
  const [showPostOptions, setShowPostOptions] = useState<any>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  
  // Social States
  const [activePostForComments, setActivePostForComments] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [showShareModal, setShowShareModal] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [showTribeChat, setShowTribeChat] = useState(false);
  const [quickMessages, setQuickMessages] = useState<Record<string, string>>({});
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [storyContent, setStoryContent] = useState("");
  const [storyImage, setStoryImage] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState<string | null>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [activeStoryGroup, setActiveStoryGroup] = useState<any>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  
  // Form States
  const [postContent, setPostContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [newTribe, setNewTribe] = useState({ name: "", description: "", is_private: false });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyFileInputRef = useRef<HTMLInputElement>(null);

  const fetchStories = async () => {
    try {
      const { data } = await supabase
        .from("community_stories")
        .select("*")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });
      
      if (data) {
        // Agrupar stories por usuário
        const groups: Record<string, any> = {};
        data.forEach(s => {
          if (!groups[s.user_id]) {
            groups[s.user_id] = {
              user_id: s.user_id,
              user_name: s.user_name,
              avatar_url: s.avatar_url,
              items: []
            };
          }
          groups[s.user_id].items.push(s);
        });
        setStories(Object.values(groups));
      }
    } catch (e) { console.error(e); }
  };

  const handleStoryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStoryImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setStoryPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitStory = async () => {
    if (!user || (!storyContent.trim() && !storyImage)) {
      toast.error("Escreva um aviso ou escolha uma imagem.");
      return;
    }

    setLoading(true);
    try {
      let imageUrl = null;
      if (storyImage) {
        const fileExt = storyImage.name.split('.').pop();
        const fileName = `story-${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('community')
          .upload(fileName, storyImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('community')
          .getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      const { error: insertError } = await supabase
        .from("community_stories")
        .insert([{
          user_id: user.id,
          user_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Elite",
          avatar_url: user.user_metadata?.avatar_url,
          image_url: imageUrl,
          content: storyContent // Texto do aviso
        }]);

      if (insertError) throw insertError;
      
      toast.success("Story publicado! ✨");
      setStoryContent("");
      setStoryImage(null);
      setStoryPreview(null);
      setShowCreateStory(false);
      fetchStories();
    } catch (error: any) {
      console.error("Erro ao criar story:", error);
      toast.error("Erro ao publicar story.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStory = () => {
    setShowCreateStory(true);
  };

  const handleNextStory = () => {
    if (!activeStoryGroup) return;
    
    if (activeStoryIndex < activeStoryGroup.items.length - 1) {
      setActiveStoryIndex(prev => prev + 1);
    } else {
      const currentIndex = stories.findIndex(g => g.user_id === activeStoryGroup.user_id);
      if (currentIndex < stories.length - 1) {
        setActiveStoryGroup(stories[currentIndex + 1]);
        setActiveStoryIndex(0);
      } else {
        setActiveStoryGroup(stories[0]);
        setActiveStoryIndex(0);
      }
    }
  };

  const handlePrevStory = () => {
    if (!activeStoryGroup) return;
    
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(prev => prev - 1);
    } else {
      const currentIndex = stories.findIndex(g => g.user_id === activeStoryGroup.user_id);
      if (currentIndex > 0) {
        const prevGroup = stories[currentIndex - 1];
        setActiveStoryGroup(prevGroup);
        setActiveStoryIndex(prevGroup.items.length - 1);
      }
    }
  };

  useEffect(() => {
    let timer: any;
    if (activeStoryGroup) {
      timer = setTimeout(() => {
        handleNextStory();
      }, 5000); // 5 segundos por story
    }
    return () => clearTimeout(timer);
  }, [activeStoryGroup, activeStoryIndex]);

  useEffect(() => {
    if (user) {
      fetchTribes();
      fetchConversations();
      fetchUsers();
      fetchStories();
      
      // Atualizar stories a cada 5 minutos para garantir expiração de 24h em tempo real
      const storiesInterval = setInterval(fetchStories, 5 * 60 * 1000);
      return () => clearInterval(storiesInterval);
    }
  }, [user]);

  useEffect(() => {
    fetchPosts();
  }, [selectedTribe]);

  useEffect(() => {
    if (activePostForComments) {
      fetchComments(activePostForComments.id);
    }
  }, [activePostForComments]);

  useEffect(() => {
    if (activeChat) {
      fetchChatMessages(activeChat.id);
    }
  }, [activeChat]);

  const fetchTribes = async () => {
    try {
      const { data: allTribes } = await supabase.from("communities").select("*").order("created_at", { ascending: false });
      setTribes(allTribes || []);

      const { data: memberships } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", user?.id);
      
      const myTribeIds = memberships?.map(m => m.community_id) || [];
      const myTribesData = allTribes?.filter(t => myTribeIds.includes(t.id)) || [];
      setMyTribes(myTribesData);

      if (!selectedTribe && myTribesData.length > 0) {
        setSelectedTribe(myTribesData[0]);
      } else if (!selectedTribe && allTribes && allTribes.length > 0) {
        setSelectedTribe(allTribes[0]);
      }
    } catch (e) { console.error(e); }
  };

  const fetchPosts = async () => {
    if (!selectedTribe) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("community_posts")
        .select(`
          *,
          post_likes(user_id),
          post_comments(id)
        `)
        .eq("community_id", selectedTribe.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const formattedPosts = data?.map(p => ({
        ...p,
        likes: p.post_likes?.length || 0,
        comments: p.post_comments?.length || 0
      }));

      setPosts(formattedPosts || []);
    } catch (error) {
      console.error("Erro ao buscar posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async () => {
    if (!user || !selectedTribe) {
      toast.error("Erro: Usuário ou Tribo não selecionados.");
      return;
    }
    
    if (!postContent.trim() && !selectedImage) {
      toast.error("Escreva algo ou selecione uma foto para publicar.");
      return;
    }

    setLoading(true);
    try {
      let imageUrl = null;
      if (selectedImage) {
        try {
          const fileExt = selectedImage.name.split('.').pop();
          const fileName = `${user.id}-${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('community')
            .upload(fileName, selectedImage);

          if (uploadError) {
            console.error("Erro no upload da imagem:", uploadError);
            toast.info("Aviso: Não conseguimos carregar a foto, mas vamos tentar publicar seu texto.");
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('community')
              .getPublicUrl(fileName);
            imageUrl = publicUrl;
          }
        } catch (imgErr) {
          console.error("Falha crítica no storage:", imgErr);
        }
      }

      const { error } = await supabase
        .from("community_posts")
        .insert([
          {
            user_id: user.id,
            community_id: selectedTribe.id,
            user_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Membro Elite",
            content: postContent || "",
            image_url: imageUrl
          },
        ]);

      if (error) {
        console.error("Erro ao salvar post no banco:", error);
        throw error;
      }

      setPostContent("");
      setSelectedImage(null);
      setImagePreview(null);
      setShowCreatePost(false);
      await fetchPosts();
      toast.success("Publicado com sucesso! 🚀");
    } catch (error: any) {
      console.error("Erro geral na publicação:", error);
      toast.error("Erro ao publicar: " + (error.message || "Verifique sua conexão."));
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Excluir esta publicação permanentemente?")) return;
    try {
      await supabase.from("community_posts").delete().eq("id", postId);
      setShowPostOptions(null);
      fetchPosts();
    } catch (e) { console.error(e); }
  };

  const handleCreateTribe = async () => {
    if (!newTribe.name || !user) return;
    try {
      const { data: tribe, error } = await supabase
        .from("communities")
        .insert([{
          name: newTribe.name,
          description: newTribe.description,
          creator_id: user.id,
          is_private: newTribe.is_private
        }])
        .select().single();

      if (tribe) {
        await supabase.from("community_members").insert([{
          community_id: tribe.id,
          user_id: user.id,
          role: 'admin'
        }]);
        
        setShowCreateTribe(false);
        setNewTribe({ name: "", description: "", is_private: false });
        fetchTribes();
        setSelectedTribe(tribe);
      }
    } catch (e) { console.error(e); }
  };

  const handleJoinTribe = async (tribeId: string) => {
    if (!user) return;
    try {
      await supabase.from("community_members").insert([{
        community_id: tribeId,
        user_id: user.id
      }]);
      fetchTribes();
      toast.success("Bem-vindo à Tribo! 🚀");
    } catch (e) { console.error(e); }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    try {
      const { data: existing } = await supabase.from("post_likes").select("*").eq("post_id", postId).eq("user_id", user.id).single();
      
      if (existing) {
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("post_likes").insert([{ post_id: postId, user_id: user.id }]);
      }
      fetchPosts();
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await supabase.from("profiles").select("*").limit(50);
      setUsers(data || []);
    } catch (e) { console.error(e); }
  };

  const fetchConversations = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:profiles!sender_id(id, full_name, avatar_url),
          receiver:profiles!receiver_id(id, full_name, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      
      if (error) return;
      
      const convos: any[] = [];
      const seenIds = new Set();
      
      data?.forEach(msg => {
        const otherUser = msg.sender_id === user.id ? msg.receiver : msg.sender;
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

        if (otherUserId && !seenIds.has(otherUserId)) {
          seenIds.add(otherUserId);
          convos.push({
            id: otherUserId,
            user: otherUser || { id: otherUserId, full_name: "Usuário Elite", avatar_url: null },
            lastMessage: msg.content,
            created_at: msg.created_at
          });
        }
      });
      
      setConversations(convos);
    } catch (e) { console.error(e); }
  };

  const fetchChatMessages = async (otherUserId: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:profiles!sender_id(id, full_name, avatar_url)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      setChatMessages(data || []);
    } catch (e) { console.error(e); }
  };

  const handleSendMessage = async (recipientId?: string, text?: string) => {
    const finalRecipientId = recipientId || activeChat?.id;
    const finalText = text || messageText;

    if (!finalText.trim() || !user || !finalRecipientId) return;
    try {
      const { error } = await supabase.from("messages").insert([{
        sender_id: user.id,
        sender_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Elite",
        receiver_id: finalRecipientId,
        content: finalText
      }]);
      
      if (error) {
        toast.error(`Erro ao enviar: ${error.message}`);
        throw error;
      }
      
      if (!recipientId) setMessageText("");
      else setQuickMessages(prev => ({ ...prev, [recipientId]: "" }));

      if (activeChat?.id === finalRecipientId) fetchChatMessages(finalRecipientId);
      fetchConversations();
    } catch (e) { console.error(e); }
  };

  const handleOpenChatWithUser = (targetUser: any) => {
    setActiveChat(targetUser);
    setActiveTab('directs');
    setShowNewChatModal(false);
  };

  const handleSharePost = async (recipientId: string) => {
    if (!showShareModal || !user) return;
    
    try {
      const { error } = await supabase.from("messages").insert([{
        sender_id: user.id,
        sender_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Elite",
        receiver_id: recipientId,
        content: "Compartilhou um post",
        post_shared_id: showShareModal.id
      }]);
      
      if (error) {
        toast.error(`Erro ao compartilhar: ${error.message}`);
        return;
      }

      setShowShareModal(null);
      toast.success("Post compartilhado com sucesso! 🚀");
    } catch (e: any) { 
      console.error(e);
      toast.error("Erro inesperado ao compartilhar.");
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;
    try {
      const { data: existing } = await supabase.from("comment_likes").select("*").eq("comment_id", commentId).eq("user_id", user.id).single();
      
      if (existing) {
        await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id);
      } else {
        await supabase.from("comment_likes").insert([{ comment_id: commentId, user_id: user.id }]);
      }
      fetchComments(activePostForComments.id);
    } catch (e) { 
      console.error("Erro ao curtir comentário:", e);
      // Fallback visual se a tabela não existir
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, liked_by_me: !c.liked_by_me, likes_count: (c.likes_count || 0) + (c.liked_by_me ? -1 : 1) } : c));
    }
  };

  const handleReplyTo = (comment: any) => {
    setReplyingTo(comment);
    setCommentText(`@${comment.user_name.split(' ')[0]} `);
    commentInputRef.current?.focus();
  };

  const fetchComments = async (postId: string) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("post_comments")
        .select(`
          *,
          comment_likes(user_id)
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;

      const formattedComments = data?.map(c => ({
        ...c,
        likes_count: c.comment_likes?.length || 0,
        liked_by_me: c.comment_likes?.some((l: any) => l.user_id === user?.id)
      }));

      setComments(formattedComments || []);
    } catch (e) { 
      console.error(e);
      // Fallback se comment_likes não existir
      const { data } = await supabase.from("post_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
      setComments(data || []);
    }
    finally { setLoadingComments(false); }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !user || !activePostForComments) return;
    try {
      const { error } = await supabase.from("post_comments").insert([{
        post_id: activePostForComments.id,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Membro Elite",
        content: commentText,
        parent_id: replyingTo?.id || null
      }]);
      if (error) throw error;
      setCommentText("");
      setReplyingTo(null);
      fetchComments(activePostForComments.id);
      setPosts(posts.map(p => p.id === activePostForComments.id ? { ...p, comments: (p.comments || 0) + 1 } : p));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-[#0F0F0F] overflow-y-auto no-scrollbar pb-32 font-['Plus_Jakarta_Sans',_sans-serif]">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
      `}</style>

      {/* HEADER PREMIUM V2 */}
      <header className="sticky top-0 z-[100] bg-[#0F0F0F]/60 backdrop-blur-3xl border-b border-white/[0.03]">
        <div className="max-w-2xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button 
                onClick={() => router.push('/')}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all border border-white/[0.05] mr-2"
             >
                <ArrowLeft size={20} />
             </button>
             <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#5DD62C] to-[#337418] p-[1px] shadow-[0_0_20px_rgba(93,214,44,0.15)]">
                <div className="h-full w-full rounded-[calc(1rem-1px)] bg-[#0F0F0F] flex items-center justify-center text-[#5DD62C]">
                   <Users size={24} />
                </div>
             </div>
             <div>
                <span className="font-black text-[10px] uppercase tracking-[0.3em] text-[#5DD62C] block leading-none mb-1">Elite Network</span>
                <h1 className="text-lg font-black text-white uppercase italic tracking-tight">{activeTab === 'directs' ? 'Communications' : (selectedTribe?.name || 'Comunidade')}</h1>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('directs')} 
              className={cn(
                "h-12 w-12 flex items-center justify-center rounded-2xl transition-all duration-500 relative group",
                activeTab === 'directs' ? "bg-[#5DD62C] text-[#0E150B] shadow-[0_0_20px_rgba(93,214,44,0.3)]" : "bg-white/[0.03] text-slate-400 hover:bg-white/[0.08] hover:text-white"
              )}
            >
               <MessageCircle size={22} className="group-hover:scale-110 transition-transform" />
               {conversations.length > 0 && activeTab !== 'directs' && (
                 <span className="absolute -top-1 -right-1 h-4 w-4 bg-[#5DD62C] rounded-full border-[3px] border-[#0E150B] animate-pulse" />
               )}
            </button>
            <button onClick={() => setActiveTab(activeTab === 'feed' ? 'tribes' : 'feed')} className="h-12 w-12 flex items-center justify-center bg-white/[0.03] rounded-2xl hover:bg-white/[0.08] text-slate-400 hover:text-[#5DD62C] transition-all group">
               {activeTab === 'feed' ? <Globe size={22} className="group-hover:rotate-12 transition-transform" /> : <BarChart2 size={22} className="group-hover:scale-110 transition-transform" />}
            </button>
          </div>
        </div>
      </header>

      <motion.div variants={container} initial="hidden" animate="show" className="max-w-2xl mx-auto w-full px-4 space-y-6">
        
        {activeTab === 'tribes' ? (
          <section className="space-y-8">
             <div className="flex justify-between items-end px-2">
                <div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-[#5DD62C] mb-2 block">Explorar Ecossistema</span>
                   <h2 className="text-3xl font-black tracking-tighter uppercase italic text-white leading-none">Descobrir <span className="text-[#5DD62C] not-italic">Tribos</span></h2>
                </div>
                <Button onClick={() => setShowCreateTribe(true)} className="h-12 rounded-xl bg-white/[0.03] text-white border border-white/10 font-black text-[10px] uppercase tracking-widest hover:bg-[#5DD62C] hover:text-[#0E150B] transition-all">CRIAR TRIBO</Button>
             </div>

             <div className="grid grid-cols-1 gap-4">
                {tribes.map(tribe => {
                  const isMember = myTribes.some(mt => mt.id === tribe.id);
                  return (
                    <Card key={tribe.id} className="bg-[#1A2216]/40 backdrop-blur-md border border-white/[0.05] p-6 rounded-[2.5rem] flex items-center justify-between group hover:border-[#5DD62C]/30 transition-all duration-500 hover:translate-x-2">
                       <div className="flex items-center gap-5">
                          <div className="h-16 w-16 rounded-[1.5rem] bg-white/[0.03] flex items-center justify-center text-[#5DD62C] group-hover:bg-[#5DD62C]/10 transition-colors border border-white/[0.05]">
                             {tribe.is_private ? <Lock size={28} /> : <Users size={28} />}
                          </div>
                          <div>
                             <h4 className="font-black text-xl text-white uppercase tracking-tighter italic">{tribe.name}</h4>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{tribe.description || 'Comunidade Exclusiva'}</p>
                          </div>
                       </div>
                       
                       {isMember ? (
                         <Button onClick={() => { setSelectedTribe(tribe); setActiveTab('feed'); }} variant="ghost" className="h-14 w-14 rounded-full bg-[#5DD62C] text-[#0E150B] shadow-[0_10px_20px_rgba(93,214,44,0.3)] hover:scale-105 transition-all"><ChevronRight size={24} /></Button>
                       ) : (
                         <Button onClick={() => handleJoinTribe(tribe.id)} className="h-14 px-8 rounded-2xl bg-white/[0.03] text-white font-black uppercase text-[10px] tracking-widest hover:bg-[#5DD62C] hover:text-[#0E150B] transition-all border border-white/[0.05]">Acessar</Button>
                       )}
                    </Card>
                  );
                })}
             </div>
          </section>
        ) : activeTab === 'directs' ? (
          <section className="space-y-8">
             <div className="flex justify-between items-end px-2">
                <div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-[#5DD62C] mb-2 block">Direct Messages</span>
                   <h2 className="text-3xl font-black tracking-tighter uppercase italic text-white leading-none">Comunicações <span className="text-[#5DD62C] not-italic">Elite</span></h2>
                </div>
                <Button onClick={() => setShowNewChatModal(true)} className="h-14 w-14 rounded-2xl bg-[#5DD62C] text-[#0E150B] p-0 shadow-[0_10px_20px_rgba(93,214,44,0.2)] hover:scale-105 transition-all"><Plus size={28} /></Button>
             </div>

             {/* PINNED CONVERSATIONS - PREMIUM HORIZONTAL SCROLL */}
             <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Contatos Prioritários</h3>
                   <div className="h-[1px] flex-1 mx-4 bg-white/[0.03]" />
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 pb-4">
                   {conversations.slice(0, 5).map((convo) => (
                     <div 
                        key={convo.id}
                        onClick={() => setActiveChat(convo.user)}
                        className="flex-shrink-0 w-32 group cursor-pointer"
                     >
                        <div className="relative mb-3">
                           <div className="absolute -inset-1 bg-gradient-to-tr from-[#5DD62C] to-emerald-500 rounded-[2rem] blur opacity-0 group-hover:opacity-20 transition-opacity" />
                           <div className="relative aspect-square rounded-[2rem] bg-[#1A2216] border border-white/[0.05] p-1 overflow-hidden group-hover:border-[#5DD62C]/40 transition-all">
                              <Avatar className="h-full w-full rounded-[1.8rem]">
                                 <AvatarImage src={convo.user.avatar_url} className="object-cover" />
                                 <AvatarFallback className="bg-slate-800 text-white font-black text-xl">{convo.user.full_name?.[0]}</AvatarFallback>
                              </Avatar>
                              <div className="absolute bottom-2 right-2 h-4 w-4 bg-[#5DD62C] rounded-full border-[3px] border-[#1A2216] shadow-lg" />
                           </div>
                        </div>
                        <h4 className="font-black text-[10px] text-white uppercase italic text-center truncate px-1">{convo.user.full_name?.split(' ')[0]}</h4>
                     </div>
                   ))}
                </div>
             </div>

             {/* ALL MESSAGES - REFINED LIST */}
             <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recentes</h3>
                   <div className="h-[1px] flex-1 mx-4 bg-white/[0.03]" />
                </div>
                <div className="space-y-3">
                   {conversations.length > 0 ? conversations.map(convo => (
                     <Card 
                       key={convo.id} 
                       onClick={() => setActiveChat(convo.user)}
                       className="bg-[#1A2216]/40 backdrop-blur-md border border-white/[0.03] p-5 rounded-[2rem] flex items-center gap-5 cursor-pointer hover:bg-white/[0.02] hover:border-[#5DD62C]/20 transition-all group"
                     >
                        <div className="relative">
                           <Avatar className="h-16 w-16 rounded-2xl border border-white/[0.05]">
                              <AvatarImage src={convo.user.avatar_url} className="object-cover" />
                              <AvatarFallback className="bg-slate-800 text-white font-black text-lg">{convo.user.full_name?.[0]}</AvatarFallback>
                           </Avatar>
                           <span className="absolute -bottom-1 -right-1 h-5 w-5 bg-[#5DD62C] rounded-full border-[4px] border-[#1A2216]" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-center mb-1">
                              <h4 className="font-black text-sm text-white uppercase italic truncate tracking-tight group-hover:text-[#5DD62C] transition-colors">{convo.user.full_name || 'Usuário Elite'}</h4>
                              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                                 {formatDistanceToNow(new Date(convo.created_at), { addSuffix: false, locale: ptBR })}
                              </span>
                           </div>
                           <p className="text-xs text-slate-400 truncate pr-6 font-medium leading-relaxed">{convo.lastMessage}</p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-white/[0.03] flex items-center justify-center text-slate-700 group-hover:text-[#5DD62C] transition-all">
                           <ChevronRight size={18} />
                        </div>
                     </Card>
                   )) : (
                     <div className="text-center py-32 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/[0.05]">
                        <div className="h-20 w-20 rounded-full bg-[#5DD62C]/5 flex items-center justify-center text-[#5DD62C]/20 mx-auto mb-6">
                           <MessageCircle size={40} />
                        </div>
                        <p className="text-slate-600 font-black uppercase tracking-[0.4em] text-[10px]">Canais Silenciados</p>
                     </div>
                   )}
                </div>
             </div>
          </section>
        ) : (
          <>
            {/* ACTIVE MEMBERS (STORIES) - PREMIUM REFINEMENT */}
            <div className="flex gap-5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2 pt-4">
               <div className="flex flex-col items-center gap-3 flex-shrink-0 group">
                  <div 
                    onClick={handleCreateStory}
                    className="h-[4.5rem] w-[4.5rem] rounded-[1.8rem] border-2 border-dashed border-[#5DD62C]/30 flex items-center justify-center p-1 cursor-pointer group-hover:border-[#5DD62C] group-hover:rotate-90 transition-all duration-500"
                  >
                     <div className="h-full w-full rounded-[1.4rem] bg-[#5DD62C]/5 flex items-center justify-center text-[#5DD62C]">
                        <Plus size={28} />
                     </div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest group-hover:text-[#5DD62C] transition-colors">Novo</span>
               </div>
               
               {stories.map(group => (
                 <div key={group.user_id} className="flex flex-col items-center gap-3 flex-shrink-0 cursor-pointer group" onClick={() => { setActiveStoryGroup(group); setActiveStoryIndex(0); }}>
                    <div className="h-[4.5rem] w-[4.5rem] rounded-[1.8rem] bg-gradient-to-tr from-[#5DD62C] to-emerald-400 p-[2px] shadow-[0_0_20px_rgba(93,214,44,0.15)] group-hover:shadow-[0_0_30px_rgba(93,214,44,0.3)] transition-all duration-500 group-active:scale-90">
                       <div className="h-full w-full rounded-[1.65rem] border-[4px] border-[#0E150B] overflow-hidden">
                          <Avatar className="h-full w-full rounded-none">
                             <AvatarImage src={group.items[0]?.image_url || group.avatar_url} className="object-cover group-hover:scale-110 transition-transform duration-700" />
                             <AvatarFallback className="bg-[#1A2216] text-white font-black text-lg">{group.user_name?.[0]}</AvatarFallback>
                          </Avatar>
                       </div>
                    </div>
                    <span className="text-[10px] font-black uppercase text-white truncate w-20 text-center italic tracking-tight group-hover:text-[#5DD62C] transition-colors">{group.user_name.split(' ')[0]}</span>
                 </div>
               ))}

               {users.slice(0, 10).filter(u => !stories.some(s => s.user_id === u.id)).map(u => (
                 <div key={u.id} className="flex flex-col items-center gap-3 flex-shrink-0 cursor-pointer group" onClick={() => handleOpenChatWithUser(u)}>
                    <div className="h-[4.5rem] w-[4.5rem] rounded-[1.8rem] border-2 border-white/[0.05] p-1 group-hover:border-[#5DD62C]/20 transition-all duration-500">
                       <div className="h-full w-full rounded-[1.4rem] overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500 opacity-60 group-hover:opacity-100">
                          <Avatar className="h-full w-full rounded-none">
                             <AvatarImage src={u.avatar_url} className="object-cover" />
                             <AvatarFallback className="bg-slate-800 text-white font-black text-lg">{u.full_name?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                       </div>
                    </div>
                    <span className="text-[10px] font-black uppercase text-slate-600 truncate w-20 text-center tracking-tight group-hover:text-white transition-colors">{u.full_name?.split(' ')[0] || 'Elite'}</span>
                 </div>
               ))}
            </div>

            {/* TRIBE SELECTOR - PREMIUM TABS */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-4">
               {myTribes.map(tribe => (
                 <button 
                   key={tribe.id} 
                   onClick={() => setSelectedTribe(tribe)}
                   className={cn(
                    "flex-shrink-0 flex items-center gap-3 px-8 py-4 rounded-full border transition-all duration-500 font-black text-[10px] uppercase tracking-[0.15em] relative overflow-hidden group",
                    selectedTribe?.id === tribe.id 
                      ? "bg-[#5DD62C] text-[#0E150B] border-[#5DD62C]" 
                      : "bg-[#1A2216] text-slate-500 border-white/[0.05] hover:border-[#5DD62C]/30 hover:text-white"
                   )}
                 >
                    <Users size={16} className={cn(selectedTribe?.id === tribe.id ? "animate-pulse" : "opacity-40 group-hover:opacity-100")} />
                    {tribe.name}
                    {selectedTribe?.id === tribe.id && (
                      <div className="absolute top-0 right-0 h-1 w-full bg-white/20" />
                    )}
                 </button>
               ))}
            </div>

            {/* FEED REFINADO V2 */}
            <section className="space-y-8">
               <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">Atividades Recentes</h3>
                  <div className="flex gap-2">
                     <div className="h-1.5 w-1.5 rounded-full bg-[#5DD62C] animate-pulse" />
                     <div className="h-1.5 w-1.5 rounded-full bg-[#5DD62C]/40" />
                     <div className="h-1.5 w-1.5 rounded-full bg-[#5DD62C]/10" />
                  </div>
               </div>

               <div className="space-y-8">
                  {posts.map(post => (
                    <motion.div key={post.id} variants={item}>
                       <Card className="bg-[#1A2216]/40 backdrop-blur-xl border border-white/[0.03] rounded-[3rem] p-7 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:border-[#5DD62C]/20 transition-all duration-500 relative overflow-hidden group">
                          {/* Efeito de Gradiente de Fundo no Card */}
                          <div className="absolute top-0 right-0 w-64 h-64 bg-[#5DD62C]/[0.02] blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none" />

                          {/* HEADER DO POST */}
                          <div className="flex justify-between items-center relative z-10">
                             <div className="flex gap-4 items-center">
                                <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-white/10 to-transparent group-hover:from-[#5DD62C]/40 transition-all duration-500">
                                   <Avatar className="h-14 w-14 rounded-full border-2 border-[#1A2216]">
                                      <AvatarImage src={post.avatar_url} className="object-cover" />
                                      <AvatarFallback className="bg-slate-800 text-white font-black">{post.user_name?.[0]}</AvatarFallback>
                                   </Avatar>
                                   <div className="absolute -bottom-1 -right-1 bg-[#5DD62C] p-1 rounded-full shadow-lg">
                                      <ShieldCheck size={10} className="text-[#0E150B]" />
                                   </div>
                                </div>
                                <div>
                                   <div className="font-black text-[15px] text-white uppercase italic leading-none tracking-tight group-hover:text-[#5DD62C] transition-colors">{post.user_name}</div>
                                   <div className="flex items-center gap-2 mt-2">
                                      <Badge variant="outline" className={cn(
                                        "border-none text-[8px] font-black uppercase px-2 py-0.5 rounded-md",
                                        (post.points || 0) < 5000 ? "bg-slate-500/10 text-slate-400" :
                                        (post.points || 0) < 15000 ? "bg-[#5DD62C]/10 text-[#5DD62C]" :
                                        "bg-yellow-500/10 text-yellow-500"
                                      )}>
                                        {(post.points || 0) < 5000 ? "Novato" :
                                         (post.points || 0) < 15000 ? "Especialista" : "Mestre Elite"}
                                      </Badge>
                                      
                                      <div className="flex items-center gap-1.5 ml-1">
                                         <div className={cn(
                                            "h-1.5 w-1.5 rounded-full shadow-[0_0_10px]",
                                            post.is_online ? "bg-[#5DD62C] shadow-[#5DD62C]/40" : "bg-slate-600 shadow-transparent"
                                         )} />
                                         <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                                            {post.is_online ? "Online" : "Offline"}
                                         </span>
                                      </div>
                                   </div>
                                </div>
                             </div>
                             <button onClick={() => setShowPostOptions(post)} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white/[0.03] text-slate-600 hover:text-white hover:bg-white/[0.08] transition-all"><MoreHorizontal size={22} /></button>
                          </div>

                          {/* CONTEÚDO DO POST */}
                          <div className="space-y-4 relative z-10">
                             <p className="text-[17px] text-slate-200 font-medium leading-[1.6] px-1 tracking-tight">
                                {post.content}
                             </p>
                             
                             {post.image_url && (
                               <div className="relative aspect-[16/10] rounded-[2.5rem] overflow-hidden border border-white/[0.05] shadow-2xl bg-black/40 group/img">
                                  <img src={post.image_url} alt="Post content" className="object-cover w-full h-full group-hover/img:scale-105 transition-transform duration-1000" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                                  <div className="absolute bottom-6 left-6 flex items-center gap-2">
                                     <div className="h-8 w-8 rounded-xl bg-black/40 backdrop-blur-md flex items-center justify-center text-white/60">
                                        <Camera size={14} />
                                     </div>
                                     <span className="text-[10px] font-black text-white/80 uppercase tracking-widest italic">HQ Capture</span>
                                  </div>
                               </div>
                             )}
                          </div>

                          {/* INTERAÇÕES REFINADAS */}
                          <div className="pt-4 px-1 relative z-10 border-t border-white/[0.03]">
                             <div className="mb-2 ml-1">
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                                   Postado {post.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR }) : 'agora'}
                                </span>
                             </div>
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => handleLike(post.id)} 
                                    className={cn(
                                      "flex items-center gap-3 h-12 px-5 rounded-2xl transition-all duration-300",
                                      post.post_likes?.some((l: any) => l.user_id === user?.id) 
                                       ? "bg-red-500/10 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]" 
                                       : "bg-white/[0.03] text-slate-500 hover:bg-white/[0.08] hover:text-white"
                                    )}
                                  >
                                     <Heart size={20} className={cn(post.post_likes?.some((l: any) => l.user_id === user?.id) && "fill-red-500")} />
                                     <span className="text-sm font-black italic">{post.likes}</span>
                                  </button>

                                  <button 
                                    onClick={() => setActivePostForComments(post)} 
                                    className="flex items-center gap-3 h-12 px-5 rounded-2xl bg-white/[0.03] text-slate-500 hover:bg-[#5DD62C]/10 hover:text-[#5DD62C] transition-all duration-300"
                                  >
                                     <MessageSquare size={20} />
                                     <span className="text-sm font-black italic">{post.comments}</span>
                                  </button>
                                </div>

                                <button onClick={() => setShowShareModal(post)} className="h-12 w-12 rounded-2xl bg-white/[0.03] text-slate-500 hover:text-[#5DD62C] hover:bg-[#5DD62C]/10 transition-all">
                                   <Share2 size={20} />
                                </button>
                             </div>
                          </div>

                          {/* QUICK RESPONSE BAR */}
                          {post.user_id !== user?.id && (
                            <div className="pt-2 px-1 relative z-10 flex gap-3">
                               <div className="flex-1 bg-white/[0.03] rounded-2xl border border-white/[0.02] flex items-center px-4 focus-within:border-[#5DD62C]/30 transition-all">
                                  <Input 
                                     value={quickMessages[post.user_id] || ""}
                                     onChange={(e) => setQuickMessages(prev => ({ ...prev, [post.user_id]: e.target.value }))}
                                     placeholder={`Responder ${post.user_name.split(' ')[0]}...`}
                                     className="bg-transparent border-none h-12 text-xs focus-visible:ring-0 placeholder:text-slate-700 italic font-medium"
                                  />
                               </div>
                               <Button 
                                  onClick={() => handleSendMessage(post.user_id, quickMessages[post.user_id])}
                                  className="h-12 w-12 bg-[#5DD62C] text-[#0E150B] rounded-2xl p-0 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#5DD62C]/20"
                               >
                                  <Send size={18} />
                               </Button>
                            </div>
                          )}
                       </Card>
                    </motion.div>
                  ))}

                  {posts.length === 0 && !loading && (
                    <div className="text-center py-32 bg-white/[0.01] rounded-[4rem] border border-dashed border-white/[0.03]">
                       <Sparkles size={48} className="mx-auto mb-6 text-white/5" />
                       <p className="text-slate-600 font-black uppercase tracking-[0.4em] text-[10px]">Território Inexplorado</p>
                    </div>
                  )}
               </div>
            </section>
          </>
        )}
      </motion.div>

      {/* FAB - NOVO POST */}
      {activeTab === 'feed' && selectedTribe && myTribes.some(t => t.id === selectedTribe.id) && (
        <button 
          onClick={() => setShowCreatePost(true)}
          className="fixed bottom-28 right-6 w-16 h-16 bg-[#5DD62C] text-[#0E150B] rounded-full shadow-[0_15px_35px_-10px_rgba(93,214,44,0.5)] flex items-center justify-center z-50 hover:scale-110 hover:rotate-90 active:scale-90 transition-all duration-300"
        >
           <Plus size={32} strokeWidth={3} />
        </button>
      )}

      {/* MODAL CRIAR POST */}
      <AnimatePresence>
        {showCreatePost && (
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed inset-0 z-[1000] bg-[#0E150B] flex flex-col">
             <header className="h-20 flex items-center justify-between px-6 border-b border-white/5">
                <button onClick={() => setShowCreatePost(false)} className="text-slate-500 hover:text-white"><X size={24} /></button>
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Postar em {selectedTribe?.name}</h2>
                <Button onClick={handleCreatePost} className="bg-[#5DD62C] text-[#0E150B] font-black px-6 h-10 rounded-full text-[10px] uppercase tracking-widest shadow-lg shadow-[#5DD62C]/20">Publicar</Button>
             </header>
             <div className="flex-1 p-6 space-y-6">
                <textarea 
                   autoFocus
                   placeholder="O que você está pensando?"
                   className="w-full bg-transparent border-none focus:ring-0 text-xl font-medium text-slate-200 placeholder:text-slate-800 resize-none min-h-[150px]"
                   value={postContent}
                   onChange={(e) => setPostContent(e.target.value)}
                />

                {imagePreview && (
                  <div className="relative rounded-3xl overflow-hidden border border-white/10 aspect-video shadow-2xl bg-black/40">
                     <img src={imagePreview} className="object-contain w-full h-full" />
                     <button onClick={() => { setSelectedImage(null); setImagePreview(null); }} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white backdrop-blur-md"><X size={16} /></button>
                  </div>
                )}

                <div className="flex gap-4">
                   <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                   <Button onClick={() => fileInputRef.current?.click()} variant="ghost" className="h-16 w-16 rounded-[1.5rem] bg-[#1A2216] border border-white/5 text-[#5DD62C] hover:bg-[#5DD62C] hover:text-[#0E150B] transition-all">
                      <ImageIcon size={28} />
                   </Button>
                   <Button variant="ghost" className="h-16 w-16 rounded-[1.5rem] bg-[#1A2216] border border-white/5 text-slate-500">
                      <MapPin size={28} />
                   </Button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL COMENTÁRIOS / POST DETAIL */}
      <AnimatePresence>
        {activePostForComments && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 z-[1000] bg-[#0E150B] flex flex-col">
             <header className="h-20 flex items-center justify-between px-6 border-b border-white/5 bg-[#0E150B]/80 backdrop-blur-xl sticky top-0">
                <button onClick={() => setActivePostForComments(null)} className="text-slate-500 hover:text-white"><ChevronRight size={24} className="rotate-180" /></button>
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Publicação</h2>
                <button className="text-slate-500 hover:text-white"><MoreVertical size={20} /></button>
             </header>
             <div className="flex-1 overflow-y-auto">
                {/* POST DETAIL MODEL REFINEMENT */}
                <div className="p-6 space-y-6">
                   <div className="flex gap-4 items-center">
                      <Avatar className="h-12 w-12 border border-white/10">
                         <AvatarImage src={activePostForComments.avatar_url} />
                         <AvatarFallback className="bg-slate-800 text-white font-black">{activePostForComments.user_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                         <div className="font-black text-sm text-white uppercase italic leading-none">{activePostForComments.user_name}</div>
                         <div className="text-[9px] font-bold text-slate-600 mt-1 uppercase">Elite Member • {formatDistanceToNow(new Date(activePostForComments.created_at), { addSuffix: true, locale: ptBR })}</div>
                      </div>
                   </div>
                   
                   <p className="text-lg text-slate-200 font-medium leading-relaxed">
                      {activePostForComments.content}
                   </p>

                   {activePostForComments.image_url && (
                     <div className="rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
                        <img src={activePostForComments.image_url} className="w-full h-auto" />
                     </div>
                   )}

                   <div className="flex items-center gap-6 py-4 border-y border-white/5">
                      <div className="flex items-center gap-2">
                         <span className="text-white font-black text-sm">{activePostForComments.likes}</span>
                         <span className="text-slate-500 text-[10px] font-black uppercase">Curtidas</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-white font-black text-sm">{activePostForComments.comments}</span>
                         <span className="text-slate-500 text-[10px] font-black uppercase">Comentários</span>
                      </div>
                   </div>

                   {/* HIERARCHICAL COMMENTS */}
                   <div className="space-y-8 pt-4 pb-24">
                      {loadingComments ? (
                        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5DD62C]"></div></div>
                      ) : (
                        comments.map((comment: any) => (
                          <div key={comment.id} className="space-y-4">
                             <div className="flex gap-4 items-start">
                                <Avatar className="h-9 w-9 border border-white/10">
                                   <AvatarImage src={comment.avatar_url} />
                                   <AvatarFallback className="bg-slate-800 text-white font-black">{comment.user_name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                   <div className="bg-[#1A2216] p-4 rounded-[1.5rem] border border-white/5">
                                      <div className="flex justify-between items-center mb-1">
                                         <span className="font-black text-[10px] text-[#5DD62C] uppercase italic">{comment.user_name}</span>
                                         <span className="text-[8px] text-slate-600 uppercase font-black">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: false, locale: ptBR })}</span>
                                      </div>
                                      <p className="text-sm text-slate-300 leading-relaxed">{comment.content}</p>
                                   </div>
                                   <div className="flex gap-4 mt-2 ml-2">
                                      <button 
                                        onClick={() => handleLikeComment(comment.id)} 
                                        className={cn(
                                          "text-[9px] font-black uppercase transition-colors flex items-center gap-1",
                                          comment.liked_by_me ? "text-red-500" : "text-slate-600 hover:text-white"
                                        )}
                                      >
                                        <Heart size={10} className={cn(comment.liked_by_me && "fill-red-500")} />
                                        {comment.liked_by_me ? 'Curtido' : 'Curtir'} 
                                        {comment.likes_count > 0 && ` (${comment.likes_count})`}
                                      </button>
                                      <button 
                                        onClick={() => handleReplyTo(comment)} 
                                        className="text-[9px] font-black uppercase text-slate-600 hover:text-white transition-colors"
                                      >
                                        Responder
                                      </button>
                                   </div>
                                </div>
                             </div>
                             
                             {/* Mock nested reply indicator - simple version */}
                             {comment.parent_id && (
                               <div className="ml-12 text-[8px] font-bold text-slate-600 uppercase italic">
                                  Respondendo a um comentário
                               </div>
                             )}
                          </div>
                        ))
                      )}
                   </div>
                </div>
             </div>
             
             {/* COMMENT INPUT */}
             <div className="p-4 border-t border-white/5 bg-[#0E150B]/95 backdrop-blur-md sticky bottom-0">
                {replyingTo && (
                  <div className="flex items-center justify-between mb-2 px-4 py-2 bg-[#5DD62C]/10 rounded-xl border border-[#5DD62C]/20">
                     <span className="text-[10px] font-black uppercase text-[#5DD62C]">Respondendo a {replyingTo.user_name}</span>
                     <button onClick={() => { setReplyingTo(null); setCommentText(""); }} className="text-[#5DD62C] hover:text-white"><X size={14} /></button>
                  </div>
                )}
                <div className="flex gap-3 bg-[#1A2216] p-2 rounded-[2rem] border border-white/5">
                   <Input 
                      ref={commentInputRef}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={replyingTo ? "Sua resposta..." : "Adicione um comentário..."}
                      className="bg-transparent border-none h-12 text-sm focus-visible:ring-0 placeholder:text-slate-700"
                   />
                   <Button onClick={handleAddComment} className="bg-[#5DD62C] text-[#0E150B] h-12 w-12 rounded-full p-0 shadow-lg shadow-[#5DD62C]/20">
                      <Send size={18} />
                   </Button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL CHAT DIRECT (ELENA RODRIGUEZ MODEL) */}
      <AnimatePresence>
        {activeChat && (
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed inset-0 z-[1001] bg-[#0E150B] flex flex-col">
             {/* CHAT HEADER REFINED */}
             <header className="h-20 flex items-center justify-between px-6 border-b border-white/5 bg-[#0E150B]/80 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                   <button onClick={() => setActiveChat(null)} className="text-slate-500 hover:text-white"><ChevronRight size={24} className="rotate-180" /></button>
                   <div className="relative">
                      <Avatar className="h-10 w-10 border border-white/10">
                         <AvatarImage src={activeChat.avatar_url} />
                         <AvatarFallback className="bg-slate-800 text-white font-black">{activeChat.full_name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-[#5DD62C] rounded-full border-2 border-[#0E150B]" />
                   </div>
                   <div>
                      <h2 className="text-sm font-black uppercase italic text-white leading-none">{activeChat.full_name || 'Usuário Elite'}</h2>
                      <span className="text-[8px] font-bold text-[#5DD62C] uppercase tracking-widest mt-1 block">Online agora</span>
                   </div>
                </div>
                
                <div className="flex items-center gap-5 text-[#5DD62C]">
                   <button className="p-2 hover:bg-[#5DD62C]/10 rounded-full transition-colors"><Phone size={20} /></button>
                   <button className="p-2 hover:bg-[#5DD62C]/10 rounded-full transition-colors"><Video size={20} /></button>
                   <button className="p-2 hover:bg-[#5DD62C]/10 rounded-full transition-colors"><Info size={20} /></button>
                </div>
             </header>
             
             <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
                <div className="flex justify-center my-4">
                   <span className="px-4 py-1.5 rounded-full bg-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest border border-white/5">Hoje</span>
                </div>

                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-20 space-y-4">
                     <MessageCircle size={48} />
                     <p className="text-[10px] font-black uppercase tracking-widest">Inicie esta conversa elite</p>
                  </div>
                ) : chatMessages.map((msg: any) => (
                  <div key={msg.id} className={cn("flex flex-col", msg.sender_id === user?.id ? "items-end" : "items-start")}>
                     <div className={cn(
                       "max-w-[85%] p-4 rounded-[1.8rem] shadow-xl",
                       msg.sender_id === user?.id 
                        ? "bg-[#5DD62C] text-[#0E150B] rounded-tr-none shadow-[0_10px_20px_rgba(93,214,44,0.1)] font-semibold" 
                        : "bg-[#252D21] text-white rounded-tl-none border border-white/5"
                     )}>
                        {msg.post_shared_id && (
                          <div className={cn("p-3 rounded-2xl mb-2 border", msg.sender_id === user?.id ? "bg-black/10 border-black/10" : "bg-black/20 border-white/5")}>
                             <p className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-50">Post Compartilhado</p>
                             <p className="text-[10px] italic">Visualizar postagem original</p>
                          </div>
                        )}
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                     </div>
                     <span className="text-[8px] font-black uppercase text-slate-600 mt-2 px-1">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: false, locale: ptBR })}
                     </span>
                  </div>
                ))}
             </div>

             {/* MESSAGE INPUT REFINED */}
             <div className="p-4 border-t border-white/5 bg-[#0E150B]/95 backdrop-blur-md">
                <div className="flex items-center gap-3 bg-[#1A2216] p-2 rounded-[2.5rem] border border-white/5">
                   <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-white/5 text-slate-500"><Camera size={20} /></button>
                   <Input 
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Sua mensagem elite..."
                      className="bg-transparent border-none h-12 text-sm focus-visible:ring-0 placeholder:text-slate-700"
                   />
                   <Button onClick={() => handleSendMessage()} className="bg-[#5DD62C] text-[#0E150B] h-12 w-12 rounded-full p-0 shadow-lg shadow-[#5DD62C]/20 hover:scale-105 active:scale-95 transition-all">
                      <Send size={20} />
                   </Button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL NEW CHAT (EXPLORAR USUÁRIOS) */}
      <AnimatePresence>
        {showNewChatModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1003] bg-[#0E150B]/98 backdrop-blur-xl flex flex-col">
             <header className="h-20 flex items-center justify-between px-6 border-b border-white/5">
                <button onClick={() => setShowNewChatModal(false)} className="text-slate-500 hover:text-white"><X size={24} /></button>
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Nova Conversa</h2>
                <div className="w-10" />
             </header>
             <div className="p-6">
                <div className="relative group mb-8">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#5DD62C] transition-colors" size={20} />
                   <Input placeholder="Buscar usuário elite..." className="h-14 bg-[#1A2216] border border-white/5 rounded-2xl pl-12 text-sm focus-visible:ring-[#5DD62C] placeholder:text-slate-700" />
                </div>
                <div className="space-y-4">
                   {users.filter(u => u.id !== user?.id).map(u => (
                     <button 
                       key={u.id}
                       onClick={() => handleOpenChatWithUser(u)}
                       className="w-full flex items-center gap-4 p-4 rounded-3xl bg-[#1A2216] border border-white/5 hover:border-[#5DD62C]/30 transition-all shadow-sm"
                     >
                        <Avatar className="h-12 w-12 border border-white/10">
                           <AvatarImage src={u.avatar_url} />
                           <AvatarFallback className="bg-slate-800 text-white font-black">{u.full_name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="text-left min-w-0">
                           <span className="font-black text-[11px] text-white uppercase tracking-widest block truncate">{u.full_name || 'Usuário Elite'}</span>
                           <span className="text-[8px] text-slate-600 uppercase font-black">Online agora</span>
                        </div>
                        <ChevronRight className="ml-auto text-slate-800" size={16} />
                     </button>
                   ))}
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL SHARE */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1004] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
             <Card className="w-full max-w-md bg-[#1A2216] border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
                <div className="flex justify-between items-center">
                   <h3 className="text-xl font-black uppercase italic tracking-tighter">Compartilhar <span className="text-[#5DD62C] not-italic">Post</span></h3>
                   <button onClick={() => setShowShareModal(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2 no-scrollbar">
                   {users.map(u => (
                     <button 
                       key={u.id}
                       onClick={() => handleSharePost(u.id)}
                       className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group"
                     >
                        <Avatar className="h-10 w-10 border border-white/10">
                           <AvatarImage src={u.avatar_url} />
                           <AvatarFallback className="bg-slate-800 text-white font-black">{u.full_name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="font-black text-[10px] text-white uppercase tracking-widest truncate">{u.full_name || u.email?.split('@')[0]}</span>
                        <div className="ml-auto text-[#5DD62C] opacity-0 group-hover:opacity-100 transition-opacity"><Send size={16} /></div>
                     </button>
                   ))}
                </div>
             </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL POST OPTIONS */}
      <AnimatePresence>
        {showPostOptions && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1005] bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
             <Card className="w-full max-w-sm bg-[#1A2216] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-2 space-y-1">
                   {showPostOptions.user_id === user?.id ? (
                     <button onClick={() => handleDeletePost(showPostOptions.id)} className="w-full flex items-center gap-3 p-5 text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/10 transition-all rounded-2xl">
                        <Trash2 size={18} /> Excluir Publicação
                     </button>
                   ) : (
                     <button onClick={() => { toast.success("Denúncia enviada!"); setShowPostOptions(null); }} className="w-full flex items-center gap-3 p-5 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-white/5 transition-all rounded-2xl">
                        <Flag size={18} /> Denunciar Conteúdo
                     </button>
                   )}
                   <button onClick={() => setShowPostOptions(null)} className="w-full p-5 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:bg-white/5 transition-all rounded-2xl">Cancelar</button>
                </div>
             </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL TRIBE CHAT */}
      <AnimatePresence>
        {showTribeChat && selectedTribe && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="fixed inset-0 z-[1006] bg-[#0E150B]/98 backdrop-blur-xl flex flex-col">
             <header className="h-20 flex items-center justify-between px-6 border-b border-white/5 bg-[#0E150B]">
                <div className="flex items-center gap-3">
                   <button onClick={() => setShowTribeChat(false)} className="text-slate-500 hover:text-white"><X size={24} /></button>
                   <div>
                      <h2 className="text-sm font-black uppercase italic text-white leading-none">Chat da Tribo: {selectedTribe.name}</h2>
                      <span className="text-[8px] font-bold text-[#5DD62C] uppercase tracking-[0.2em]">Canal Ativo</span>
                   </div>
                </div>
                <Users size={20} className="text-slate-500" />
             </header>
             <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-6">
                <div className="h-24 w-24 rounded-[2rem] bg-[#5DD62C]/10 flex items-center justify-center text-[#5DD62C] mb-4 animate-pulse border border-[#5DD62C]/20 shadow-[0_0_30px_rgba(93,214,44,0.1)]">
                   <MessageSquare size={48} />
                </div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">Sincronizando <span className="text-[#5DD62C]">Frequência</span></h3>
                <p className="text-xs text-slate-500 max-w-xs uppercase font-bold tracking-[0.2em] leading-relaxed">Conectando ao canal criptografado da sua Tribo Elite...</p>
                <div className="flex gap-3 mt-8">
                   <div className="h-1.5 w-10 bg-[#5DD62C] rounded-full animate-bounce" />
                   <div className="h-1.5 w-10 bg-[#5DD62C]/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                   <div className="h-1.5 w-10 bg-[#5DD62C]/20 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
             </div>
             <div className="p-8">
                <Button onClick={() => setShowTribeChat(false)} className="w-full h-16 bg-[#1A2216] text-white border border-white/5 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-[#5DD62C] hover:text-[#0E150B] transition-all">Voltar ao Posto</Button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL CRIAR TRIBO */}
      <AnimatePresence>
        {showCreateTribe && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 z-[1007] bg-[#0E150B]/95 backdrop-blur-xl flex items-center justify-center p-6">
             <Card className="w-full max-w-lg bg-[#1A2216] border border-white/10 rounded-[3rem] p-8 space-y-8 shadow-2xl relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#5DD62C]/5 blur-[100px] rounded-full" />
                
                <div className="flex justify-between items-center relative z-10">
                   <h3 className="text-2xl font-black uppercase italic tracking-tighter">Fundar <span className="text-[#5DD62C]">Tribo</span></h3>
                   <button onClick={() => setShowCreateTribe(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
                </div>

                <div className="space-y-6 relative z-10">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-[#5DD62C]">Nome da Tribo</Label>
                      <Input 
                         value={newTribe.name}
                         onChange={(e) => setNewTribe({...newTribe, name: e.target.value})}
                         placeholder="Ex: Marketing Elite"
                         className="h-14 bg-white/5 border-none rounded-2xl text-white placeholder:text-slate-700"
                      />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-[#5DD62C]">Descrição da Missão</Label>
                      <textarea 
                         value={newTribe.description}
                         onChange={(e) => setNewTribe({...newTribe, description: e.target.value})}
                         placeholder="Qual o objetivo desta comunidade?"
                         className="w-full h-32 bg-white/5 border-none rounded-2xl p-4 text-white placeholder:text-slate-700 resize-none focus:ring-1 focus:ring-[#5DD62C]/30"
                      />
                   </div>
                   
                   <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                      <div className="flex items-center gap-3">
                         <Lock size={18} className="text-[#5DD62C]" />
                         <span className="text-[10px] font-black uppercase tracking-widest">Tribo Privada</span>
                      </div>
                      <button 
                         onClick={() => setNewTribe({...newTribe, is_private: !newTribe.is_private})}
                         className={cn(
                           "w-12 h-6 rounded-full transition-all relative",
                           newTribe.is_private ? "bg-[#5DD62C]" : "bg-slate-800"
                         )}
                      >
                         <div className={cn(
                           "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                           newTribe.is_private ? "left-7" : "left-1"
                         )} />
                      </button>
                   </div>
                </div>

                <Button onClick={handleCreateTribe} className="w-full h-16 bg-[#5DD62C] text-[#0E150B] rounded-full font-black uppercase text-[12px] tracking-widest shadow-[0_15px_30px_-5px_rgba(93,214,44,0.4)] relative z-10">Fundar Agora 🚀</Button>
             </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL CRIAR STORY */}
      <AnimatePresence>
        {showCreateStory && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 z-[2100] bg-[#0E150B]/95 backdrop-blur-xl flex items-center justify-center p-6">
             <Card className="w-full max-w-lg bg-[#1A2216] border border-white/10 rounded-[3rem] p-8 space-y-8 shadow-2xl">
                <div className="flex justify-between items-center">
                   <h3 className="text-2xl font-black uppercase italic tracking-tighter">Novo <span className="text-[#5DD62C]">Story</span></h3>
                   <button onClick={() => setShowCreateStory(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
                </div>

                <div className="space-y-6">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-[#5DD62C]">Aviso ou Texto</Label>
                      <textarea 
                         autoFocus
                         value={storyContent}
                         onChange={(e) => setStoryContent(e.target.value)}
                         placeholder="Escreva seu aviso aqui..."
                         className="w-full h-40 bg-white/5 border-none rounded-2xl p-4 text-white placeholder:text-slate-700 resize-none focus:ring-1 focus:ring-[#5DD62C]/30 text-lg font-medium"
                      />
                   </div>

                   {storyPreview ? (
                     <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video shadow-xl bg-black/40">
                        <img src={storyPreview} className="object-contain w-full h-full" />
                        <button onClick={() => { setStoryImage(null); setStoryPreview(null); }} className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white"><X size={14} /></button>
                     </div>
                   ) : (
                     <Button 
                       onClick={() => storyFileInputRef.current?.click()}
                       variant="ghost" 
                       className="w-full h-24 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[#5DD62C]/40 hover:bg-[#5DD62C]/5 transition-all"
                     >
                        <ImageIcon size={24} className="text-[#5DD62C]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Adicionar Foto</span>
                     </Button>
                   )}
                   <input type="file" ref={storyFileInputRef} onChange={handleStoryImageChange} className="hidden" accept="image/*" />
                </div>

                <Button onClick={handleSubmitStory} disabled={loading} className="w-full h-16 bg-[#5DD62C] text-[#0E150B] rounded-full font-black uppercase text-[12px] tracking-widest shadow-[0_15px_30px_-5px_rgba(93,214,44,0.4)]">
                   {loading ? "Publicando..." : "PUBLICAR STORY ✨"}
                </Button>
             </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL VISUALIZAR STORIES */}
      <AnimatePresence>
        {activeStoryGroup && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 z-[2000] bg-black flex flex-col items-center justify-center">
             <div className="relative w-full max-w-lg h-full max-h-[90vh] md:aspect-[9/16] bg-[#1A2216] overflow-hidden md:rounded-[3rem] shadow-2xl">
                {/* PROGRESS BARS */}
                <div className="absolute top-4 inset-x-4 flex gap-1 z-20">
                   {activeStoryGroup.items.map((_: any, idx: number) => (
                     <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                        <div className={cn(
                          "h-full bg-white transition-all duration-300",
                          idx < activeStoryIndex ? "w-full" : 
                          idx === activeStoryIndex ? "animate-progress-5" : "w-0"
                        )} />
                     </div>
                   ))}
                </div>

                {/* HEADER */}
                <div className="absolute top-8 inset-x-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/60 to-transparent p-4 -mx-6 -mt-8">
                   <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-white/20">
                         <AvatarImage src={activeStoryGroup.avatar_url} />
                         <AvatarFallback className="bg-slate-800 text-white font-black">{activeStoryGroup.user_name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                         <span className="font-black text-xs text-white uppercase italic">{activeStoryGroup.user_name}</span>
                         <span className="block text-[8px] text-[#5DD62C] font-black uppercase tracking-widest">Publicação Temporária • 24h</span>
                      </div>
                   </div>
                   <button onClick={() => setActiveStoryGroup(null)} className="text-white hover:bg-white/10 p-2 rounded-full"><X size={24} /></button>
                </div>

                {/* STORY CONTENT */}
                <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-br from-[#1A2216] to-[#0E150B]">
                   {activeStoryGroup.items[activeStoryIndex].image_url ? (
                     <>
                       <img src={activeStoryGroup.items[activeStoryIndex].image_url} className="w-full h-full object-contain" />
                       {activeStoryGroup.items[activeStoryIndex].content && (
                         <div className="absolute bottom-20 inset-x-6 bg-black/60 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                            <p className="text-white text-lg font-bold text-center italic">{activeStoryGroup.items[activeStoryIndex].content}</p>
                         </div>
                       )}
                     </>
                   ) : (
                     <div className="p-10 text-center">
                        <Sparkles size={48} className="text-[#5DD62C] mx-auto mb-6 opacity-40" />
                        <h2 className="text-3xl font-black italic text-white uppercase leading-tight tracking-tighter">
                           {activeStoryGroup.items[activeStoryIndex].content}
                        </h2>
                     </div>
                   )}
                </div>
                
                {/* NAVIGATION OVERLAYS */}
                <div className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer" onClick={handlePrevStory} />
                <div className="absolute inset-y-0 right-0 w-1/3 z-10 cursor-pointer" onClick={handleNextStory} />
             </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
