-- =====================================================
-- CORRIGIR RLS: PERMITIR SERVICE_ROLE ACESSAR message_send_log
-- =====================================================
-- A Edge Function usa service_role, mas não há política RLS
-- que permita acesso. Vamos criar uma política explícita.
-- =====================================================

-- 1. Criar política que permite acesso TOTAL para service_role
-- (service_role geralmente bypassa RLS, mas vamos garantir com política explícita)
DROP POLICY IF EXISTS "service_role_full_access_logs" ON public.message_send_log;

CREATE POLICY "service_role_full_access_logs" 
ON public.message_send_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Verificar se a política foi criada
SELECT 
    policyname,
    cmd,
    roles,
    CASE 
        WHEN roles::text LIKE '%service_role%' THEN '✅ POLÍTICA CRIADA PARA service_role'
        ELSE '❌ POLÍTICA NÃO INCLUI service_role'
    END as status
FROM pg_policies
WHERE tablename = 'message_send_log'
  AND policyname = 'service_role_full_access_logs';

-- 3. Verificar todas as políticas atuais
SELECT 
    policyname,
    cmd,
    roles,
    CASE 
        WHEN roles::text LIKE '%service_role%' THEN '✅ INCLUI service_role'
        ELSE '❌ NÃO inclui service_role'
    END as status_service_role
FROM pg_policies
WHERE tablename = 'message_send_log'
ORDER BY policyname;

-- NOTA: service_role geralmente bypassa RLS automaticamente no Supabase,
-- mas criar uma política explícita garante que não haverá problemas.
-- A política acima permite SELECT, INSERT, UPDATE e DELETE para service_role.




