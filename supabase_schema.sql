-- Script de criação das tabelas para o App de Vendas

-- 1. Tabela de Clientes
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  region TEXT,
  latitude DECIMAL(9,6), -- Coordenada para o mapa
  longitude DECIMAL(9,6), -- Coordenada para o mapa
  funnel_stage TEXT DEFAULT 'contato',
  financial_status TEXT DEFAULT 'ok',
  visit_count INTEGER DEFAULT 0, -- Frequência de visitas
  last_visit_date TIMESTAMP WITH TIME ZONE, -- Controle de retorno
  last_order_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tabela de Produtos (Estoque)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) NOT NULL,
  margin_percent DECIMAL(5,2),
  stock_quantity INTEGER DEFAULT 0,
  min_stock_alert INTEGER DEFAULT 5,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Tabela de Vendas (Orders)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID REFERENCES clients(id),
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'paid', -- 'paid', 'pending', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Itens da Venda
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL
);

-- 5. Tabela de Agendamentos
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID REFERENCES clients(id),
  title TEXT NOT NULL,
  description TEXT,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT DEFAULT 'visit', -- 'visit', 'delivery', 'follow-up'
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Templates de WhatsApp
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT, -- 'nutrition', 'promo', 'welcome', 'follow-up'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Tabela de Despesas/Gastos (incluindo gastos de rua)
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT DEFAULT 'rua', -- 'rua', 'investimento', 'fixo', 'variavel'
  date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Tabela de Metas Diárias
CREATE TABLE daily_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  target_amount DECIMAL(10,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  achieved_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, date)
);

-- 9. Vendas Programadas (Future Sales)
CREATE TABLE scheduled_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID REFERENCES clients(id),
  expected_amount DECIMAL(10,2) NOT NULL,
  scheduled_date DATE NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar Row Level Security (RLS) para as novas tabelas
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_sales ENABLE ROW LEVEL SECURITY;

-- 10. Feed da Comunidade (Conquistas e Dicas)
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'achievement', -- 'achievement', 'tip', 'sale'
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 11. Ranking Global de Gamificação
CREATE TABLE leaderboard (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  user_name TEXT NOT NULL,
  total_points INTEGER DEFAULT 0,
  level_name TEXT DEFAULT 'Iniciante', -- 'Iniciante', 'Profissional', 'Elite'
  level_number INTEGER DEFAULT 1,
  sales_count INTEGER DEFAULT 0,
  approach_count INTEGER DEFAULT 0, -- Abordagens realizadas
  follow_up_count INTEGER DEFAULT 0, -- Follow-ups realizados
  last_update TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Políticas (Comunidade é pública para todos os usuários autenticados verem)
CREATE POLICY "Users can see all community posts" ON community_posts FOR SELECT USING (true);
CREATE POLICY "Users can insert their own posts" ON community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
-- 12. Tabela de Treinamentos (Gerenciado pelo Criador)
CREATE TABLE team_trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content_url TEXT, -- Link do vídeo ou documento
  content_text TEXT, -- Script de venda
  duration TEXT,
  category TEXT DEFAULT 'Vídeo', -- 'Vídeo', 'Script', 'Guia'
  min_level_required INTEGER DEFAULT 1,
  xp_reward INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE team_trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone in team can see trainings" ON team_trainings FOR SELECT USING (true);
CREATE POLICY "Only creators can manage their trainings" ON team_trainings FOR ALL USING (auth.uid() = creator_id);
