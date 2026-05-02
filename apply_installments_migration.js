const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
-- Tabela de Parcelas (Installments)
CREATE TABLE IF NOT EXISTS installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'installments' AND policyname = 'Users can manage their own installments'
    ) THEN
        CREATE POLICY "Users can manage their own installments" ON installments FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Recarregar cache do schema
NOTIFY pgrst, 'reload schema';
`;

async function run() {
  console.log("Executando migração para a tabela installments...");
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error("ERRO ao executar SQL:", error.message);
    console.log("\n-------------------------------------------");
    console.log("POR FAVOR, EXECUTE O SQL ABAIXO NO DASHBOARD DO SUPABASE:");
    console.log("-------------------------------------------\n");
    console.log(sql);
    console.log("\n-------------------------------------------");
  } else {
    console.log("✅ Migração concluída com sucesso!");
  }
}

run();
