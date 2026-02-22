-- =====================================================
-- CRIAR CRON JOB COM AUTENTICAÇÃO CORRIGIDA
-- =====================================================
-- Este script cria o cron job usando uma abordagem diferente para autenticação
-- Em vez de usar current_setting, vamos criar uma função que retorna a chave
-- =====================================================

-- 1. Criar função auxiliar para obter a service_role_key
-- Esta função será usada pelo cron job para autenticar na Edge Function
CREATE OR REPLACE FUNCTION get_service_role_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- Por enquanto, vamos usar uma variável de ambiente ou configuração
  -- Se não existir, retornar vazio (a Edge Function deve validar)
  SELECT COALESCE(
    current_setting('app.settings.service_role_key', true),
    '' -- Fallback vazio - a Edge Function deve validar
  );
$$;

-- 2. Remover job antigo se existir
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'whatsapp-message-scheduler-worker'
    ) THEN
        PERFORM cron.unschedule('whatsapp-message-scheduler-worker');
        RAISE NOTICE '🗑️ Job antigo removido';
    END IF;
END $$;

-- 3. Criar cron job usando a função auxiliar
DO $$
DECLARE
    v_service_key text;
BEGIN
    -- Tentar obter a chave (pode ser vazia se não configurada)
    v_service_key := get_service_role_key();
    
    -- Criar o job
    PERFORM cron.schedule(
        job_name := 'whatsapp-message-scheduler-worker',
        schedule := '* * * * *',
        command := $cmd$
        SELECT net.http_post(
            url := 'https://tegyiuktrmcqxkbjxqoc.supabase.co/functions/v1/whatsapp-message-scheduler',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || get_service_role_key()
            ),
            body := jsonb_build_object(
                'source', 'cron_worker',
                'timestamp', extract(epoch from now())::text
            )
        ) AS request_id;
        $cmd$
    );
    
    IF v_service_key IS NULL OR v_service_key = '' THEN
        RAISE WARNING '⚠️ ATENÇÃO: service_role_key não configurada. Configure com: ALTER DATABASE postgres SET app.settings.service_role_key = ''SUA_CHAVE_AQUI'';';
    ELSE
        RAISE NOTICE '✅ Service role key encontrada';
    END IF;
    
    RAISE NOTICE '✅ Cron job criado: whatsapp-message-scheduler-worker';
    RAISE NOTICE '✅ Frequência: A cada 1 minuto';
END $$;

-- 4. Verificar se foi criado
SELECT 
    '=== STATUS DO CRON JOB ===' as secao,
    jobid,
    jobname,
    schedule,
    active,
    CASE 
        WHEN active AND schedule = '* * * * *' THEN '✅ ATIVO - Executa a cada 1 minuto'
        WHEN active THEN '✅ ATIVO - Frequência: ' || schedule
        ELSE '❌ INATIVO'
    END as status
FROM cron.job
WHERE jobname = 'whatsapp-message-scheduler-worker';

-- 5. Instruções para configurar a chave (se necessário)
SELECT 
    '=== INSTRUÇÕES ===' as secao,
    'Para configurar a service_role_key, execute:' as instrucao_1,
    'ALTER DATABASE postgres SET app.settings.service_role_key = ''SUA_CHAVE_AQUI'';' as comando_sql,
    'Ou configure via Supabase Dashboard > Settings > Database > Custom Postgres Config' as instrucao_2;














