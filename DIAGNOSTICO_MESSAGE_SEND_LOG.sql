-- =====================================================
-- DIAGNÓSTICO: Por que message_send_log está vazia?
-- =====================================================
-- Execute este script após criar um agendamento para
-- identificar qual condição não está sendo atendida
-- =====================================================

-- 1. Verificar se a função existe
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'schedule_whatsapp_messages_for_appointment';

-- 2. Verificar últimos agendamentos criados
SELECT 
    id,
    company_id,
    client_id,
    appointment_date,
    appointment_time,
    status,
    created_at
FROM appointments
ORDER BY created_at DESC
LIMIT 5;

-- 3. Para cada agendamento recente, verificar condições:
-- Substitua '<APPOINTMENT_ID>' pelo ID de um agendamento criado

-- 3.1. Verificar se empresa tem WhatsApp habilitado
SELECT 
    a.id as appointment_id,
    a.company_id,
    c.name as empresa,
    c.whatsapp_messaging_enabled,
    CASE 
        WHEN c.whatsapp_messaging_enabled = TRUE THEN '✅ WhatsApp HABILITADO'
        ELSE '❌ WhatsApp DESABILITADO'
    END as status_whatsapp
FROM appointments a
JOIN companies c ON c.id = a.company_id
WHERE a.id IN (
    SELECT id FROM appointments ORDER BY created_at DESC LIMIT 3
);

-- 3.2. Verificar se cliente tem telefone
SELECT 
    a.id as appointment_id,
    a.client_id,
    cl.name as cliente,
    cl.phone,
    CASE 
        WHEN cl.phone IS NOT NULL AND TRIM(cl.phone) != '' THEN '✅ TEM TELEFONE'
        ELSE '❌ SEM TELEFONE'
    END as status_telefone
FROM appointments a
JOIN clients cl ON cl.id = a.client_id
WHERE a.id IN (
    SELECT id FROM appointments ORDER BY created_at DESC LIMIT 3
);

-- 3.3. Verificar se há regras de envio ativas
SELECT 
    a.id as appointment_id,
    a.company_id,
    COUNT(cms.id) as total_regras_ativas,
    CASE 
        WHEN COUNT(cms.id) > 0 THEN '✅ TEM REGRAS ATIVAS'
        ELSE '❌ SEM REGRAS ATIVAS'
    END as status_regras
FROM appointments a
LEFT JOIN company_message_schedules cms ON 
    cms.company_id = a.company_id
    AND cms.channel = 'WHATSAPP'
    AND cms.is_active = TRUE
    AND cms.reference = 'APPOINTMENT_START'
WHERE a.id IN (
    SELECT id FROM appointments ORDER BY created_at DESC LIMIT 3
)
GROUP BY a.id, a.company_id;

-- 3.4. Verificar se há provedor WhatsApp ativo
SELECT 
    id,
    name,
    channel,
    is_active,
    CASE 
        WHEN is_active = TRUE THEN '✅ PROVEDOR ATIVO'
        ELSE '❌ PROVEDOR INATIVO'
    END as status_provedor
FROM messaging_providers
WHERE channel = 'WHATSAPP'
ORDER BY is_active DESC, created_at DESC;

-- 3.5. Verificar se há templates ativos
SELECT 
    a.id as appointment_id,
    a.company_id,
    COUNT(cmt.id) as total_templates_ativos,
    CASE 
        WHEN COUNT(cmt.id) > 0 THEN '✅ TEM TEMPLATES ATIVOS'
        ELSE '⚠️ SEM TEMPLATES (não crítico)'
    END as status_templates
FROM appointments a
LEFT JOIN company_message_templates cmt ON 
    cmt.company_id = a.company_id
    AND cmt.channel = 'WHATSAPP'
    AND cmt.is_active = TRUE
WHERE a.id IN (
    SELECT id FROM appointments ORDER BY created_at DESC LIMIT 3
)
GROUP BY a.id, a.company_id;

-- 4. Testar a função manualmente com um appointment_id
-- Substitua '<APPOINTMENT_ID>' pelo ID de um agendamento criado
-- SELECT public.schedule_whatsapp_messages_for_appointment('<APPOINTMENT_ID>'::UUID);

-- 5. Verificar se há logs na message_send_log
SELECT 
    id,
    appointment_id,
    message_kind_id,
    scheduled_for,
    status,
    created_at
FROM message_send_log
ORDER BY created_at DESC
LIMIT 10;

-- 6. Verificar detalhes completos de um agendamento específico
-- Substitua '<APPOINTMENT_ID>' pelo ID de um agendamento criado
/*
SELECT 
    a.id as appointment_id,
    a.company_id,
    a.client_id,
    a.appointment_date,
    a.appointment_time,
    a.status as appointment_status,
    c.name as empresa,
    c.whatsapp_messaging_enabled,
    cl.name as cliente,
    cl.phone as telefone_cliente,
    (SELECT COUNT(*) FROM company_message_schedules 
     WHERE company_id = a.company_id 
     AND channel = 'WHATSAPP' 
     AND is_active = TRUE) as total_regras_ativas,
    (SELECT COUNT(*) FROM messaging_providers 
     WHERE channel = 'WHATSAPP' 
     AND is_active = TRUE) as total_provedores_ativos
FROM appointments a
JOIN companies c ON c.id = a.company_id
JOIN clients cl ON cl.id = a.client_id
WHERE a.id = '<APPOINTMENT_ID>';
*/

