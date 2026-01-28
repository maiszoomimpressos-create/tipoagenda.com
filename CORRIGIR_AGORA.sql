-- =====================================================
-- CORREÇÃO RÁPIDA: Verificar e Corrigir scheduled_for
-- =====================================================

-- 1. VERIFICAR O PROBLEMA
SELECT 
    'ANTES DA CORREÇÃO' as etapa,
    id,
    scheduled_for,
    status,
    CASE 
        WHEN scheduled_for::text LIKE '%-03:00' THEN '✅ BRASÍLIA'
        WHEN scheduled_for::text LIKE '%Z' THEN '❌ UTC (ERRADO)'
        WHEN scheduled_for::text LIKE '%+00:00' THEN '❌ UTC (ERRADO)'
        ELSE '⚠️ FORMATO DESCONHECIDO'
    END as timezone_status
FROM message_send_log
ORDER BY created_at DESC
LIMIT 10;

-- 2. DELETAR LOGS ANTIGOS EM UTC (se houver)
-- Descomente a linha abaixo se quiser deletar logs antigos
-- DELETE FROM message_send_log 
-- WHERE scheduled_for::text LIKE '%Z' 
--    OR scheduled_for::text LIKE '%+00:00';

-- 3. APÓS FAZER O DEPLOY E EXECUTAR A FUNÇÃO, VERIFICAR NOVAMENTE:
-- SELECT 
--     'DEPOIS DA CORREÇÃO' as etapa,
--     id,
--     scheduled_for,
--     status,
--     CASE 
--         WHEN scheduled_for::text LIKE '%-03:00' THEN '✅ BRASÍLIA (CORRETO)'
--         ELSE '❌ AINDA ERRADO'
--     END as timezone_status
-- FROM message_send_log
-- ORDER BY created_at DESC
-- LIMIT 10;

