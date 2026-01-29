-- =====================================================
-- VERIFICAR SE OS CAMPOS user_id E queue_id EXISTEM
-- =====================================================
-- Execute este script para verificar se a migration foi aplicada
-- =====================================================

-- Verificar se as colunas existem na tabela messaging_providers
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'messaging_providers'
  AND column_name IN ('user_id', 'queue_id');

-- Se as colunas existirem, mostrar os valores atuais dos provedores
SELECT 
    id,
    name,
    user_id,
    queue_id,
    is_active
FROM messaging_providers
WHERE channel = 'WHATSAPP'
ORDER BY created_at DESC;

-- =====================================================
-- SE AS COLUNAS NÃO EXISTIREM, EXECUTE A MIGRATION:
-- =====================================================
-- Arquivo: supabase/migrations/20250128_add_user_id_queue_id_to_messaging_providers.sql
-- =====================================================

