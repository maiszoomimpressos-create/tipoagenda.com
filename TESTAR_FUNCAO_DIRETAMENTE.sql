-- =====================================================
-- TESTAR FUNÇÃO DIRETAMENTE COM APPOINTMENT_ID REAL
-- =====================================================
-- Execute este script substituindo o appointment_id
-- =====================================================

-- Testar com um dos agendamentos criados
SELECT public.schedule_whatsapp_messages_for_appointment('1fdca959-d735-4c50-bfe9-39b7d154f998'::UUID) as resultado;

-- Verificar se logs foram criados
SELECT 
    id,
    appointment_id,
    message_kind_id,
    scheduled_for,
    status,
    created_at
FROM message_send_log
WHERE appointment_id = '1fdca959-d735-4c50-bfe9-39b7d154f998';

