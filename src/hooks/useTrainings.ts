import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface Training {
  id: string;
  creator_id: string;
  title: string;
  content_url: string;
  content_text: string;
  duration: string;
  category: 'Vídeo' | 'Script' | 'Guia';
  min_level_required: number;
  xp_reward: number;
  module_name?: string;
}

export function useTrainings() {
  const { user } = useAuth();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('team_trainings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrainings(data || []);
    } catch (error) {
      console.error("Erro ao buscar treinamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTrainings();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const uploadVideo = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `trainings/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('videos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Erro no upload do vídeo:", error);
      return null;
    }
  };

  const addTraining = async (training: Omit<Training, 'id' | 'creator_id'>, videoFile?: File) => {
    if (!user) throw new Error("Sessão expirada. Faça login novamente.");
    try {
      let finalUrl = training.content_url;

      if (videoFile) {
        const uploadedUrl = await uploadVideo(videoFile);
        if (uploadedUrl) finalUrl = uploadedUrl;
      }

      const { error } = await supabase
        .from('team_trainings')
        .insert([{
          ...training,
          content_url: finalUrl,
          creator_id: user.id
        }]);

      if (error) throw error;
      await fetchTrainings();
      return { success: true };
    } catch (error) {
      console.error("Erro ao adicionar treinamento:", error);
      return { success: false, error };
    }
  };

  return { trainings, loading, addTraining, refreshTrainings: fetchTrainings };
}
