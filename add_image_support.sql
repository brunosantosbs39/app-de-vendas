-- 1. Garantir que a coluna image_url exista
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Criar o bucket de armazenamento para as fotos do feed se não existir
-- Nota: Isso geralmente é feito via painel, mas o código do app já tenta criar via API.
-- Este SQL serve como lembrete para as permissões.
