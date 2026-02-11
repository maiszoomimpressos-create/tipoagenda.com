-- =====================================================
-- VERIFICAR POR QUE MENSAGEM NÃO FOI ENVIADA
-- =====================================================
-- Execute este SQL para diagnosticar o problema
-- =====================================================

-- 1. Verificar agendamentos recentes (últimas 24h)
SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.company_id,
    c.name as empresa,
    a.client_id,
    cl.name as cliente,
    cl.phone as telefone_cliente,
    a.created_at
FROM appointments a
LEFT JOIN companies c ON c.id = a.company_id
LEFT JOIN clients cl ON cl.id = a.client_id
WHERE a.appointment_date >= CURRENT_DATE - INTERVAL '1 day'
  AND a.appointment_time >= '22:00:00'
ORDER BY a.appointment_date DESC, a.appointment_time DESC
LIMIT 10;

-- 2. Verificar se há mensagens programadas para esses agendamentos
SELECT 
    msl.id,
    msl.appointment_id,
    a.appointment_date,
    a.appointment_time,
    msl.scheduled_for,
    msl.status,
    msl.sent_at,
    msl.created_at
FROM message_send_log msl
JOIN appointments a ON a.id = msl.appointment_id
WHERE a.appointment_date >= CURRENT_DATE - INTERVAL '1 day'
  AND a.appointment_time >= '22:00:00'
ORDER BY msl.created_at DESC
LIMIT 10;

-- 3. Verificar configuração de mensagens da empresa
SELECT 
    c.id as company_id,
    c.name as empresa,
    c.whatsapp_messaging_enabled,
    COUNT(cms.id) as total_agendamentos_mensagem
FROM companies c
LEFT JOIN company_message_schedules cms ON cms.company_id = c.id
WHERE c.id IN (
    SELECT DISTINCT company_id 
    FROM appointments 
    WHERE appointment_date >= CURRENT_DATE - INTERVAL '1 day'
      AND appointment_time >= '22:00:00'
)
GROUP BY c.id, c.name, c.whatsapp_messaging_enabled;

-- 4. Verificar agendamentos de mensagem configurados
SELECT 
    cms.id,
    cms.company_id,
    c.name as empresa,
    cms.minutes_before,
    cms.message_template_id,
    mt.template_text,
    cms.is_active
FROM company_message_schedules cms
JOIN companies c ON c.id = cms.company_id
LEFT JOIN message_templates mt ON mt.id = cms.message_template_id
WHERE cms.company_id IN (
    SELECT DISTINCT company_id 
    FROM appointments 
    WHERE appointment_date >= CURRENT_DATE - INTERVAL '1 day'
      AND appointment_time >= '22:00:00'
)
ORDER BY cms.minutes_before;

-- 5. Verificar provedor WhatsApp ativo
SELECT 
    mp.id,
    mp.name,
    mp.channel,
    mp.is_active,
    mp.base_url,
    mp.auth_key,
    LEFT(mp.auth_token, 30) || '...' as auth_token_preview,
    mp.user_id,
    mp.queue_id
FROM messaging_providers mp
WHERE mp.channel = 'WHATSAPP'
  AND mp.is_active = true;

-- 6. Verificar últimos logs de mensagens (sucesso e erro)
SELECT 
    msl.id,
    msl.appointment_id,
    a.appointment_date,
    a.appointment_time,
    msl.scheduled_for,
    msl.status,
    msl.sent_at,
    msl.created_at,
    CASE 
        WHEN msl.scheduled_for::timestamp < NOW() AND msl.status = 'PENDING' THEN '⚠️ ATRASADA'
        WHEN msl.status = 'SENT' THEN '✅ ENVIADA'
        WHEN msl.status = 'FAILED' THEN '❌ FALHOU'
        ELSE '⏳ PENDENTE'
    END as status_detalhado
FROM message_send_log msl
JOIN appointments a ON a.id = msl.appointment_id
WHERE msl.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY msl.created_at DESC
LIMIT 20;

-- 7. Verificar se há agendamentos sem mensagens programadas
SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.company_id,
    c.name as empresa,
    c.whatsapp_messaging_enabled,
    cl.phone as telefone_cliente,
    CASE 
        WHEN msl.id IS NULL THEN '❌ SEM MENSAGEM PROGRAMADA'
        ELSE '✅ TEM MENSAGEM'
    END as status_mensagem
FROM appointments a
LEFT JOIN companies c ON c.id = a.company_id
LEFT JOIN clients cl ON cl.id = a.client_id
LEFT JOIN message_send_log msl ON msl.appointment_id = a.id
WHERE a.appointment_date >= CURRENT_DATE - INTERVAL '1 day'
  AND a.appointment_time >= '22:00:00'
  AND a.status IN ('pendente', 'confirmado')
ORDER BY a.appointment_date DESC, a.appointment_time DESC;

-- =====================================================
-- FIM
-- =====================================================

