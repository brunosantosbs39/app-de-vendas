-- Executar este comando no SQL Editor do seu Supabase para habilitar o salvamento das mensagens personalizadas.

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS default_billing_message TEXT;

-- Atualizar o cache do PostgREST
NOTIFY pgrst, 'reload schema';
