-- Política de Inserção para Posts (Garantir que apenas membros postem)
DROP POLICY IF EXISTS "Users can insert their own posts" ON community_posts;
CREATE POLICY "Members can insert community posts" ON community_posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_members 
      WHERE community_id = community_posts.community_id AND user_id = auth.uid()
    )
  );

-- Tabela de Enquetes da Comunidade
CREATE TABLE IF NOT EXISTS community_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array de objetos {id: 0, text: '...', votes: 0}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ativar RLS
ALTER TABLE community_polls ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Community members can see polls" ON community_polls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_posts p
      JOIN community_members m ON p.community_id = m.community_id
      WHERE p.id = post_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can vote (update polls)" ON community_polls
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM community_posts p
      JOIN community_members m ON p.community_id = m.community_id
      WHERE p.id = post_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can insert polls" ON community_polls
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_posts p
      JOIN community_members m ON p.community_id = m.community_id
      WHERE p.id = post_id AND m.user_id = auth.uid()
    )
  );
