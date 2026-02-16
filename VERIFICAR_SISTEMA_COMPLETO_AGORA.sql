-- =====================================================
-- VERIFICAÇÃO COMPLETA DO SISTEMA DE ENVIO AUTOMÁTICO
-- =====================================================

-- 1. Verificar mensagens pendentes que deveriam ser enviadas AGORA
SELECT 
    '=== MENSAGENS PENDENTES (DEVERIAM SER ENVIADAS) ===' as secao,
    msl.id,
    msl.appointment_id,
    a.appointment_date,
    a.appointment_time,
    cl.name as cliente,
    cl.phone as telefone,
    mk.code as tipo_mensagem,
    msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
    NOW() AT TIME ZONE 'America/Sao_Paulo' as agora_brasilia,
    msl.status,
    CASE 
        WHEN msl.scheduled_for::timestamp <= NOW() THEN '⚠️ DEVERIA TER SIDO ENVIADA JÁ!'
        ELSE '⏳ AINDA NÃO É HORA'
    END as status_envio
FROM message_send_log msl
LEFT JOIN appointments a ON a.id = msl.appointment_id
LEFT JOIN clients cl ON cl.id = msl.client_id
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE msl.status = 'PENDING'
ORDER BY msl.scheduled_for
LIMIT 20;

-- 2. Verificar mensagens enviadas recentemente (últimas 2 horas)
SELECT 
    '=== MENSAGENS ENVIADAS RECENTEMENTE ===' as secao,
    msl.id,
    cl.name as cliente,
    mk.code as tipo_mensagem,
    msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
    msl.sent_at AT TIME ZONE 'America/Sao_Paulo' as sent_at_brasilia,
    msl.status,
    CASE 
        WHEN msl.provider_response::text LIKE '%success%' OR msl.provider_response::text LIKE '%200%' THEN '✅ SUCESSO'
        WHEN msl.provider_response::text LIKE '%ERR_NO_WHATSAPP_CONNECTION%' THEN '❌ ERRO: Conexão WhatsApp não configurada'
        ELSE '⚠️ VERIFICAR'
    END as resultado
FROM message_send_log msl
LEFT JOIN clients cl ON cl.id = msl.client_id
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE msl.status IN ('SENT', 'FAILED')
  AND msl.updated_at >= NOW() - INTERVAL '2 hours'
ORDER BY msl.updated_at DESC
LIMIT 20;

-- 3. Verificar logs de execução do worker (últimas 10 execuções)
SELECT 
    '=== LOGS DE EXECUÇÃO DO WORKER ===' as secao,
    execution_time AT TIME ZONE 'America/Sao_Paulo' as execution_time_brasilia,
    status,
    messages_processed,
    messages_sent,
    messages_failed,
    execution_duration_ms,
    error_message,
    details
FROM worker_execution_logs
ORDER BY execution_time DESC
LIMIT 10;

-- 4. Resumo geral por status
SELECT 
    '=== RESUMO GERAL ===' as secao,
    status,
    COUNT(*) as total,
    MIN(created_at) as primeira_criada,
    MAX(updated_at) as ultima_atualizada
FROM message_send_log
GROUP BY status
ORDER BY status;

-- 5. Verificar se a service_role_key está configurada
SELECT 
    '=== CONFIGURAÇÃO SERVICE_ROLE_KEY ===' as secao,
    CASE 
        WHEN current_setting('app.settings.service_role_key', true) IS NOT NULL 
         AND current_setting('app.settings.service_role_key', true) != '' 
        THEN '✅ CONFIGURADA (tamanho: ' || length(current_setting('app.settings.service_role_key', true)) || ' caracteres)'
        ELSE '❌ NÃO CONFIGURADA - A Edge Function pode rejeitar as requisições'
    END as status_config
FROM (SELECT 1) as dummy;

-- 6. Verificar cron job status
SELECT 
    '=== STATUS DO CRON JOB ===' as secao,
    jobid,
    jobname,
    schedule,
    active,
    CASE 
        WHEN active AND schedule = '* * * * *' THEN '✅ ATIVO - Executa a cada 1 minuto'
        WHEN active THEN '✅ ATIVO - Frequência: ' || schedule
        ELSE '❌ INATIVO'
    END as status
FROM cron.job
WHERE jobname = 'whatsapp-message-scheduler-worker';






