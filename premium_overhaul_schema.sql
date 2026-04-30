-- SCRIPT DE EXPANSÃO PREMIUM (FASE 1)
-- Adiciona funcionalidades de controle financeiro avançado (Me Deve style) e melhorias de gestão

-- 1. Melhorar Tabela de Pedidos para suportar "Fiado" e Pagamentos Parciais
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT; -- 'pix', 'dinheiro', 'cartao', 'fiado'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5,2) DEFAULT 0; -- Juros por atraso

-- 2. Tabela de Transações Unificadas (Fluxo de Caixa)
-- Esta tabela centraliza entradas e saídas para relatórios de alto nível
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL, -- 'entrada' (venda, aporte), 'saida' (despesa, retirada)
  category TEXT NOT NULL, -- 'venda', 'marketing', 'infraestrutura', 'estoque', etc.
  description TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Melhorar Tabela de Clientes para CRM Premium
ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_debt DECIMAL(10,2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'baixo'; -- 'baixo', 'medio', 'alto'
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'; -- Ex: ['VIP', 'Recorrente', 'Devedor']

-- 4. Tabela de Histórico de Estoque (Audit Log)
CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  quantity_change INTEGER NOT NULL, -- + para entrada, - para saída
  reason TEXT NOT NULL, -- 'venda', 'ajuste_manual', 'devolucao', 'compra_estoque'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Habilitar RLS nas novas tabelas
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
CREATE POLICY "Users can manage their own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own inventory logs" ON inventory_logs FOR ALL USING (auth.uid() = user_id);

-- 6. Limpeza de Cache do Schema
NOTIFY pgrst, 'reload schema';
