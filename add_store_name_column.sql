-- Script para adicionar a coluna de local/loja na tabela de clientes
ALTER TABLE clients ADD COLUMN IF NOT EXISTS store_name TEXT;
