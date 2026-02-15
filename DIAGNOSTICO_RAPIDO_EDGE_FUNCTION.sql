-- =====================================================
-- DIAGNÓSTICO RÁPIDO: Edge Function whatsapp-message-scheduler
-- =====================================================
-- Execute estas queries para identificar o problema
-- =====================================================

-- 1. Verificar se o net.http_post realmente chamou a função
-- (Verifica a fila de respostas HTTP do pg_net)
SELECT 
  id,
  status_code,
  LEFT(content, 200) as content_preview,
  created
FROM net._http_response_queue
ORDER BY created DESC
LIMIT 5;

-- 2. Verificar se há logs PENDING que deveriam ser processados
SELECT 
  COUNT(*) as total_pending,
  MIN(scheduled_for) as primeiro_agendado,
  MAX(scheduled_for) as ultimo_agendado,
  COUNT(CASE WHEN scheduled_for <= NOW() THEN 1 END) as ja_vencidos
FROM message_send_log
WHERE status = 'PENDING';

-- 3. Verificar se a empresa tem WhatsApp habilitado
SELECT 
  c.id,
  c.name,
  c.whatsapp_messaging_enabled,
  COUNT(DISTINCT a.id) as total_agendamentos,
  COUNT(DISTINCT CASE WHEN a.status NOT IN ('cancelado', 'desistencia') THEN a.id END) as agendamentos_ativos
FROM companies c
LEFT JOIN appointments a ON a.company_id = c.id
WHERE c.whatsapp_messaging_enabled = TRUE
GROUP BY c.id, c.name, c.whatsapp_messaging_enabled;

-- 4. Verificar se existe provedor ativo
SELECT 
  id,
  name,
  channel,
  is_active,
  base_url
FROM messaging_providers
WHERE channel = 'WHATSAPP'
  AND is_active = TRUE;

-- 5. Verificar se existem schedules ativos
SELECT 
  cms.id,
  cms.company_id,
  c.name as empresa,
  cms.message_kind_id,
  mk.code as tipo_mensagem,
  cms.offset_value,
  cms.offset_unit,
  cms.is_active
FROM company_message_schedules cms
JOIN companies c ON c.id = cms.company_id
JOIN message_kinds mk ON mk.id = cms.message_kind_id
WHERE cms.channel = 'WHATSAPP'
  AND cms.is_active = TRUE
  AND c.whatsapp_messaging_enabled = TRUE;

-- 6. Verificar os 3 agendamentos de teste
SELECT 
  a.id as appointment_id,
  a.appointment_date,
  a.appointment_time,
  a.status as appointment_status,
  c.name as cliente,
  c.phone as telefone_cliente,
  COUNT(msl.id) as total_logs,
  COUNT(CASE WHEN msl.status = 'PENDING' THEN 1 END) as logs_pending,
  COUNT(CASE WHEN msl.status = 'SENT' THEN 1 END) as logs_sent,
  COUNT(CASE WHEN msl.status = 'FAILED' THEN 1 END) as logs_failed
FROM appointments a
LEFT JOIN clients c ON c.id = a.client_id
LEFT JOIN message_send_log msl ON msl.appointment_id = a.id
WHERE a.id IN (
  '5b44161d-5d24-4f16-92e2-7c400ef32a69',
  'c4b7a9b6-b2bf-407f-94bb-28efcef0a38f',
  '17b005fb-4227-4f19-b335-8053fa76b908'
)
GROUP BY a.id, a.appointment_date, a.appointment_time, a.status, c.name, c.phone;

