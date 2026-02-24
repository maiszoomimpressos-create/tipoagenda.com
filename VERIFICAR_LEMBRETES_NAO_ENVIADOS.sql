-- =====================================================
-- DIAGNÓSTICO: Por que lembretes não estão sendo enviados?
-- =====================================================

-- 1. Verificar mensagens PENDING de lembretes
SELECT 
    msl.id,
    msl.appointment_id,
    a.appointment_date,
    a.appointment_time,
    a.status as appointment_status,
    mk.code as tipo_mensagem,
    msl.scheduled_for,
    msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
    NOW() as agora_utc,
    NOW() AT TIME ZONE 'America/Sao_Paulo' as agora_brasilia,
    msl.status,
    CASE 
        WHEN msl.scheduled_for <= NOW() THEN '✅ DEVERIA SER ENVIADA'
        ELSE '⏳ AINDA NÃO É HORA'
    END as status_envio,
    EXTRACT(EPOCH FROM (NOW() - msl.scheduled_for)) / 60 as minutos_atraso
FROM message_send_log msl
INNER JOIN message_kinds mk ON mk.id = msl.message_kind_id
LEFT JOIN appointments a ON a.id = msl.appointment_id
WHERE msl.status = 'PENDING'
  AND mk.code = 'APPOINTMENT_REMINDER'
ORDER BY msl.scheduled_for DESC
LIMIT 20;

-- 2. Verificar mensagens PENDING de agradecimentos (para comparar)
SELECT 
    msl.id,
    msl.appointment_id,
    a.appointment_date,
    a.appointment_time,
    a.status as appointment_status,
    mk.code as tipo_mensagem,
    msl.scheduled_for,
    msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
    NOW() as agora_utc,
    NOW() AT TIME ZONE 'America/Sao_Paulo' as agora_brasilia,
    msl.status,
    CASE 
        WHEN msl.scheduled_for <= NOW() THEN '✅ DEVERIA SER ENVIADA'
        ELSE '⏳ AINDA NÃO É HORA'
    END as status_envio,
    EXTRACT(EPOCH FROM (NOW() - msl.scheduled_for)) / 60 as minutos_atraso
FROM message_send_log msl
INNER JOIN message_kinds mk ON mk.id = msl.message_kind_id
LEFT JOIN appointments a ON a.id = msl.appointment_id
WHERE msl.status = 'PENDING'
  AND mk.code = 'POST_SERVICE_THANKS'
ORDER BY msl.scheduled_for DESC
LIMIT 10;

-- 3. Verificar se há diferença no formato de scheduled_for entre lembretes e agradecimentos
SELECT 
    mk.code as tipo_mensagem,
    COUNT(*) as total,
    MIN(msl.scheduled_for) as primeiro_scheduled_for,
    MAX(msl.scheduled_for) as ultimo_scheduled_for,
    pg_typeof(msl.scheduled_for) as tipo_coluna
FROM message_send_log msl
INNER JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE msl.status = 'PENDING'
GROUP BY mk.code;

-- 4. Verificar última execução do worker
SELECT 
    wel.execution_time,
    wel.status,
    wel.messages_processed,
    wel.messages_sent,
    wel.messages_failed,
    wel.error_message,
    wel.details
FROM worker_execution_logs wel
ORDER BY wel.execution_time DESC
LIMIT 5;














