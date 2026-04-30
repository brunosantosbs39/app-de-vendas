-- Tabela de Notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_name TEXT, -- Nome de quem gerou a notificação (opcional)
  type TEXT NOT NULL, -- 'sale', 'stock', 'payment', 'achievement', 'community'
  title TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  link TEXT, -- Link para redirecionamento
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ativar RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can see their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark as read)" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
