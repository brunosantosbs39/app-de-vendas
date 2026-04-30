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
  const today = new Date().toISOString().split('T')[0];
  console.log(`--- VERIFICANDO ROTA PARA HOJE (${today}) ---`);
  
  const { data: appointments, error: aptError } = await supabase
    .from('appointments')
    .select(`
      id,
      appointment_date,
      client_id,
      clients (
        id,
        name,
        address,
        latitude,
        longitude
      )
    `)
    .gte('appointment_date', today)
    .lt('appointment_date', new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  if (aptError) {
    console.error("ERRO AO BUSCAR AGENDAMENTOS:", aptError.message);
    return;
  }

  console.log(`Encontrados ${appointments.length} agendamentos para hoje.`);

  appointments.forEach((apt, i) => {
    const client = apt.clients;
    console.log(`\n[${i + 1}] Cliente: ${client?.name}`);
    console.log(`    Data: ${apt.appointment_date}`);
    console.log(`    Endereço: ${client?.address || 'NÃO INFORMADO'}`);
    console.log(`    Coordenadas: ${client?.latitude ? 'SIM' : 'NÃO'} (${client?.latitude}, ${client?.longitude})`);
  });

  const validPoints = appointments.filter(apt => apt.clients?.latitude && apt.clients?.longitude);
  console.log(`\nTOTAL DE PONTOS VÁLIDOS PARA ROTA: ${validPoints.length}`);
}

check();
