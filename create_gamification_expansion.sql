-- Tabela de Missões Diárias e Conquistas
CREATE TABLE IF NOT EXISTS daily_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  xp_reward INTEGER DEFAULT 100,
  type TEXT NOT NULL, -- 'vendas', 'visitas', 'recebimentos'
  is_completed BOOLEAN DEFAULT false,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Troféus/Badges conquistados
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL, -- 'vendedor_elite', 'mestre_estoque', etc
  title TEXT NOT NULL,
  icon TEXT,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE daily_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own missions" ON daily_missions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can see their own achievements" ON user_achievements FOR ALL USING (auth.uid() = user_id);
