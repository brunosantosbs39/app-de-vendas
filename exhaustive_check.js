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
  console.log("--- BUSCA EXAUSTIVA DE AGENDAMENTOS E VENDAS ---");
  
  // 1. Todos os agendamentos
  const { data: appt } = await supabase.from('appointments').select('*, clients(name)');
  console.log(`\n[appointments] Total: ${appt?.length || 0}`);
  if (appt?.length > 0) console.log(appt);

  // 2. Scheduled Sales
  const { data: sched } = await supabase.from('scheduled_sales').select('*, clients(name)');
  console.log(`\n[scheduled_sales] Total: ${sched?.length || 0}`);
  if (sched?.length > 0) console.log(sched);

  // 3. Clientes com status financeiro diferente de 'ok'
  const { data: clients } = await supabase.from('clients').select('name, financial_status, total_debt').neq('financial_status', 'ok');
  console.log(`\n[clientes com dívida] Total: ${clients?.length || 0}`);
  if (clients?.length > 0) console.log(clients);
}

check();
