-- =====================================================
-- CRIAR TRIGGER PARA AGENDAR MENSAGENS AUTOMATICAMENTE
-- =====================================================
-- Execute este script AGORA no Supabase SQL Editor
-- Isso garante que mensagens sejam agendadas automaticamente
-- quando um agendamento é criado, independente do frontend
-- =====================================================

-- 1. Criar função do trigger para CRIAÇÃO de agendamento
CREATE OR REPLACE FUNCTION public.handle_appointment_creation_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    -- Quando um agendamento é CRIADO, agendar mensagens automaticamente
    BEGIN
        PERFORM public.schedule_whatsapp_messages_for_appointment(NEW.id);
    EXCEPTION WHEN OTHERS THEN
        -- Logar erro mas não impedir a criação do agendamento
        RAISE WARNING 'Erro ao agendar mensagens WhatsApp para agendamento %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$function$;

-- 2. Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trg_appointment_creation_whatsapp ON public.appointments;

-- 3. Criar trigger (executa AUTOMATICAMENTE após INSERT)
CREATE TRIGGER trg_appointment_creation_whatsapp
    AFTER INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_appointment_creation_whatsapp();

-- 4. Verificar se foi criado
SELECT 
    '✅ TRIGGER CRIADO COM SUCESSO!' as status,
    tgname as trigger_name,
    tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trg_appointment_creation_whatsapp';

-- 5. Testar com o agendamento que você acabou de criar
-- (Substitua 'ID_DO_AGENDAMENTO_23H' pelo ID real)
-- SELECT public.schedule_whatsapp_messages_for_appointment('ID_DO_AGENDAMENTO_23H'::UUID);

-- 6. Verificar se os logs foram criados
-- SELECT * FROM message_send_log 
-- WHERE appointment_id = 'ID_DO_AGENDAMENTO_23H'
-- ORDER BY created_at DESC;













