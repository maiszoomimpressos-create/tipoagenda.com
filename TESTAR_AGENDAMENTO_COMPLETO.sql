-- =====================================================
-- TESTE COMPLETO: CRIAR AGENDAMENTO E VERIFICAR ENVIO
-- =====================================================
-- Este script cria um agendamento de teste e verifica se a mensagem é enviada
-- =====================================================

-- 1. Verificar empresa habilitada e cliente com telefone
SELECT 
    '=== CONFIGURAÇÃO NECESSÁRIA ===' as secao,
    c.id as company_id,
    c.name as empresa,
    c.whatsapp_messaging_enabled,
    cl.id as client_id,
    cl.name as cliente,
    cl.phone as telefone,
    CASE 
        WHEN c.whatsapp_messaging_enabled = FALSE THEN '❌ WhatsApp desabilitado'
        WHEN cl.phone IS NULL OR cl.phone = '' THEN '❌ Cliente sem telefone'
        ELSE '✅ OK'
    END as status
FROM companies c
CROSS JOIN clients cl
WHERE c.whatsapp_messaging_enabled = TRUE
  AND cl.phone IS NOT NULL 
  AND cl.phone != ''
  AND cl.phone != '00000000000'
LIMIT 1;

-- 2. Verificar regras de envio configuradas
SELECT 
    '=== REGRAS DE ENVIO ===' as secao,
    cms.id,
    mk.code as tipo_mensagem,
    cms.offset_value,
    cms.offset_unit,
    cms.reference,
    cms.is_active,
    CASE 
        WHEN cms.is_active = TRUE THEN '✅ ATIVA'
        ELSE '❌ INATIVA'
    END as status
FROM company_message_schedules cms
JOIN message_kinds mk ON mk.id = cms.message_kind_id
WHERE cms.channel = 'WHATSAPP'
  AND cms.is_active = TRUE
ORDER BY mk.code;

-- 3. Verificar templates configurados
SELECT 
    '=== TEMPLATES ===' as secao,
    cmt.id,
    mk.code as tipo_mensagem,
    cmt.template_text,
    cmt.is_active,
    CASE 
        WHEN cmt.is_active = TRUE THEN '✅ ATIVO'
        ELSE '❌ INATIVO'
    END as status
FROM company_message_templates cmt
JOIN message_kinds mk ON mk.id = cmt.message_kind_id
WHERE cmt.channel = 'WHATSAPP'
  AND cmt.is_active = TRUE
ORDER BY mk.code;

-- 4. Criar agendamento de teste para 5 minutos no futuro
-- IMPORTANTE: Ajuste os IDs conforme necessário
DO $$
DECLARE
    v_company_id UUID;
    v_client_id UUID;
    v_appointment_id UUID;
    v_appointment_date DATE;
    v_appointment_time TIME;
BEGIN
    -- Buscar primeira empresa habilitada e cliente com telefone
    SELECT c.id, cl.id INTO v_company_id, v_client_id
    FROM companies c
    CROSS JOIN clients cl
    WHERE c.whatsapp_messaging_enabled = TRUE
      AND cl.phone IS NOT NULL 
      AND cl.phone != ''
      AND cl.phone != '00000000000'
    LIMIT 1;
    
    IF v_company_id IS NULL OR v_client_id IS NULL THEN
        RAISE EXCEPTION '❌ Nenhuma empresa habilitada ou cliente com telefone encontrado';
    END IF;
    
    -- Criar agendamento para 5 minutos no futuro
    v_appointment_date := CURRENT_DATE;
    v_appointment_time := (NOW() AT TIME ZONE 'America/Sao_Paulo' + INTERVAL '5 minutes')::TIME;
    
    -- Inserir agendamento
    INSERT INTO appointments (
        company_id,
        client_id,
        appointment_date,
        appointment_time,
        status,
        created_at
    ) VALUES (
        v_company_id,
        v_client_id,
        v_appointment_date,
        v_appointment_time,
        'pendente',
        NOW()
    ) RETURNING id INTO v_appointment_id;
    
    RAISE NOTICE '✅ Agendamento criado: %', v_appointment_id;
    RAISE NOTICE '📅 Data: %', v_appointment_date;
    RAISE NOTICE '⏰ Hora: %', v_appointment_time;
    RAISE NOTICE '🏢 Empresa: %', v_company_id;
    RAISE NOTICE '👤 Cliente: %', v_client_id;
END $$;

-- 5. Verificar se o log foi criado automaticamente
SELECT 
    '=== LOG CRIADO AUTOMATICAMENTE ===' as secao,
    msl.id,
    msl.appointment_id,
    a.appointment_date,
    a.appointment_time,
    cl.name as cliente,
    mk.code as tipo_mensagem,
    msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
    NOW() AT TIME ZONE 'America/Sao_Paulo' as agora_brasilia,
    msl.status,
    CASE 
        WHEN msl.scheduled_for::timestamp <= NOW() THEN '⚠️ DEVERIA SER ENVIADA AGORA'
        ELSE '⏳ Aguardando horário: ' || (msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo')::text
    END as status_envio
FROM message_send_log msl
JOIN appointments a ON a.id = msl.appointment_id
JOIN clients cl ON cl.id = msl.client_id
JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE msl.appointment_id IN (
    SELECT id FROM appointments 
    WHERE created_at >= NOW() - INTERVAL '1 minute'
)
ORDER BY msl.created_at DESC
LIMIT 5;

-- 6. Aguardar alguns minutos e verificar se foi enviada
-- (Execute este SELECT após alguns minutos)
SELECT 
    '=== STATUS DA MENSAGEM (APÓS AGUARDAR) ===' as secao,
    msl.id,
    cl.name as cliente,
    msl.status,
    msl.sent_at AT TIME ZONE 'America/Sao_Paulo' as sent_at_brasilia,
    msl.provider_response,
    CASE 
        WHEN msl.status = 'SENT' THEN '✅ ENVIADA COM SUCESSO'
        WHEN msl.status = 'FAILED' THEN '❌ FALHOU: ' || COALESCE(msl.provider_response::text, 'Sem resposta')
        WHEN msl.status = 'PENDING' AND msl.scheduled_for::timestamp <= NOW() THEN '⚠️ AINDA PENDENTE (deveria ter sido enviada)'
        WHEN msl.status = 'PENDING' THEN '⏳ AGUARDANDO HORÁRIO'
        ELSE '❓ ' || msl.status
    END as resultado
FROM message_send_log msl
JOIN clients cl ON cl.id = msl.client_id
WHERE msl.appointment_id IN (
    SELECT id FROM appointments 
    WHERE created_at >= NOW() - INTERVAL '10 minutes'
)
ORDER BY msl.created_at DESC
LIMIT 5;
















