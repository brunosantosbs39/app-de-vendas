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

async function inspect() {
  console.log("--- INSPECIONANDO TABELA CLIENTS ---");
  
  const { data, error } = await supabase.from('clients').select('*').limit(1);
  
  if (error) {
    console.error("ERRO AO BUSCAR DADOS:", error.message);
  } else if (data && data.length > 0) {
    console.log("Colunas encontradas:", Object.keys(data[0]).join(', '));
  } else {
    console.log("Nenhum dado encontrado para inspecionar colunas.");
  }
}

inspect();
