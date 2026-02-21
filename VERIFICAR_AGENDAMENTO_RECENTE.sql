-- =====================================================
-- VERIFICAÇÃO DO AGENDAMENTO MAIS RECENTE
-- =====================================================
-- Este script busca o agendamento mais recente criado
-- e verifica se os logs de mensagens foram gerados.
-- =====================================================

-- 1. Buscar o agendamento mais recente (últimos 5)
SELECT 
    a.id as appointment_id,
    a.company_id,
    a.client_id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.created_at,
    TO_CHAR(a.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') as criado_brasilia,
    TO_CHAR((a.appointment_date || ' ' || a.appointment_time)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') as agendado_brasilia
FROM appointments a
ORDER BY a.created_at DESC
LIMIT 5;

-- 2. Verificar se a empresa do agendamento mais recente tem WhatsApp habilitado
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
    ORDER BY created_at DESC 
    LIMIT 1
);

-- 3. Verificar se o cliente do agendamento mais recente tem telefone válido
SELECT 
    cl.id as client_id,
    cl.name as cliente,
    cl.phone,
    CASE 
        WHEN cl.phone IS NOT NULL 
            AND TRIM(cl.phone) != '' 
            AND cl.phone != '00000000000' 
            AND LENGTH(REPLACE(REPLACE(REPLACE(cl.phone, ' ', ''), '-', ''), '(', ''), ')', '')) >= 10 
        THEN '✅ TELEFONE VÁLIDO'
        ELSE '❌ TELEFONE INVÁLIDO OU AUSENTE'
    END as status_telefone
FROM clients cl
WHERE cl.id = (
    SELECT client_id 
    FROM appointments 
    ORDER BY created_at DESC 
    LIMIT 1
);

-- 4. Verificar regras de envio configuradas para a empresa do agendamento mais recente
SELECT 
    cms.id,
    cms.company_id,
    mk.code as tipo_mensagem,
    mk.name as nome_tipo_mensagem,
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
    ORDER BY created_at DESC 
    LIMIT 1
)
AND cms.channel = 'WHATSAPP'
AND cms.is_active = TRUE
ORDER BY cms.offset_value;

-- 5. Verificar se os logs foram criados na message_send_log para o agendamento mais recente
SELECT 
    msl.id,
    msl.appointment_id,
    mk.code as tipo_mensagem,
    msl.scheduled_for,
    TO_CHAR(msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') as scheduled_for_brasilia,
    TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') as agora_brasilia,
    msl.status,
    msl.sent_at,
    msl.provider_response,
    TO_CHAR(msl.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') as log_criado_brasilia,
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
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY msl.created_at DESC;

-- 6. Executar a função manualmente para o agendamento mais recente (para testar)
SELECT 
    'EXECUTANDO FUNÇÃO MANUALMENTE' as acao,
    public.schedule_whatsapp_messages_for_appointment(
        (SELECT id FROM appointments ORDER BY created_at DESC LIMIT 1)
    ) as resultado;

-- 7. Verificar novamente os logs após executar a função
SELECT 
    'LOGS APÓS EXECUÇÃO MANUAL' as titulo,
    COUNT(*) as total_logs,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
    COUNT(*) FILTER (WHERE status = 'SENT') as sent,
    COUNT(*) FILTER (WHERE status = 'FAILED') as failed
FROM message_send_log
WHERE appointment_id = (
    SELECT id 
    FROM appointments 
    ORDER BY created_at DESC 
    LIMIT 1
);

-- 8. Detalhes completos dos logs após execução manual
SELECT 
    msl.id,
    msl.appointment_id,
    mk.code as tipo_mensagem,
    TO_CHAR(msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') as scheduled_for_brasilia,
    TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') as agora_brasilia,
    msl.status,
    CASE 
        WHEN msl.status = 'PENDING' AND msl.scheduled_for <= NOW() THEN '⏰ JÁ DEVERIA TER SIDO ENVIADO'
        WHEN msl.status = 'PENDING' AND msl.scheduled_for > NOW() THEN '⏳ AGUARDANDO HORÁRIO'
        WHEN msl.status = 'SENT' THEN '✅ MENSAGEM ENVIADA'
        WHEN msl.status = 'FAILED' THEN '❌ FALHA NO ENVIO'
        ELSE '❓ STATUS DESCONHECIDO'
    END as status_envio,
    msl.provider_response
FROM message_send_log msl
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE msl.appointment_id = (
    SELECT id 
    FROM appointments 
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY msl.created_at DESC;















