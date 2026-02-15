-- =====================================================
-- VERIFICAR SE A CHAMADA MANUAL PROCESSOU OS LOGS
-- =====================================================
-- Execute esta query alguns segundos após executar
-- a chamada manual via net.http_post
-- =====================================================

-- 1. Verificar se algum log mudou de status
SELECT 
  msl.id,
  msl.appointment_id,
  msl.status,
  msl.sent_at,
  msl.provider_response,
  msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
  CASE 
    WHEN msl.status = 'SENT' THEN '✅ ENVIADO'
    WHEN msl.status = 'FAILED' THEN '❌ FALHOU'
    WHEN msl.status = 'PENDING' AND msl.scheduled_for <= NOW() THEN '⚠️ AINDA PENDING (deveria ter sido processado)'
    ELSE '⏳ PENDING (aguardando horário)'
  END as status_detalhado
FROM message_send_log msl
WHERE msl.status IN ('PENDING', 'SENT', 'FAILED')
  AND msl.scheduled_for <= NOW() + INTERVAL '1 hour'  -- Última hora
ORDER BY msl.scheduled_for ASC;

-- 2. Verificar especificamente o log do agendamento mais recente
SELECT 
  msl.id,
  msl.appointment_id,
  msl.status,
  msl.sent_at,
  msl.provider_response,
  msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
  NOW() AT TIME ZONE 'America/Sao_Paulo' as agora_brasilia
FROM message_send_log msl
WHERE msl.appointment_id = '04080d64-860c-4e00-8df8-453b6fef2dc8'
ORDER BY msl.created_at DESC
LIMIT 1;

-- 3. Contar logs por status
SELECT 
  status,
  COUNT(*) as total,
  COUNT(CASE WHEN scheduled_for <= NOW() THEN 1 END) as ja_vencidos
FROM message_send_log
GROUP BY status
ORDER BY status;


