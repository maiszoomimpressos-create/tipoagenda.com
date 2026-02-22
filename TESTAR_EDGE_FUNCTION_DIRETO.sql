-- =====================================================
-- TESTAR SE A EDGE FUNCTION ESTÁ ENCONTRANDO AS MENSAGENS
-- =====================================================

-- 1. Verificar quantas mensagens PENDING existem
SELECT 
    COUNT(*) as total_pending,
    'Total de mensagens PENDING' as descricao
FROM message_send_log
WHERE status = 'PENDING';

-- 2. Verificar se há mensagens PENDING que deveriam ser enviadas (scheduled_for <= NOW())
SELECT 
    COUNT(*) as total_pending_para_enviar,
    'Mensagens PENDING que deveriam ser enviadas agora' as descricao
FROM message_send_log
WHERE status = 'PENDING'
  AND scheduled_for <= NOW();

-- 3. Verificar detalhes das mensagens PENDING
SELECT 
    msl.id,
    msl.appointment_id,
    msl.scheduled_for,
    msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
    NOW() AT TIME ZONE 'America/Sao_Paulo' as agora_brasilia,
    msl.status,
    CASE 
        WHEN msl.scheduled_for <= NOW() THEN '✅ DEVERIA SER ENVIADA AGORA'
        ELSE '⏳ AINDA NÃO É HORA'
    END as status_envio
FROM message_send_log msl
WHERE msl.status = 'PENDING'
ORDER BY msl.scheduled_for ASC
LIMIT 10;

-- 4. Verificar se há políticas RLS que podem estar bloqueando
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_condition,
    with_check as with_check_condition
FROM pg_policies
WHERE tablename = 'message_send_log';

-- 5. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '⚠️ RLS HABILITADO (pode bloquear service_role se mal configurado)'
        ELSE '✅ RLS DESABILITADO (service_role tem acesso total)'
    END as status_rls
FROM pg_tables
WHERE tablename = 'message_send_log';















