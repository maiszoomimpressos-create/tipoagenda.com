-- =====================================================
-- VERIFICAR E CONFIGURAR AUTENTICAÇÃO COMPLETA
-- =====================================================

-- 1. Verificar se a tabela app_config existe
SELECT 
    '=== TABELA app_config ===' as secao,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_config')
        THEN '✅ Tabela app_config existe'
        ELSE '❌ Tabela app_config NÃO existe'
    END as status_tabela
FROM (SELECT 1) as dummy;

-- 2. Verificar se a função get_service_role_key existe
SELECT 
    '=== FUNÇÃO get_service_role_key ===' as secao,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = 'get_service_role_key'
        )
        THEN '✅ Função get_service_role_key existe'
        ELSE '❌ Função get_service_role_key NÃO existe'
    END as status_funcao
FROM (SELECT 1) as dummy;

-- 3. Verificar se há service_role_key na tabela app_config
SELECT 
    '=== SERVICE_ROLE_KEY NA TABELA ===' as secao,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.app_config WHERE key = 'service_role_key' AND value != '')
        THEN '✅ Service role key configurada na tabela'
        ELSE '❌ Service role key NÃO configurada na tabela'
    END as status_config,
    COALESCE(
        (SELECT length(value)::text || ' caracteres' 
         FROM public.app_config 
         WHERE key = 'service_role_key' 
         LIMIT 1),
        'N/A'
    ) as tamanho_chave
FROM (SELECT 1) as dummy;

-- 4. Testar a função get_service_role_key()
SELECT 
    '=== TESTE DA FUNÇÃO ===' as secao,
    CASE 
        WHEN get_service_role_key() IS NOT NULL AND get_service_role_key() != '' 
        THEN '✅ Função retorna chave (tamanho: ' || length(get_service_role_key()) || ' caracteres)'
        ELSE '❌ Função retorna vazio - execute CONFIGURAR_SERVICE_ROLE_KEY_TABELA.sql'
    END as status_funcao,
    CASE 
        WHEN length(get_service_role_key()) > 50 
        THEN '✅ Chave parece válida (JWT)'
        ELSE '⚠️ Chave muito curta ou vazia'
    END as validacao_chave
FROM (SELECT 1) as dummy;

-- 5. Verificar se o cron job está usando a função corretamente
SELECT 
    '=== CRON JOB ===' as secao,
    jobname,
    schedule,
    active,
    CASE 
        WHEN command LIKE '%get_service_role_key()%' THEN '✅ Usando função get_service_role_key()'
        WHEN command LIKE '%current_setting%' THEN '⚠️ Usando current_setting (atualizar para usar função)'
        ELSE '❓ Verificar comando'
    END as status_comando
FROM cron.job
WHERE jobname = 'whatsapp-message-scheduler-worker';

-- 6. INSTRUÇÕES
SELECT 
    '=== PRÓXIMOS PASSOS ===' as secao,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM public.app_config WHERE key = 'service_role_key' AND value != '')
        THEN '1. Execute CONFIGURAR_SERVICE_ROLE_KEY_TABELA.sql para inserir a chave'
        ELSE '✅ Chave já configurada'
    END as passo_1,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM cron.job 
            WHERE jobname = 'whatsapp-message-scheduler-worker' 
            AND command NOT LIKE '%get_service_role_key()%'
        )
        THEN '2. Atualize o cron job para usar get_service_role_key()'
        ELSE '✅ Cron job já configurado corretamente'
    END as passo_2
FROM (SELECT 1) as dummy;
















