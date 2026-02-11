-- =====================================================
-- VERIFICAR SE A FUNÇÃO ESTÁ FUNCIONANDO
-- =====================================================

-- 1. Verificar se a função existe
SELECT 
    proname as function_name,
    prorettype::regtype as return_type,
    prosecdef as security_definer,
    proconfig as config
FROM pg_proc
WHERE proname = 'schedule_whatsapp_messages_for_appointment';

-- 2. Verificar permissões da função
SELECT 
    p.proname as function_name,
    pg_get_userbyid(p.proowner) as owner,
    CASE 
        WHEN p.prosecdef THEN 'SECURITY DEFINER (executa com permissões do criador)'
        ELSE 'SECURITY INVOKER (executa com permissões do chamador)'
    END as security_mode
FROM pg_proc p
WHERE p.proname = 'schedule_whatsapp_messages_for_appointment';

-- 3. Verificar políticas RLS na message_send_log
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'message_send_log';

-- 4. Verificar se RLS está habilitado na message_send_log
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'message_send_log';

-- 5. Testar a função com um appointment_id real
-- Substitua '<APPOINTMENT_ID>' pelo ID de um agendamento que você criou
-- SELECT public.schedule_whatsapp_messages_for_appointment('<APPOINTMENT_ID>'::UUID);

-- 6. Verificar se há algum erro ao executar a função
-- Execute manualmente no Supabase SQL Editor:
-- SELECT public.schedule_whatsapp_messages_for_appointment('SEU_APPOINTMENT_ID_AQUI'::UUID);

