-- =====================================================
-- VERIFICAÇÃO COMPLETA DO AGENDAMENTO DAS 22:00
-- =====================================================
-- Execute este script para verificar se o agendamento
-- das 22:00 foi criado corretamente e se os logs de
-- mensagens foram gerados.
-- =====================================================

-- 1. Buscar o agendamento mais recente (das 22:00)
SELECT 
    a.id as appointment_id,
    a.company_id,
    a.client_id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.created_at,
    CASE 
        WHEN a.appointment_time::TEXT LIKE '22:%' THEN '✅ HORÁRIO 22:00'
        ELSE '❌ HORÁRIO DIFERENTE'
    END as validacao_horario
FROM appointments a
WHERE a.appointment_date = CURRENT_DATE
    AND a.appointment_time::TEXT LIKE '22:%'
ORDER BY a.created_at DESC
LIMIT 1;

-- 2. Verificar se a empresa tem WhatsApp habilitado
SELECT 
    c.id as company_id,
    c.name as empresa,
    c.whatsapp_messaging_enabled,
    CASE 
        WHEN c.whatsapp_messaging_enabled = TRUE THEN '✅ WhatsApp HABILITADO'
        ELSE '❌ WhatsApp DESABILITADO'
    END as status_whatsapp
FROM companies c
WHERE c.id = (
    SELECT company_id 
    FROM appointments 
    WHERE appointment_date = CURRENT_DATE
        AND appointment_time::TEXT LIKE '22:%'
    ORDER BY created_at DESC 
    LIMIT 1
);

-- 3. Verificar se o cliente tem telefone válido
SELECT 
    cl.id as client_id,
    cl.name as cliente,
    cl.phone,
    CASE 
        WHEN cl.phone IS NOT NULL 
            AND TRIM(cl.phone) != '' 
            AND cl.phone != '00000000000' 
            AND LENGTH(REPLACE(cl.phone, ' ', '')) >= 10 
        THEN '✅ TELEFONE VÁLIDO'
        ELSE '❌ TELEFONE INVÁLIDO OU AUSENTE'
    END as status_telefone
FROM clients cl
WHERE cl.id = (
    SELECT client_id 
    FROM appointments 
    WHERE appointment_date = CURRENT_DATE
        AND appointment_time::TEXT LIKE '22:%'
    ORDER BY created_at DESC 
    LIMIT 1
);

-- 4. Verificar regras de envio configuradas
SELECT 
    cms.id,
    cms.company_id,
    mk.code as tipo_mensagem,
    cms.offset_value,
    cms.offset_unit,
    cms.reference,
    cms.is_active,
    CASE 
        WHEN cms.offset_value < 0 THEN CONCAT('Envia ', ABS(cms.offset_value), ' ', cms.offset_unit, ' ANTES do agendamento')
        WHEN cms.offset_value > 0 THEN CONCAT('Envia ', cms.offset_value, ' ', cms.offset_unit, ' DEPOIS do agendamento')
        ELSE 'Envia no momento do agendamento'
    END as descricao_envio,
    CASE 
        WHEN cms.is_active = TRUE THEN '✅ REGRA ATIVA'
        ELSE '❌ REGRA INATIVA'
    END as status_regra
FROM company_message_schedules cms
JOIN message_kinds mk ON mk.id = cms.message_kind_id
WHERE cms.company_id = (
    SELECT company_id 
    FROM appointments 
    WHERE appointment_date = CURRENT_DATE
        AND appointment_time::TEXT LIKE '22:%'
    ORDER BY created_at DESC 
    LIMIT 1
)
AND cms.channel = 'WHATSAPP'
AND cms.is_active = TRUE
ORDER BY cms.offset_value;

-- 5. Verificar se os logs foram criados na message_send_log
SELECT 
    msl.id,
    msl.appointment_id,
    mk.code as tipo_mensagem,
    msl.scheduled_for,
    msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
    NOW() AT TIME ZONE 'America/Sao_Paulo' as agora_brasilia,
    msl.status,
    msl.sent_at,
    msl.provider_response,
    msl.created_at,
    CASE 
        WHEN msl.status = 'PENDING' AND msl.scheduled_for <= NOW() THEN '⏰ JÁ DEVERIA TER SIDO ENVIADO'
        WHEN msl.status = 'PENDING' AND msl.scheduled_for > NOW() THEN '⏳ AGUARDANDO HORÁRIO'
        WHEN msl.status = 'SENT' THEN '✅ MENSAGEM ENVIADA'
        WHEN msl.status = 'FAILED' THEN '❌ FALHA NO ENVIO'
        ELSE '❓ STATUS DESCONHECIDO'
    END as status_envio
FROM message_send_log msl
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE msl.appointment_id = (
    SELECT id 
    FROM appointments 
    WHERE appointment_date = CURRENT_DATE
        AND appointment_time::TEXT LIKE '22:%'
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY msl.created_at DESC;

-- 6. Calcular quando cada mensagem deve ser enviada (baseado nas regras)
SELECT 
    mk.code as tipo_mensagem,
    cms.offset_value,
    cms.offset_unit,
    cms.reference,
    a.appointment_date || ' ' || a.appointment_time as horario_agendamento,
    CASE 
        WHEN cms.reference = 'APPOINTMENT_START' THEN
            -- Calcular data/hora de referência (início do agendamento)
            (a.appointment_date || ' ' || SUBSTRING(a.appointment_time::TEXT FROM 1 FOR 5))::TIMESTAMP
        WHEN cms.reference = 'APPOINTMENT_CREATION' THEN
            a.created_at::TIMESTAMP
        ELSE NULL
    END as data_referencia,
    CASE 
        WHEN cms.reference = 'APPOINTMENT_START' THEN
            -- Aplicar offset ao horário do agendamento
            (a.appointment_date || ' ' || SUBSTRING(a.appointment_time::TEXT FROM 1 FOR 5))::TIMESTAMP 
            + (cms.offset_value || ' ' || LOWER(cms.offset_unit))::INTERVAL
        WHEN cms.reference = 'APPOINTMENT_CREATION' THEN
            a.created_at::TIMESTAMP 
            + (cms.offset_value || ' ' || LOWER(cms.offset_unit))::INTERVAL
        ELSE NULL
    END as quando_enviar,
    CASE 
        WHEN cms.reference = 'APPOINTMENT_START' THEN
            ((a.appointment_date || ' ' || SUBSTRING(a.appointment_time::TEXT FROM 1 FOR 5))::TIMESTAMP 
            + (cms.offset_value || ' ' || LOWER(cms.offset_unit))::INTERVAL) AT TIME ZONE 'America/Sao_Paulo'
        WHEN cms.reference = 'APPOINTMENT_CREATION' THEN
            (a.created_at::TIMESTAMP 
            + (cms.offset_value || ' ' || LOWER(cms.offset_unit))::INTERVAL) AT TIME ZONE 'America/Sao_Paulo'
        ELSE NULL
    END as quando_enviar_brasilia
FROM appointments a
CROSS JOIN company_message_schedules cms
JOIN message_kinds mk ON mk.id = cms.message_kind_id
WHERE a.id = (
    SELECT id 
    FROM appointments 
    WHERE appointment_date = CURRENT_DATE
        AND appointment_time::TEXT LIKE '22:%'
    ORDER BY created_at DESC 
    LIMIT 1
)
AND cms.company_id = a.company_id
AND cms.channel = 'WHATSAPP'
AND cms.is_active = TRUE
ORDER BY cms.offset_value;

-- 7. RESUMO FINAL
SELECT 
    'RESUMO DO AGENDAMENTO DAS 22:00' as titulo,
    (SELECT COUNT(*) FROM appointments 
     WHERE appointment_date = CURRENT_DATE 
     AND appointment_time::TEXT LIKE '22:%') as total_agendamentos_22h,
    (SELECT COUNT(*) FROM message_send_log msl
     JOIN appointments a ON a.id = msl.appointment_id
     WHERE a.appointment_date = CURRENT_DATE
     AND a.appointment_time::TEXT LIKE '22:%'
     AND msl.status = 'PENDING') as logs_pending,
    (SELECT COUNT(*) FROM message_send_log msl
     JOIN appointments a ON a.id = msl.appointment_id
     WHERE a.appointment_date = CURRENT_DATE
     AND a.appointment_time::TEXT LIKE '22:%'
     AND msl.status = 'SENT') as logs_sent,
    (SELECT COUNT(*) FROM message_send_log msl
     JOIN appointments a ON a.id = msl.appointment_id
     WHERE a.appointment_date = CURRENT_DATE
     AND a.appointment_time::TEXT LIKE '22:%'
     AND msl.status = 'FAILED') as logs_failed;



















