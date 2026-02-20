-- =====================================================
-- VERIFICAR SISTEMA COMPLETO DE WHATSAPP
-- =====================================================

-- 1. Verificar se trigger existe e está ativo
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    CASE tgenabled
        WHEN 'O' THEN '✅ ATIVO'
        WHEN 'D' THEN '❌ DESABILITADO'
        ELSE '⚠️ DESCONHECIDO'
    END as status
FROM pg_trigger
WHERE tgname = 'trg_appointment_creation_whatsapp';

-- 2. Verificar cron job
SELECT 
    jobid,
    jobname,
    schedule,
    active,
    CASE active
        WHEN true THEN '✅ ATIVO'
        ELSE '❌ INATIVO'
    END as status_cron
FROM cron.job
WHERE jobname LIKE '%whatsapp%' 
   OR command LIKE '%whatsapp-message-scheduler%';

-- 3. Verificar logs PENDING (últimas 24h)
SELECT 
    msl.id,
    msl.appointment_id,
    a.appointment_date,
    a.appointment_time,
    mk.code as tipo_mensagem,
    msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
    NOW() AT TIME ZONE 'America/Sao_Paulo' as agora_brasilia,
    msl.status,
    CASE 
        WHEN msl.scheduled_for < NOW() AND msl.status = 'PENDING' THEN '⚠️ ATRASADA - DEVERIA TER SIDO ENVIADA'
        WHEN msl.status = 'SENT' THEN '✅ ENVIADA'
        WHEN msl.status = 'FAILED' THEN '❌ FALHOU'
        ELSE '⏳ PENDENTE'
    END as status_detalhado
FROM message_send_log msl
JOIN appointments a ON a.id = msl.appointment_id
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE msl.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY msl.created_at DESC
LIMIT 10;

-- 4. Verificar última execução do cron (últimas 2 horas)
SELECT 
    jobid,
    runid,
    status,
    return_message,
    start_time,
    end_time,
    CASE 
        WHEN status = 'succeeded' THEN '✅ SUCESSO'
        WHEN status = 'failed' THEN '❌ FALHOU'
        ELSE '⚠️ ' || status
    END as status_detalhado
FROM cron.job_run_details
WHERE jobid IN (
    SELECT jobid 
    FROM cron.job 
    WHERE jobname LIKE '%whatsapp%' 
       OR command LIKE '%whatsapp-message-scheduler%'
)
AND start_time >= NOW() - INTERVAL '2 hours'
ORDER BY start_time DESC
LIMIT 5;

    
SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.created_at,
    c.name as cliente,
    c.phone as telefone,
    comp.name as empresa,
    comp.whatsapp_messaging_enabled
FROM appointments a
LEFT JOIN clients c ON c.id = a.client_id
LEFT JOIN companies comp ON comp.id = a.company_id
WHERE a.appointment_time::TEXT LIKE '09:%'
ORDER BY a.created_at DESC
LIMIT 1;












