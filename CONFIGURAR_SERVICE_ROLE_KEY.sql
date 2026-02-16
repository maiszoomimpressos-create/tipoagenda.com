-- =====================================================
-- CONFIGURAR SERVICE_ROLE_KEY NO POSTGRESQL
-- =====================================================
-- IMPORTANTE: Substitua 'SUA_SERVICE_ROLE_KEY_AQUI' pela chave real
-- Você pode encontrar a chave em: Supabase Dashboard > Settings > API > service_role key
-- =====================================================

-- 1. Verificar status atual
SELECT 
    '=== STATUS ATUAL ===' as secao,
    CASE 
        WHEN current_setting('app.settings.service_role_key', true) IS NOT NULL 
         AND current_setting('app.settings.service_role_key', true) != '' 
        THEN '✅ CONFIGURADA (tamanho: ' || length(current_setting('app.settings.service_role_key', true)) || ' caracteres)'
        ELSE '❌ NÃO CONFIGURADA'
    END as status_atual
FROM (SELECT 1) as dummy;

-- 2. INSTRUÇÕES PARA CONFIGURAR
-- Execute o comando abaixo substituindo 'SUA_SERVICE_ROLE_KEY_AQUI' pela chave real:
-- 
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'SUA_SERVICE_ROLE_KEY_AQUI';
--
-- OU via Supabase Dashboard:
-- Settings > Database > Custom Postgres Config > Adicionar:
--   app.settings.service_role_key = 'SUA_CHAVE_AQUI'
--
-- Depois de configurar, execute novamente este script para verificar.

-- 3. Testar a função get_service_role_key()
SELECT 
    '=== TESTE DA FUNÇÃO ===' as secao,
    CASE 
        WHEN get_service_role_key() IS NOT NULL AND get_service_role_key() != '' 
        THEN '✅ Função retorna chave (tamanho: ' || length(get_service_role_key()) || ' caracteres)'
        ELSE '❌ Função retorna vazio - configure a chave primeiro'
    END as status_funcao
FROM (SELECT 1) as dummy;

-- 4. Verificar se o cron job está usando a função corretamente
SELECT 
    '=== COMANDO DO CRON JOB ===' as secao,
    jobname,
    CASE 
        WHEN command LIKE '%get_service_role_key()%' THEN '✅ Usando função get_service_role_key()'
        WHEN command LIKE '%current_setting%' THEN '⚠️ Usando current_setting diretamente'
        ELSE '❓ Verificar comando'
    END as status_comando
FROM cron.job
WHERE jobname = 'whatsapp-message-scheduler-worker';






