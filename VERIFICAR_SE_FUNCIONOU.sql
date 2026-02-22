-- =====================================================
-- VERIFICAR SE AS MENSAGENS ESTÃO SENDO ENVIADAS
-- =====================================================

-- 1. Verificar status atual das mensagens PENDING
SELECT 
    COUNT(*) as total_pending,
    COUNT(CASE WHEN scheduled_for <= NOW() THEN 1 END) as pending_para_enviar,
    COUNT(CASE WHEN scheduled_for > NOW() THEN 1 END) as pending_futuras
FROM message_send_log
WHERE status = 'PENDING';

-- 2. Verificar mensagens que foram enviadas recentemente (últimas 2 horas)
SELECT 
    status,
    COUNT(*) as total,
    MIN(updated_at) as primeira_atualizacao,
    MAX(updated_at) as ultima_atualizacao
FROM message_send_log
WHERE updated_at >= NOW() - INTERVAL '2 hours'
GROUP BY status
ORDER BY status;

-- 3. Verificar mensagens que mudaram de status recentemente
SELECT 
    msl.id,
    msl.appointment_id,
    msl.status,
    msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
    msl.sent_at AT TIME ZONE 'America/Sao_Paulo' as sent_at_brasilia,
    msl.provider_response,
    msl.updated_at AT TIME ZONE 'America/Sao_Paulo' as updated_at_brasilia,
    CASE 
        WHEN msl.status = 'SENT' THEN '✅ ENVIADA'
        WHEN msl.status = 'FAILED' THEN '❌ FALHOU'
        WHEN msl.status = 'PENDING' AND msl.scheduled_for <= NOW() THEN '⚠️ AINDA PENDENTE (deveria ter sido enviada)'
        ELSE '⏳ PENDENTE'
    END as status_detalhado
FROM message_send_log msl
WHERE msl.updated_at >= NOW() - INTERVAL '2 hours'
   OR (msl.status = 'PENDING' AND msl.scheduled_for <= NOW())
ORDER BY msl.updated_at DESC NULLS LAST, msl.scheduled_for ASC
LIMIT 20;

-- 4. Verificar última execução do cron
SELECT 
    runid,
    status,
    return_message,
    start_time AT TIME ZONE 'America/Sao_Pailo' as start_time_brasilia,
    end_time AT TIME ZONE 'America/Sao_Paulo' as end_time_brasilia,
    CASE 
        WHEN status = 'succeeded' THEN '✅ SUCESSO'
        WHEN status = 'failed' THEN '❌ FALHOU'
        ELSE '⚠️ ' || status
    END as status_detalhado
FROM cron.job_run_details
WHERE jobid = (
    SELECT jobid 
    FROM cron.job 
    WHERE jobname = 'whatsapp-message-scheduler-job'
)
ORDER BY start_time DESC
LIMIT 3;















