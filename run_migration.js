const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Função simples para carregar .env.local manualmente
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error("Erro: SUPABASE_SERVICE_ROLE_KEY não encontrada.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
-- 1. Tabelas
CREATE TABLE IF NOT EXISTS communities (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), creator_id UUID NOT NULL, name TEXT NOT NULL, description TEXT, image_url TEXT, is_private BOOLEAN DEFAULT true, created_at TIMESTAMP WITH TIME ZONE DEFAULT now());
CREATE TABLE IF NOT EXISTS community_members (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE, user_id UUID NOT NULL, role TEXT DEFAULT 'member', joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(), UNIQUE(community_id, user_id));
CREATE TABLE IF NOT EXISTS community_posts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, user_name TEXT NOT NULL, content TEXT NOT NULL, community_id UUID REFERENCES communities(id) ON DELETE CASCADE, type TEXT DEFAULT 'tip', points_earned INTEGER DEFAULT 0, attachments TEXT[] DEFAULT '{}', tags TEXT[] DEFAULT '{}', created_at TIMESTAMP WITH TIME ZONE DEFAULT now());
CREATE TABLE IF NOT EXISTS post_likes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE, user_id UUID NOT NULL, UNIQUE(post_id, user_id));
CREATE TABLE IF NOT EXISTS post_comments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE, user_id UUID NOT NULL, user_name TEXT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT now());

-- 2. Desabilitar RLS para facilitar o teste inicial
ALTER TABLE communities DISABLE ROW LEVEL SECURITY;
ALTER TABLE community_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments DISABLE ROW LEVEL SECURITY;
`;

async function run() {
  console.log("1. Criando tabelas no banco de dados...");
  
  // Como o RPC exec_sql pode não existir, tentaremos rodar queries simples via rest API se possível, 
  // mas o Supabase não permite rodar DDL arbitrário via API REST comum sem RPC.
  // Por isso, avisaremos se o RPC falhar.
  const { error: sqlError } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (sqlError) {
    console.log("⚠️ Nota: Não consegui rodar o SQL automaticamente (o RPC 'exec_sql' não está habilitado).");
    console.log("👉 Por favor, cole o código do arquivo 'update_community_schema.sql' no SQL Editor do seu Supabase.");
  } else {
    console.log("✅ Tabelas criadas com sucesso!");
  }

  console.log("\n2. Criando bucket de Storage para fotos...");
  const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('community', {
    public: true
  });

  if (bucketError) {
    if (bucketError.message.includes('already exists')) {
      console.log("✅ Bucket 'community' já existe.");
    } else {
      console.error("❌ Erro ao criar bucket:", bucketError.message);
    }
  } else {
    console.log("✅ Bucket 'community' criado com sucesso!");
  }
}

run();
