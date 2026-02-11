-- =====================================================
-- EXECUTAR FUNÇÃO COMPLETA - COPIE E COLE TUDO
-- =====================================================

-- 1. Executar função com UUID completo
SELECT public.schedule_whatsapp_messages_for_appointment('e4204821-d351-4139-8ebc-1058a3dec197'::UUID);

-- 2. Verificar logs criados
SELECT 
    id,
    appointment_id,
    message_kind_id,
    scheduled_for,
    status,
    created_at
FROM message_send_log 
WHERE appointment_id = 'e4204821-d351-4139-8ebc-1058a3dec197'
ORDER BY created_at DESC;


