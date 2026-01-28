-- =====================================================
-- VERIFICAR SE scheduled_for ESTÁ EM HORÁRIO DE BRASÍLIA
-- =====================================================

-- 1. Verificar estrutura da tabela message_send_log
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'message_send_log'
  AND column_name = 'scheduled_for';

-- 2. Verificar os últimos logs criados
SELECT 
    id,
    scheduled_for,
    status,
    created_at,
    -- Verificar se scheduled_for tem timezone (deve ter -03:00)
    CASE 
        WHEN scheduled_for::text LIKE '%-03:00' THEN '✅ BRASÍLIA'
        WHEN scheduled_for::text LIKE '%Z' THEN '❌ UTC'
        WHEN scheduled_for::text LIKE '%+00:00' THEN '❌ UTC'
        ELSE '⚠️ FORMATO DESCONHECIDO'
    END as timezone_status
FROM message_send_log
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar se há logs PENDING
SELECT 
    COUNT(*) as total_pending,
    MIN(scheduled_for) as proximo_envio,
    MAX(scheduled_for) as ultimo_agendado
FROM message_send_log
WHERE status = 'PENDING';

