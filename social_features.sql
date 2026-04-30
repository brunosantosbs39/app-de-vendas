-- 1. Tabela de Comentários
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tabela de Mensagens (Directs e Chats de Tribo)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  receiver_id UUID, -- NULL se for mensagem de grupo (Tribo)
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE, -- NULL se for Direct
  content TEXT NOT NULL,
  post_shared_id UUID REFERENCES community_posts(id) ON DELETE SET NULL, -- Para o "Enviar via Direct"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Desabilitar RLS para desenvolvimento rápido (como no restante do projeto)
ALTER TABLE post_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
