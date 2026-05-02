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
  console.log("--- ANALISANDO RECEBIMENTOS PENDENTES ---");
  
  // 1. Verificar Installments
  const { data: inst } = await supabase.from('installments').select('*, clients(name)');
  console.log(`\n[installments] Encontrados: ${inst?.length || 0}`);
  if (inst?.length > 0) console.log(inst);

  // 2. Verificar Orders com saldo devedor ou due_date
  const { data: ord } = await supabase
    .from('orders')
    .select('*, clients(name)')
    .or('status.eq.pending,payment_method.eq.fiado');
  console.log(`\n[orders pendentes/fiado] Encontrados: ${ord?.length || 0}`);
  if (ord?.length > 0) console.log(ord);

  // 3. Verificar Appointments (caso o usuário use como 'cobrança')
  const today = new Date().toISOString().split('T')[0];
  const { data: appt } = await supabase
    .from('appointments')
    .select('*, clients(name)')
    .gte('appointment_date', today);
  console.log(`\n[appointments futuros/hoje] Encontrados: ${appt?.length || 0}`);
  if (appt?.length > 0) console.log(appt);
}

check();
