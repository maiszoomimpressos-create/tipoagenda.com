-- =====================================================
-- VERIFICAR SE O SISTEMA ESTÁ FUNCIONANDO AUTOMATICAMENTE
-- =====================================================

-- 1. Verificar status do cron job
SELECT 
    '=== CRON JOB ===' as secao,
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

-- 2. Verificar últimas execuções do cron (últimas 5)
SELECT 
    '=== ÚLTIMAS EXECUÇÕES DO CRON ===' as secao,
    runid,
    start_time AT TIME ZONE 'America/Sao_Paulo' as start_time_brasilia,
    end_time AT TIME ZONE 'America/Sao_Paulo' as end_time_brasilia,
    status,
    return_message,
    CASE 
        WHEN status = 'succeeded' THEN '✅ SUCESSO'
        WHEN status = 'failed' THEN '❌ FALHOU'
        ELSE '⚠️ ' || status
    END as resultado
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'whatsapp-message-scheduler-worker')
ORDER BY start_time DESC
LIMIT 5;

-- 3. Verificar logs de execução do worker (últimas 5)
SELECT 
    '=== LOGS DO WORKER ===' as secao,
    execution_time AT TIME ZONE 'America/Sao_Paulo' as execution_time_brasilia,
    status,
    messages_processed,
    messages_sent,
    messages_failed,
    execution_duration_ms,
    CASE 
        WHEN status = 'SUCCESS' AND messages_sent > 0 THEN '✅ SUCESSO - ' || messages_sent || ' mensagens enviadas'
        WHEN status = 'SUCCESS' THEN '✅ SUCESSO - Nenhuma mensagem pendente'
        WHEN status = 'ERROR' THEN '❌ ERRO: ' || COALESCE(error_message, 'Erro desconhecido')
        WHEN status = 'PARTIAL' THEN '⚠️ PARCIAL - ' || messages_sent || ' enviadas, ' || messages_failed || ' falharam'
        ELSE '❓ ' || status
    END as resultado
FROM worker_execution_logs
ORDER BY execution_time DESC
LIMIT 5;

-- 4. Verificar mensagens pendentes que deveriam ser enviadas
SELECT 
    '=== MENSAGENS PENDENTES ===' as secao,
    COUNT(*) as total_pendentes,
    MIN(scheduled_for AT TIME ZONE 'America/Sao_Paulo') as proxima_mensagem,
    MAX(scheduled_for AT TIME ZONE 'America/Sao_Paulo') as ultima_agendada
FROM message_send_log
WHERE status = 'PENDING'
  AND scheduled_for::timestamp <= NOW();

-- 5. Verificar mensagens processadas nas últimas 2 horas
SELECT 
    '=== MENSAGENS PROCESSADAS (ÚLTIMAS 2H) ===' as secao,
    status,
    COUNT(*) as total,
    MIN(updated_at AT TIME ZONE 'America/Sao_Paulo') as primeira,
    MAX(updated_at AT TIME ZONE 'America/Sao_Paulo') as ultima
FROM message_send_log
WHERE updated_at >= NOW() - INTERVAL '2 hours'
  AND status IN ('SENT', 'FAILED')
GROUP BY status
ORDER BY status;

-- 6. Verificar se a service_role_key está configurada
SELECT 
    '=== AUTENTICAÇÃO ===' as secao,
    CASE 
        WHEN get_service_role_key() != '' 
        THEN '✅ Service role key configurada (' || length(get_service_role_key()) || ' caracteres)'
        ELSE '❌ Service role key NÃO configurada'
    END as status_auth
FROM (SELECT 1) as dummy;
















