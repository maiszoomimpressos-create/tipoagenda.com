-- =====================================================
-- VERIFICAR CRON JOB DO WHATSAPP SCHEDULER
-- =====================================================
-- Execute este SQL para verificar se o cron job está ativo
-- =====================================================

-- 1. Verificar se a extensão pg_cron está habilitada
SELECT 
    extname as extensao,
    extversion as versao
FROM pg_extension
WHERE extname = 'pg_cron';

-- 2. Verificar todos os jobs do cron relacionados ao WhatsApp
SELECT 
    jobid,
    jobname,
    schedule,
    active,
    command,
    nodename,
    nodeport,
    database,
    username
FROM cron.job
WHERE jobname LIKE '%whatsapp%' 
   OR command LIKE '%whatsapp-message-scheduler%'
ORDER BY jobid;

-- 3. Verificar histórico de execução do cron (últimas 24h)
SELECT 
    jobid,
    runid,
    job_pid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE jobid IN (
    SELECT jobid 
    FROM cron.job 
    WHERE jobname LIKE '%whatsapp%' 
       OR command LIKE '%whatsapp-message-scheduler%'
)
AND start_time >= NOW() - INTERVAL '24 hours'
ORDER BY start_time DESC
LIMIT 20;

-- 4. Verificar se há mensagens pendentes que deveriam ter sido enviadas
SELECT 
    msl.id,
    msl.appointment_id,
    a.appointment_date,
    a.appointment_time,
    msl.scheduled_for,
    msl.status,
    msl.sent_at,
    NOW() as agora,
    CASE 
        WHEN msl.scheduled_for::timestamp < NOW() AND msl.status = 'PENDING' THEN '⚠️ ATRASADA - DEVERIA TER SIDO ENVIADA'
        WHEN msl.status = 'SENT' THEN '✅ ENVIADA'
        WHEN msl.status = 'FAILED' THEN '❌ FALHOU'
        ELSE '⏳ PENDENTE'
    END as status_detalhado
FROM message_send_log msl
JOIN appointments a ON a.id = msl.appointment_id
WHERE msl.scheduled_for::timestamp >= NOW() - INTERVAL '2 hours'
   OR (msl.scheduled_for::timestamp < NOW() AND msl.status = 'PENDING')
ORDER BY msl.scheduled_for DESC
LIMIT 20;

-- =====================================================
-- FIM
-- =====================================================

