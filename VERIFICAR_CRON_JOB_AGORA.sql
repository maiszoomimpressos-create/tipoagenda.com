-- =====================================================
-- VERIFICAR STATUS DO CRON JOB
-- =====================================================

-- 1. Verificar se o job existe
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

-- 2. Se não retornou nada, listar TODOS os jobs do cron
SELECT 
    '=== TODOS OS JOBS DO CRON ===' as secao,
    jobid,
    jobname,
    schedule,
    active
FROM cron.job
ORDER BY jobname;

-- 3. Verificar se a extensão pg_cron está habilitada
SELECT 
    '=== EXTENSÕES HABILITADAS ===' as secao,
    extname,
    extversion
FROM pg_extension
WHERE extname = 'pg_cron';

-- 4. Verificar histórico de execuções recentes (se houver)
SELECT 
    '=== HISTÓRICO DE EXECUÇÕES (ÚLTIMAS 10) ===' as secao,
    jobid,
    runid,
    job_pid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'whatsapp-message-scheduler-worker')
ORDER BY start_time DESC
LIMIT 10;



