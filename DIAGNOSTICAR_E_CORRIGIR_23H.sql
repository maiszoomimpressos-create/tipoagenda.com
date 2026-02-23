-- =====================================================
-- DIAGNOSTICAR E CORRIGIR AGENDAMENTO DAS 23:00
-- =====================================================

-- 1. Verificar se o trigger existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'trg_appointment_creation_whatsapp'
        ) THEN '✅ TRIGGER EXISTE'
        ELSE '❌ TRIGGER NÃO EXISTE - Execute CRIAR_TRIGGER_AGORA.sql primeiro!'
    END as status_trigger;

-- 2. Buscar o agendamento das 23:00
SELECT 
    id,
    company_id,
    client_id,
    appointment_date,
    appointment_time,
    status,
    created_at
FROM appointments
WHERE appointment_time::TEXT LIKE '23:%'
ORDER BY created_at DESC
LIMIT 1;

-- 3. Verificar se a empresa tem WhatsApp habilitado
SELECT 
    c.id,
    c.name,
    c.whatsapp_messaging_enabled,
    CASE 
        WHEN c.whatsapp_messaging_enabled = TRUE THEN '✅ HABILITADO'
        ELSE '❌ DESABILITADO'
    END as status
FROM companies c
WHERE c.id = (
    SELECT company_id 
    FROM appointments 
    WHERE appointment_time::TEXT LIKE '23:%'
    ORDER BY created_at DESC 
    LIMIT 1
);

-- 4. Verificar se o cliente tem telefone válido
SELECT 
    cl.id,
    cl.name,
    cl.phone,
    CASE 
        WHEN cl.phone IS NOT NULL 
            AND TRIM(cl.phone) != '' 
            AND cl.phone != '00000000000' 
            AND LENGTH(REGEXP_REPLACE(cl.phone, '[^0-9]', '', 'g')) >= 10 
        THEN '✅ TELEFONE VÁLIDO'
        ELSE '❌ TELEFONE INVÁLIDO'
    END as status_telefone
FROM clients cl
WHERE cl.id = (
    SELECT client_id 
    FROM appointments 
    WHERE appointment_time::TEXT LIKE '23:%'
    ORDER BY created_at DESC 
    LIMIT 1
);

-- 5. Verificar regras de envio configuradas
SELECT 
    cms.id,
    mk.code as tipo_mensagem,
    cms.offset_value,
    cms.offset_unit,
    cms.reference,
    cms.is_active
FROM company_message_schedules cms
JOIN message_kinds mk ON mk.id = cms.message_kind_id
WHERE cms.company_id = (
    SELECT company_id 
    FROM appointments 
    WHERE appointment_time::TEXT LIKE '23:%'
    ORDER BY created_at DESC 
    LIMIT 1
)
AND cms.channel = 'WHATSAPP'
AND cms.is_active = TRUE;

-- 6. EXECUTAR A FUNÇÃO MANUALMENTE
DO $$
DECLARE
    v_appointment_id UUID;
    v_result JSONB;
BEGIN
    -- Buscar o agendamento mais recente das 23:00
    SELECT id INTO v_appointment_id
    FROM appointments
    WHERE appointment_time::TEXT LIKE '23:%'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_appointment_id IS NULL THEN
        RAISE NOTICE '❌ Nenhum agendamento das 23:00 encontrado';
    ELSE
        RAISE NOTICE '✅ Processando agendamento: %', v_appointment_id;
        
        -- Chamar a função
        v_result := public.schedule_whatsapp_messages_for_appointment(v_appointment_id);
        
        RAISE NOTICE '';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'RESULTADO DA FUNÇÃO:';
        RAISE NOTICE '========================================';
        RAISE NOTICE '%', v_result::TEXT;
        RAISE NOTICE '========================================';
    END IF;
END $$;

-- 7. Verificar logs após execução
SELECT 
    msl.id,
    msl.appointment_id,
    mk.code as tipo_mensagem,
    TO_CHAR(msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') as scheduled_for_brasilia,
    msl.status,
    TO_CHAR(msl.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') as log_criado_brasilia
FROM message_send_log msl
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE msl.appointment_id = (
    SELECT id 
    FROM appointments 
    WHERE appointment_time::TEXT LIKE '23:%'
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY msl.created_at DESC;

















