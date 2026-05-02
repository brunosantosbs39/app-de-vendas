"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface Profile {
  id: string;
  user_name: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  whatsapp: string;
  instagram: string;
  role: string;
  default_billing_message?: string;
}

export function useProfile(userId?: string) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const targetId = userId || user?.id;

  const fetchProfile = async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single();

      if (error && error.code === 'PGRST116') {
        if (user && targetId === user.id) {
          setProfile({
            id: user.id,
            user_name: user.user_metadata?.user_name || '',
            full_name: user.user_metadata?.full_name || '',
            avatar_url: user.user_metadata?.avatar_url || '',
            bio: '',
            whatsapp: '',
            instagram: '',
            role: 'agente'
          });
        }
      } else if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (targetId) {
        fetchProfile();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [targetId]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...updates,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      return { success: true };
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      return { success: false, error: err };
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('community')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('community')
        .getPublicUrl(filePath);

      await updateProfile({ avatar_url: publicUrl });
      return publicUrl;
    } catch (err) {
      console.error('Erro no upload de avatar:', err);
      return null;
    }
  };

  return { profile, loading, updateProfile, uploadAvatar, refreshProfile: fetchProfile };
}

