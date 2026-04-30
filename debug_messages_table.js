
const { createClient } = require('@supabase/supabase-js');

// URL e Chave fixas para o teste, já que o dotenv está falhando em ler o arquivo por algum motivo de encoding/formatação
const url = "https://bshjiswopzdefzwsgwcb.supabase.co";
const key = "sb_publishable_AE-hwuYq-HZ62fVIeqhc_g_hKJ9dEoR";

const supabase = createClient(url, key);

async function checkTableStructure() {
  console.log('--- Verificando estrutura da tabela "messages" ---');
  
  // Tentar inserir com receiver_id (que estava no SQL)
  console.log('Testando receiver_id...');
  const { error: err1 } = await supabase.from('messages').insert([{
    content: 'Teste receiver_id',
    sender_id: '00000000-0000-0000-0000-000000000000',
    sender_name: 'Diagnóstico',
    receiver_id: '00000000-0000-0000-0000-000000000000'
  }]);

  if (err1) console.log('Erro receiver_id:', err1.message);
  else console.log('Sucesso com receiver_id!');

  // Tentar inserir com recipient_id (que está no código atual)
  console.log('Testando recipient_id...');
  const { error: err2 } = await supabase.from('messages').insert([{
    content: 'Teste recipient_id',
    sender_id: '00000000-0000-0000-0000-000000000000',
    sender_name: 'Diagnóstico',
    recipient_id: '00000000-0000-0000-0000-000000000000'
  }]);

  if (err2) console.log('Erro recipient_id:', err2.message);
  else console.log('Sucesso com recipient_id!');

  // Verificar colunas reais se houver algum dado
  const { data } = await supabase.from('messages').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Colunas detectadas na tabela:', Object.keys(data[0]));
  } else {
    console.log('Tabela sem registros para detecção automática de colunas.');
  }
}

checkTableStructure();
