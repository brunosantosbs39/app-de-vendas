-- Script para expandir as funcionalidades da Comunidade

-- 1. Tabela de Comunidades
CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tabela de Membros da Comunidade
CREATE TABLE IF NOT EXISTS community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT DEFAULT 'member', -- 'admin', 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- 3. Atualizar community_posts para pertencer a uma comunidade
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='community_posts' AND column_name='community_id') THEN
    ALTER TABLE community_posts ADD COLUMN community_id UUID REFERENCES communities(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Tabela de Curtidas nos Posts
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 5. Tabela de Comentários nos Posts
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (RLS)

-- Comunidades: Apenas membros podem ver comunidades privadas
CREATE POLICY "Members can see their communities" ON communities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_members 
      WHERE community_id = communities.id AND user_id = auth.uid()
    ) OR creator_id = auth.uid() OR is_private = false
  );

-- Membros: Usuários podem ver outros membros das suas comunidades
CREATE POLICY "Community members can see each other" ON community_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_members m2 
      WHERE m2.community_id = community_members.community_id AND m2.user_id = auth.uid()
    )
  );

-- Posts: Apenas membros podem ver posts da comunidade
DROP POLICY IF EXISTS "Users can see all community posts" ON community_posts;
CREATE POLICY "Members can see community posts" ON community_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_members 
      WHERE community_id = community_posts.community_id AND user_id = auth.uid()
    )
  );

-- Curtidas e Comentários: Apenas membros podem interagir
CREATE POLICY "Members can like posts" ON post_likes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM community_posts p
      JOIN community_members m ON p.community_id = m.community_id
      WHERE p.id = post_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can comment on posts" ON post_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM community_posts p
      JOIN community_members m ON p.community_id = m.community_id
      WHERE p.id = post_id AND m.user_id = auth.uid()
    )
  );
