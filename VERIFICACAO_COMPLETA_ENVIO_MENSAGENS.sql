-- =====================================================
-- VERIFICAÇÃO COMPLETA DO SISTEMA DE ENVIO DE MENSAGENS
-- =====================================================
-- Execute este SQL para garantir que tudo está configurado
-- =====================================================

-- 1. VERIFICAR SE O CRON JOB ESTÁ ATIVO E CORRETO
SELECT 
    '=== CRON JOB ===' as secao,
    jobid,
    jobname,
    schedule,
    active,
    CASE 
        WHEN active = true THEN '✅ ATIVO'
        ELSE '❌ INATIVO'
    END as status,
    command
FROM cron.job
WHERE jobname LIKE '%whatsapp%' 
   OR command LIKE '%whatsapp-message-scheduler%'
ORDER BY jobid;

-- 2. VERIFICAR ÚLTIMAS EXECUÇÕES DO CRON (últimas 2 horas)
SELECT 
    '=== ÚLTIMAS EXECUÇÕES DO CRON ===' as secao,
    jobid,
    start_time,
    end_time,
    status,
    return_message,
    CASE 
        WHEN status = 'succeeded' THEN '✅ SUCESSO'
        WHEN status = 'failed' THEN '❌ FALHOU'
        ELSE '⏳ EM EXECUÇÃO'
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
LIMIT 10;

-- 3. VERIFICAR EMPRESAS COM WHATSAPP HABILITADO
SELECT 
    '=== EMPRESAS COM WHATSAPP HABILITADO ===' as secao,
    id,
    name,
    whatsapp_messaging_enabled,
    CASE 
        WHEN whatsapp_messaging_enabled = true THEN '✅ HABILITADO'
        ELSE '❌ DESABILITADO'
    END as status
FROM companies
WHERE whatsapp_messaging_enabled = true;

-- 4. VERIFICAR PROVEDOR DE WHATSAPP ATIVO
SELECT 
    '=== PROVEDOR DE WHATSAPP ===' as secao,
    id,
    name,
    channel,
    is_active,
    base_url,
    CASE 
        WHEN is_active = true AND channel = 'WHATSAPP' THEN '✅ PROVEDOR ATIVO'
        ELSE '❌ PROVEDOR INATIVO OU CANAL INCORRETO'
    END as status
FROM messaging_providers
WHERE channel = 'WHATSAPP'
ORDER BY is_active DESC, created_at DESC
LIMIT 1;

-- 5. VERIFICAR REGRAS DE ENVIO ATIVAS
SELECT 
    '=== REGRAS DE ENVIO ATIVAS ===' as secao,
    cms.id,
    cms.company_id,
    c.name as empresa,
    mk.code as tipo_mensagem,
    mk.description as descricao_tipo,
    cms.offset_value,
    cms.offset_unit,
    cms.reference,
    cms.is_active,
    CASE 
        WHEN cms.is_active = true THEN '✅ ATIVA'
        ELSE '❌ INATIVA'
    END as status
FROM company_message_schedules cms
JOIN companies c ON c.id = cms.company_id
JOIN message_kinds mk ON mk.id = cms.message_kind_id
WHERE cms.channel = 'WHATSAPP'
  AND cms.is_active = TRUE
  AND c.whatsapp_messaging_enabled = TRUE
ORDER BY cms.created_at DESC;

-- 6. VERIFICAR AGENDAMENTOS DE AMANHÃ ÀS 6:00
SELECT 
    '=== AGENDAMENTOS DE AMANHÃ ÀS 6:00 ===' as secao,
    a.id as appointment_id,
    a.company_id,
    c.name as empresa,
    cl.name as cliente,
    cl.phone as telefone,
    a.appointment_date,
    a.appointment_time,
    a.status as status_agendamento,
    CASE 
        WHEN cl.phone IS NOT NULL AND TRIM(cl.phone) != '' AND cl.phone != '00000000000' THEN '✅ TEM TELEFONE'
        ELSE '❌ SEM TELEFONE VÁLIDO'
    END as status_telefone
FROM appointments a
JOIN companies c ON c.id = a.company_id
LEFT JOIN clients cl ON cl.id = a.client_id
WHERE a.appointment_date = CURRENT_DATE + INTERVAL '1 day'
  AND a.appointment_time = TIME '06:00:00'
  AND a.status NOT IN ('cancelado', 'desistencia')
ORDER BY a.created_at DESC;

-- 7. VERIFICAR LOGS DE MENSAGENS PARA OS AGENDAMENTOS DE AMANHÃ
SELECT 
    '=== LOGS DE MENSAGENS PARA AMANHÃ 6:00 ===' as secao,
    msl.id as log_id,
    msl.appointment_id,
    a.appointment_date,
    a.appointment_time,
    mk.code as tipo_mensagem,
    msl.scheduled_for,
    msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
    msl.status,
    msl.sent_at,
    msl.provider_response,
    CASE 
        WHEN msl.status = 'PENDING' AND msl.scheduled_for::timestamp <= NOW() THEN '⚠️ PENDENTE E DEVERIA TER SIDO ENVIADA'
        WHEN msl.status = 'PENDING' THEN '⏳ PENDENTE - AGUARDANDO HORÁRIO'
        WHEN msl.status = 'SENT' THEN '✅ ENVIADA'
        WHEN msl.status = 'FAILED' THEN '❌ FALHOU'
        WHEN msl.status = 'CANCELLED' THEN '🚫 CANCELADA'
        ELSE '❓ STATUS DESCONHECIDO'
    END as status_detalhado
FROM message_send_log msl
JOIN appointments a ON a.id = msl.appointment_id
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE a.appointment_date = CURRENT_DATE + INTERVAL '1 day'
  AND a.appointment_time = TIME '06:00:00'
ORDER BY msl.created_at DESC;

-- 8. VERIFICAR SE A FUNÇÃO schedule_whatsapp_messages_for_appointment EXISTE
SELECT 
    '=== FUNÇÃO SQL schedule_whatsapp_messages_for_appointment ===' as secao,
    proname as nome_funcao,
    CASE 
        WHEN proname = 'schedule_whatsapp_messages_for_appointment' THEN '✅ FUNÇÃO EXISTE'
        ELSE '❌ FUNÇÃO NÃO ENCONTRADA'
    END as status
FROM pg_proc
WHERE proname = 'schedule_whatsapp_messages_for_appointment';

-- 9. RESUMO FINAL - CHECKLIST
SELECT 
    '=== RESUMO FINAL - CHECKLIST ===' as secao,
    (SELECT COUNT(*) FROM cron.job WHERE jobname LIKE '%whatsapp%' AND active = true) as cron_jobs_ativos,
    (SELECT COUNT(*) FROM companies WHERE whatsapp_messaging_enabled = true) as empresas_habilitadas,
    (SELECT COUNT(*) FROM messaging_providers WHERE channel = 'WHATSAPP' AND is_active = true) as provedores_ativos,
    (SELECT COUNT(*) FROM company_message_schedules cms 
     JOIN companies c ON c.id = cms.company_id 
     WHERE cms.channel = 'WHATSAPP' AND cms.is_active = TRUE AND c.whatsapp_messaging_enabled = TRUE) as regras_ativas,
    (SELECT COUNT(*) FROM appointments 
     WHERE appointment_date = CURRENT_DATE + INTERVAL '1 day' 
       AND appointment_time = TIME '06:00:00'
       AND status NOT IN ('cancelado', 'desistencia')) as agendamentos_amanha_6h,
    (SELECT COUNT(*) FROM message_send_log msl
     JOIN appointments a ON a.id = msl.appointment_id
     WHERE a.appointment_date = CURRENT_DATE + INTERVAL '1 day'
       AND a.appointment_time = TIME '06:00:00'
       AND msl.status = 'PENDING') as mensagens_pendentes;

-- =====================================================
-- FIM DA VERIFICAÇÃO
-- =====================================================


