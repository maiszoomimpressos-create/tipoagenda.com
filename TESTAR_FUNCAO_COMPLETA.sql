-- =====================================================
-- TESTE COMPLETO DA FUNÇÃO schedule_whatsapp_messages_for_appointment
-- =====================================================
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Verificar se a função existe
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Função EXISTE'
        ELSE '❌ Função NÃO EXISTE - Execute: 20260210_schedule_whatsapp_messages_on_appointment.sql'
    END as status,
    proname as nome_funcao,
    pg_get_userbyid(proowner) as owner,
    CASE 
        WHEN prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_mode
FROM pg_proc
WHERE proname = 'schedule_whatsapp_messages_for_appointment';

-- 2. Testar função com um appointment_id real
-- Substitua pelo ID de um agendamento que você criou
SELECT 
    '=== TESTE DA FUNÇÃO ===' as secao,
    public.schedule_whatsapp_messages_for_appointment('1fdca959-d735-4c50-bfe9-39b7d154f998'::UUID) as resultado;

-- 3. Verificar se logs foram criados
SELECT 
    '=== LOGS CRIADOS ===' as secao,
    id,
    appointment_id,
    message_kind_id,
    scheduled_for,
    status,
    created_at
FROM message_send_log
WHERE appointment_id = '1fdca959-d735-4c50-bfe9-39b7d154f998'
ORDER BY created_at DESC;

-- 4. Verificar detalhes do agendamento usado no teste
SELECT 
    '=== DETALHES DO AGENDAMENTO ===' as secao,
    a.id,
    a.company_id,
    a.client_id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    c.whatsapp_messaging_enabled,
    cl.phone,
    (SELECT COUNT(*) FROM company_message_schedules 
     WHERE company_id = a.company_id 
     AND channel = 'WHATSAPP' 
     AND is_active = TRUE) as regras_ativas
FROM appointments a
JOIN companies c ON c.id = a.company_id
JOIN clients cl ON cl.id = a.client_id
WHERE a.id = '1fdca959-d735-4c50-bfe9-39b7d154f998';

