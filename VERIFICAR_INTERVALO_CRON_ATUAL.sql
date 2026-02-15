-- =====================================================
-- VERIFICAR INTERVALO ATUAL DO CRON JOB
-- =====================================================
-- Este script mostra qual é o intervalo configurado
-- para o worker de mensagens WhatsApp
-- =====================================================

-- 1. Verificar todos os jobs relacionados ao WhatsApp
SELECT 
    jobid,
    jobname,
    schedule,
    active,
    CASE 
        WHEN schedule = '* * * * *' THEN '✅ Executa a cada 1 minuto'
        WHEN schedule = '*/2 * * * *' THEN '⏱️ Executa a cada 2 minutos'
        WHEN schedule = '*/5 * * * *' THEN '⏱️ Executa a cada 5 minutos'
        WHEN schedule = '*/10 * * * *' THEN '⏱️ Executa a cada 10 minutos'
        ELSE '❓ Intervalo desconhecido: ' || schedule
    END as intervalo_descricao,
    command
FROM cron.job
WHERE jobname LIKE '%whatsapp%' 
   OR command LIKE '%whatsapp-message-scheduler%'
ORDER BY jobid DESC;

-- 2. Verificar última execução do cron
SELECT 
    j.jobid,
    j.jobname,
    j.schedule,
    j.active,
    jr.runid,
    jr.status,
    jr.return_message,
    jr.start_time,
    jr.end_time,
    CASE 
        WHEN jr.status = 'succeeded' THEN '✅ SUCESSO'
        WHEN jr.status = 'failed' THEN '❌ FALHOU'
        WHEN jr.status = 'running' THEN '⏳ EM EXECUÇÃO'
        ELSE '❓ ' || jr.status
    END as status_detalhado,
    EXTRACT(EPOCH FROM (jr.end_time - jr.start_time)) as duracao_segundos
FROM cron.job j
LEFT JOIN cron.job_run_details jr ON j.jobid = jr.jobid
WHERE j.jobname LIKE '%whatsapp%' 
   OR j.command LIKE '%whatsapp-message-scheduler%'
ORDER BY jr.start_time DESC
LIMIT 10;

-- 3. Verificar quantas mensagens estão aguardando envio
SELECT 
    COUNT(*) as total_pendentes,
    MIN(scheduled_for) as proxima_mensagem,
    MAX(scheduled_for) as ultima_mensagem,
    NOW() as agora,
    CASE 
        WHEN MIN(scheduled_for) <= NOW() THEN '⚠️ Há mensagens atrasadas'
        ELSE '✅ Todas as mensagens estão no futuro'
    END as status
FROM message_send_log
WHERE status = 'PENDING';


