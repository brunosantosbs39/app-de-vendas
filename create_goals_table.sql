-- Tabela de Metas de Venda
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  month_year DATE NOT NULL, -- Primeiro dia do mês correspondente
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Ativar RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can manage their own goals" ON goals
  FOR ALL USING (auth.uid() = user_id);
