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

async function seed() {
  console.log("--- GERANDO DADOS DE TESTE PARA ROTA ---");

  // 1. Pegar alguns clientes
  const { data: clients } = await supabase.from('clients').select('id, name, user_id').limit(3);
  
  if (!clients || clients.length < 3) {
    console.error("Necessário pelo menos 3 clientes no banco.");
    return;
  }

  const testAddresses = [
    { 
      address: "Av. Paulista, 1000, São Paulo, SP",
      lat: -23.5615,
      lng: -46.6560
    },
    { 
      address: "Rua Augusta, 1500, São Paulo, SP",
      lat: -23.5594,
      lng: -46.6621
    },
    { 
      address: "Parque Ibirapuera, São Paulo, SP",
      lat: -23.5874,
      lng: -46.6576
    }
  ];

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const addr = testAddresses[i];

    console.log(`Atualizando ${client.name} com endereço de teste...`);
    
    // Atualizar cliente
    await supabase.from('clients').update({
      address: addr.address,
      latitude: addr.lat,
      longitude: addr.lng
    }).eq('id', client.id);

    // Criar agendamento para hoje
    const apptTime = new Date();
    apptTime.setHours(10 + i, 0, 0, 0);

    console.log(`Criando agendamento para ${client.name} às ${apptTime.getHours()}:00...`);
    
    await supabase.from('appointments').insert({
      user_id: client.user_id,
      client_id: client.id,
      title: `Visita para ${client.name}`,
      description: "Teste de rota inteligente",
      appointment_date: apptTime.toISOString(),
      type: 'visit',
      status: 'scheduled'
    });
  }

  console.log("\nSUCESSO: Dados de teste gerados!");
  console.log("Abra a página de Agenda > Rota Inteligente no app.");
}

seed();
