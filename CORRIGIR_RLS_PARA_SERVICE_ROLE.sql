-- =====================================================
-- GARANTIR QUE SERVICE_ROLE PODE ACESSAR message_send_log
-- =====================================================
-- A Edge Function usa service_role, que deveria bypassar RLS
-- Mas vamos garantir que não há políticas bloqueando
-- =====================================================

-- 1. Verificar políticas RLS atuais
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN roles::text LIKE '%service_role%' THEN '✅ INCLUI service_role'
        ELSE '❌ NÃO inclui service_role'
    END as status_service_role
FROM pg_policies
WHERE tablename = 'message_send_log';

-- 2. IMPORTANTE: service_role geralmente BYPASSA RLS automaticamente
-- Mas vamos garantir que não há políticas que possam estar interferindo

-- 3. Verificar se há políticas que bloqueiam SELECT
SELECT 
    policyname,
    cmd,
    qual as using_condition,
    CASE 
        WHEN cmd = 'SELECT' AND qual IS NOT NULL THEN '⚠️ PODE ESTAR BLOQUEANDO'
        WHEN cmd = 'SELECT' AND qual IS NULL THEN '✅ PERMISSIVA'
        ELSE 'N/A'
    END as status
FROM pg_policies
WHERE tablename = 'message_send_log'
  AND cmd = 'SELECT';

-- 4. Se necessário, criar política explícita para service_role
-- (geralmente não é necessário, mas pode ajudar em casos específicos)
-- NOTA: service_role geralmente bypassa RLS, então esta política pode não ser necessária
-- Mas vamos criar para garantir

-- Remover política antiga se existir
DROP POLICY IF EXISTS "service_role_full_access" ON public.message_send_log;

-- Criar política que permite acesso total para service_role
-- (mesmo que service_role geralmente bypassa RLS, isso garante acesso explícito)
CREATE POLICY "service_role_full_access" 
ON public.message_send_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '⚠️ RLS HABILITADO'
        ELSE '✅ RLS DESABILITADO'
    END as status_rls
FROM pg_tables
WHERE tablename = 'message_send_log';

-- NOTA: service_role geralmente bypassa RLS mesmo quando está habilitado
-- Mas se houver problemas, podemos desabilitar RLS temporariamente para testes










