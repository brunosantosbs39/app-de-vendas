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

async function check() {
  console.log("--- TESTANDO ACESSO À TABELA INSTALLMENTS ---");
  
  const { data, error } = await supabase.from('installments').select('*').limit(1);
  
  if (error) {
    if (error.code === 'PGRST205') {
      console.error("❌ ERRO: A tabela 'installments' NÃO EXISTE no banco de dados.");
      console.log("\nINSTRUÇÃO: Como o acesso direto via script falhou, você precisa criar a tabela manualmente.");
    } else {
      console.error(`ERRO (${error.code}): ${error.message}`);
    }
  } else {
    console.log("✅ SUCESSO: A tabela 'installments' foi encontrada e está acessível!");
  }
}

check();
