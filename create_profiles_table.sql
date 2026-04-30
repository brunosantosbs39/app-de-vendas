-- Tabela de Perfis de Usuário
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  whatsapp TEXT,
  instagram TEXT,
  role TEXT DEFAULT 'agente', -- 'agente', 'expert', 'admin'
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ativar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Profiles are visible to everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger para criar perfil automaticamente no cadastro (Opcional, mas recomendado)
-- Por enquanto, vamos criar manualmente no primeiro acesso ou migração.
