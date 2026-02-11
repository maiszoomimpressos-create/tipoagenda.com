-- =====================================================
-- TESTE DIRETO: Inserir log manualmente para verificar
-- se há problemas de permissão ou estrutura
-- =====================================================

-- 1. Verificar dados do agendamento
SELECT 
    a.id,
    a.company_id,
    a.client_id,
    a.appointment_date,
    a.appointment_time,
    c.whatsapp_messaging_enabled,
    cl.phone
FROM appointments a
JOIN companies c ON c.id = a.company_id
JOIN clients cl ON cl.id = a.client_id
WHERE a.id = 'e4204821-d351-4139-8ebc-1058a3dec197';

-- 2. Verificar regra de envio
SELECT 
    cms.id,
    cms.message_kind_id,
    cms.offset_value,
    cms.offset_unit,
    cms.reference
FROM company_message_schedules cms
WHERE cms.company_id = '3437e70c-049e-4dea-bb51-69c3dde89e59'
  AND cms.channel = 'WHATSAPP'
  AND cms.is_active = TRUE
  AND cms.reference = 'APPOINTMENT_START';

-- 3. Verificar provedor
SELECT id, name FROM messaging_providers 
WHERE channel = 'WHATSAPP' AND is_active = TRUE LIMIT 1;

-- 4. Tentar inserir log diretamente (simulando o que a função faz)
-- ATENÇÃO: Isso pode falhar por RLS, mas vamos ver o erro
INSERT INTO message_send_log (
    company_id,
    client_id,
    appointment_id,
    message_kind_id,
    channel,
    template_id,
    provider_id,
    scheduled_for,
    sent_at,
    status
) 
SELECT 
    a.company_id,
    a.client_id,
    a.id,
    cms.message_kind_id,
    'WHATSAPP',
    (SELECT id FROM company_message_templates 
     WHERE company_id = a.company_id
       AND message_kind_id = cms.message_kind_id
       AND channel = 'WHATSAPP'
       AND is_active = TRUE
     LIMIT 1),
    (SELECT id FROM messaging_providers 
     WHERE channel = 'WHATSAPP' AND is_active = TRUE LIMIT 1),
    (
        -- Calcular scheduled_for
        (
            EXTRACT(YEAR FROM a.appointment_date::DATE) || '-' ||
            LPAD(EXTRACT(MONTH FROM a.appointment_date::DATE)::TEXT, 2, '0') || '-' ||
            LPAD(EXTRACT(DAY FROM a.appointment_date::DATE)::TEXT, 2, '0') || 'T' ||
            LPAD(SPLIT_PART(a.appointment_time::TEXT, ':', 1), 2, '0') || ':' ||
            LPAD(SPLIT_PART(a.appointment_time::TEXT, ':', 2), 2, '0') || ':00-03:00'
        )::TIMESTAMPTZ + 
        (cms.offset_value || ' ' || LOWER(cms.offset_unit))::INTERVAL
    ),
    NULL,
    'PENDING'
FROM appointments a
CROSS JOIN company_message_schedules cms
WHERE a.id = 'e4204821-d351-4139-8ebc-1058a3dec197'
  AND cms.company_id = a.company_id
  AND cms.channel = 'WHATSAPP'
  AND cms.is_active = TRUE
  AND cms.reference = 'APPOINTMENT_START';

-- 5. Verificar se foi inserido
SELECT * FROM message_send_log 
WHERE appointment_id = 'e4204821-d351-4139-8ebc-1058a3dec197';

