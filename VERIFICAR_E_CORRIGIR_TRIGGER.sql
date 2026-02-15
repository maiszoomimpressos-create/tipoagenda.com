-- Verificar se trigger existe
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    CASE 
        WHEN tgname = 'trg_appointment_creation_whatsapp' THEN '✅ TRIGGER EXISTE'
        ELSE '❌ TRIGGER NÃO EXISTE'
    END as status
FROM pg_trigger
WHERE tgname = 'trg_appointment_creation_whatsapp';

-- Buscar agendamento mais recente (09:00 de amanhã)
SELECT id, appointment_date, appointment_time, created_at
FROM appointments
WHERE appointment_time::TEXT LIKE '09:%'
ORDER BY created_at DESC
LIMIT 1;

-- Executar função manualmente para o agendamento mais recente
SELECT public.schedule_whatsapp_messages_for_appointment(
    (SELECT id FROM appointments WHERE appointment_time::TEXT LIKE '09:%' ORDER BY created_at DESC LIMIT 1)
) as resultado;

-- Verificar logs criados
SELECT * FROM message_send_log 
WHERE appointment_id = (SELECT id FROM appointments WHERE appointment_time::TEXT LIKE '09:%' ORDER BY created_at DESC LIMIT 1);





