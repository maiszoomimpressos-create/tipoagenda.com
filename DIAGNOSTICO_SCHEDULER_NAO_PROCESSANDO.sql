-- =====================================================
-- DIAGNÓSTICO: Scheduler não está processando PENDING
-- =====================================================
-- Problema: Logs PENDING com scheduled_for já passado
-- não estão sendo processados pela Edge Function
-- =====================================================

-- 1. VERIFICAR SE O CRON JOB ESTÁ CONFIGURADO
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
WHERE jobname = 'whatsapp-message-scheduler-job';

-- 2. VERIFICAR SE A EXTENSÃO pg_cron ESTÁ HABILITADA
SELECT 
  extname,
  extversion
FROM pg_extension
WHERE extname = 'pg_cron';

-- 3. VERIFICAR SE A EXTENSÃO pg_net ESTÁ HABILITADA
SELECT 
  extname,
  extversion
FROM pg_extension
WHERE extname = 'pg_net';

-- 4. VERIFICAR TODOS OS LOGS PENDING QUE JÁ DEVERIAM TER SIDO ENVIADOS
SELECT 
  msl.id,
  msl.appointment_id,
  msl.status,
  msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
  NOW() AT TIME ZONE 'America/Sao_Paulo' as agora_brasilia,
  EXTRACT(EPOCH FROM (NOW() - msl.scheduled_for)) / 60 as minutos_atraso,
  mk.code as tipo_mensagem
FROM message_send_log msl
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE msl.status = 'PENDING'
  AND msl.scheduled_for <= NOW()
ORDER BY msl.scheduled_for ASC;

-- 5. VERIFICAR HISTÓRICO DE EXECUÇÕES DO CRON (se disponível)
SELECT 
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
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'whatsapp-message-scheduler-job' LIMIT 1
)
ORDER BY start_time DESC
LIMIT 10;

-- 6. TESTAR CHAMADA MANUAL DA EDGE FUNCTION VIA pg_net
-- (Isso vai chamar a função diretamente, sem depender do cron)





-- 7. APÓS EXECUTAR A QUERY #6, VERIFICAR SE OS LOGS FORAM PROCESSADOS
-- (Execute esta query alguns segundos depois da #6)





