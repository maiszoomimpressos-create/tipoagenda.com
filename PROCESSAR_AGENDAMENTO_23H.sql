-- =====================================================
-- PROCESSAR AGENDAMENTO DAS 23:00 QUE ACABOU DE CRIAR
-- =====================================================
-- Execute este script para processar o agendamento
-- que você acabou de criar e criar os logs
-- =====================================================

-- 1. Buscar o agendamento mais recente (das 23:00)
SELECT 
    id,
    appointment_date,
    appointment_time,
    status,
    created_at
FROM appointments
WHERE appointment_time::TEXT LIKE '23:%'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Processar esse agendamento (substitua o ID se necessário)
-- Primeiro, vamos pegar o ID automaticamente
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
        
        RAISE NOTICE 'Resultado: %', v_result;
    END IF;
END $$;

-- 3. Verificar se os logs foram criados
SELECT 
    msl.id,
    msl.appointment_id,
    mk.code as tipo_mensagem,
    TO_CHAR(msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') as scheduled_for_brasilia,
    msl.status,
    msl.created_at
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











