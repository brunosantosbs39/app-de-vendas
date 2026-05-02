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
  console.log("--- VERIFICANDO EXISTÊNCIA DA TABELA INSTALLMENTS ---");
  
  const { data, error } = await supabase.from('installments').select('*').limit(1);
  
  if (error) {
    console.error(`ERRO: ${error.message}`);
    console.error(`CÓDIGO: ${error.code}`);
    console.error(`DETALHE: ${error.details}`);
    console.error(`HINT: ${error.hint}`);
  } else {
    console.log(`SUCESSO: Tabela encontrada.`);
    console.log(`DADOS:`, data);
  }
}

check();
