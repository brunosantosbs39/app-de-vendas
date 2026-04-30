-- Adicionar colunas de geolocalização que estão faltando
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS latitude DECIMAL(9,6);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS longitude DECIMAL(9,6);
