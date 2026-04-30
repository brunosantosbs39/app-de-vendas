import { supabase } from './supabase';

export type PostType = 'achievement' | 'tip' | 'sale' | 'approach' | 'follow_up';

export interface Community {
  id: string;
  creator_id: string;
  name: string;
  description: string;
  image_url?: string;
  is_private: boolean;
  created_at: string;
}

export interface CommunityPost {
  id?: string;
  user_id: string;
  user_name: string;
  content: string;
  type: PostType;
  points_earned: number;
  community_id?: string;
  attachments?: string[];
  tags?: string[];
  created_at?: string;
}

const getLevelName = (points: number): { name: string, level: number } => {
  if (points >= 5000) return { name: 'Elite', level: 3 };
  if (points >= 1500) return { name: 'Profissional', level: 2 };
  return { name: 'Iniciante', level: 1 };
};

export const gamificationService = {
  // Communities
  async createCommunity(userId: string, name: string, description: string, isPrivate: boolean = true) {
    try {
      const { data, error } = await supabase
        .from('communities')
        .insert([{ 
          creator_id: userId, 
          name, 
          description, 
          is_private: isPrivate 
        }])
        .select()
        .single();
      
      if (error) {
        console.error("Erro Supabase Insert:", error);
        throw error;
      }

      // Tenta adicionar como membro, mas não trava se falhar
      try {
        await supabase.from('community_members').insert([{ 
          community_id: data.id, 
          user_id: userId, 
          role: 'admin' 
        }]);
      } catch (e) {
        console.warn("Aviso: Comunidade criada, mas erro ao adicionar admin automaticamente.");
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  },

  async addMemberByEmail(communityId: string, email: string) {
    // 1. Find user by email in auth or leaderboard
    const { data: userData, error: userError } = await supabase
      .from('leaderboard')
      .select('user_id')
      .ilike('user_name', `%${email.split('@')[0]}%`) // Fallback simple search
      .limit(1);

    // Nota: O ideal seria uma tabela de perfis que contenha o email. 
    // Como estamos usando auth.users indiretamente, vamos tentar buscar pelo email na auth se disponível
    // ou assumir que o usuário já existe na leaderboard.
    
    if (!userData || userData.length === 0) {
      throw new Error("Usuário não encontrado com este e-mail/nome.");
    }

    const userId = userData[0].user_id;

    const { error } = await supabase
      .from('community_members')
      .insert([{ community_id: communityId, user_id: userId, role: 'member' }]);
    
    if (error) {
      if (error.code === '23505') throw new Error("Usuário já é membro desta comunidade.");
      throw error;
    }

    // Notify user
    await this.createNotification(userId, "Sistema", "invite", "Você foi adicionado a uma nova comunidade!", communityId);

    return { success: true };
  },

  async getCommunityMembers(communityId: string) {
    const { data, error } = await supabase
      .from('community_members')
      .select(`
        user_id,
        role,
        leaderboard(user_name)
      `)
      .eq('community_id', communityId);
    
    if (error) throw error;
    return data;
  },

  // Notifications
  async createNotification(userId: string, actorName: string, type: string, content: string, communityId?: string) {
    await supabase.from('notifications').insert([{
      user_id: userId,
      actor_name: actorName,
      type,
      content,
      community_id: communityId
    }]);
  },

  async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) throw error;
    return data;
  },

  // Posts & Interactions
  async createPost(userId: string, userName: string, content: string, communityId: string, attachments: string[] = []) {
    const { data, error } = await supabase
      .from('community_posts')
      .insert([{
        user_id: userId,
        user_name: userName,
        content,
        community_id: communityId,
        type: 'tip',
        points_earned: 10,
        attachments
      }])
      .select()
      .single();
    
    if (error) throw error;

    // Notify other members (Simulated for current active members)
    // Em um app real, isso seria via Edge Functions. Aqui notificaremos o criador como exemplo.
    return data;
  },

  async getPostComments(postId: string) {
    const { data, error } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async addComment(postId: string, userId: string, userName: string, content: string) {
    const { data, error } = await supabase
      .from('post_comments')
      .insert([{ post_id: postId, user_id: userId, user_name: userName, content }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async toggleLike(postId: string, userId: string) {
    // Check if liked
    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      await supabase.from('post_likes').delete().eq('id', existing.id);
      return { liked: false };
    } else {
      await supabase.from('post_likes').insert([{ post_id: postId, user_id: userId }]);
      return { liked: true };
    }
  },

  async getCommunityPosts(communityId: string) {
    const { data, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        post_likes(count),
        post_comments(count)
      `)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async uploadAttachment(file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `attachments/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('community')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('community').getPublicUrl(filePath);
    return data.publicUrl;
  },

  async recordAction(userId: string, userName: string, actionType: PostType, content: string, points: number, communityId?: string) {
    // Keep recordAction for backward compatibility and points logic
    try {
      const { error: postError } = await supabase
        .from('community_posts')
        .insert([{
          user_id: userId,
          user_name: userName,
          content,
          type: actionType,
          points_earned: points,
          community_id: communityId
        }]);

      if (postError) throw postError;

      const { data: leaderEntry } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (leaderEntry) {
        const newPoints = leaderEntry.total_points + points;
        const levelInfo = getLevelName(newPoints);
        await supabase.from('leaderboard').update({
          total_points: newPoints,
          level_name: levelInfo.name,
          level_number: levelInfo.level,
          last_update: new Date().toISOString(),
        }).eq('user_id', userId);
      }
      return { success: true };
    } catch (error) {
      console.error('Error recording gamification action:', error);
      return { success: false, error };
    }
  },

  async getLeaderboard() {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('total_points', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getRecentPosts(limit = 10) {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  async getMyCommunities(userId: string): Promise<Community[]> {
    const { data, error } = await supabase
      .from('community_members')
      .select('community_id, communities(*)')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return data.map(m => {
      if (Array.isArray(m.communities)) return m.communities[0];
      return m.communities;
    }).filter(Boolean) as Community[];
  },

  async isMember(communityId: string, userId: string) {
    const { data, error } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  async getPublicCommunities() {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('is_private', false);
    
    if (error) throw error;
    return data;
  },

  async votePoll(postId: string, pollId: string, optionId: number, userId: string) {
    // 1. Buscar a enquete atual
    const { data: poll, error: pollError } = await supabase
      .from('community_polls')
      .select('*')
      .eq('id', pollId)
      .single();

    if (pollError) throw pollError;

    // 2. Atualizar os votos nas opções (JSONB)
    const newOptions = poll.options.map((opt: any) => {
      if (opt.id === optionId) {
        return { ...opt, votes: (opt.votes || 0) + 1 };
      }
      return opt;
    });

    const { error: updateError } = await supabase
      .from('community_polls')
      .update({ options: newOptions })
      .eq('id', pollId);

    if (updateError) throw updateError;

    // 3. Registrar que o usuário votou para evitar votos duplicados (Opcional, se houver tabela poll_votes)
    // Por enquanto vamos apenas atualizar a contagem no JSONB.

    return { success: true };
  }
};
