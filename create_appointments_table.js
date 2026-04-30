const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar variáveis do .env.local
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
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID REFERENCES clients(id),
  title TEXT NOT NULL,
  description TEXT,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT DEFAULT 'visit',
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
`;

async function run() {
  console.log("Tentando criar a tabela appointments...");
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error("❌ Erro ao rodar SQL via RPC:", error.message);
    console.log("\nAVISO: O RPC 'exec_sql' pode não estar habilitado no seu Supabase.");
    console.log("Para corrigir, cole o código SQL abaixo no 'SQL Editor' do painel do Supabase:");
    console.log("\n" + sql);
  } else {
    console.log("✅ Tabela appointments criada (ou já existia) com sucesso!");
  }
}

run();
