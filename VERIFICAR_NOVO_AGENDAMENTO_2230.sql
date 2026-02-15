-- =====================================================
-- VERIFICAR NOVO AGENDAMENTO (22:30 - 23:00)
-- =====================================================

-- 1. Buscar o agendamento mais recente
SELECT 
  a.id as appointment_id,
  a.company_id,
  a.client_id,
  a.appointment_date,
  a.appointment_time,
  a.status,
  a.created_at,
  c.name as empresa,
  c.whatsapp_messaging_enabled,
  cl.name as cliente,
  cl.phone as telefone_cliente
FROM appointments a
LEFT JOIN companies c ON c.id = a.company_id
LEFT JOIN clients cl ON cl.id = a.client_id
ORDER BY a.created_at DESC
LIMIT 1;

-- 2. Verificar se o log foi criado para esse agendamento
-- (Execute depois de pegar o appointment_id da query acima)
SELECT 
  msl.id,
  msl.appointment_id,
  msl.status,
  msl.scheduled_for,
  msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
  msl.created_at,
  mk.code as tipo_mensagem
FROM message_send_log msl
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE msl.appointment_id = (
  SELECT id FROM appointments ORDER BY created_at DESC LIMIT 1
)
ORDER BY msl.created_at DESC;

-- 3. Verificar qual é a regra de schedule (offset) configurada
SELECT 
  cms.id,
  cms.company_id,
  cms.message_kind_id,
  mk.code as tipo_mensagem,
  cms.offset_value,
  cms.offset_unit,
  cms.reference,
  cms.is_active,
  CASE 
    WHEN cms.offset_unit = 'HOURS' AND cms.offset_value < 0 THEN 
      CONCAT('Lembrete: ', ABS(cms.offset_value), ' horas ANTES do agendamento')
    WHEN cms.offset_unit = 'HOURS' AND cms.offset_value > 0 THEN 
      CONCAT('Agradecimento: ', cms.offset_value, ' horas DEPOIS do agendamento')
    WHEN cms.offset_unit = 'MINUTES' AND cms.offset_value < 0 THEN 
      CONCAT('Lembrete: ', ABS(cms.offset_value), ' minutos ANTES do agendamento')
    WHEN cms.offset_unit = 'MINUTES' AND cms.offset_value > 0 THEN 
      CONCAT('Agradecimento: ', cms.offset_value, ' minutos DEPOIS do agendamento')
    ELSE 'Desconhecido'
  END as descricao_regra
FROM company_message_schedules cms
JOIN message_kinds mk ON mk.id = cms.message_kind_id
WHERE cms.company_id = (
  SELECT company_id FROM appointments ORDER BY created_at DESC LIMIT 1
)
  AND cms.channel = 'WHATSAPP'
  AND cms.is_active = TRUE;

-- 4. Calcular quando a mensagem DEVERIA ser enviada
-- (Baseado no agendamento de 22:30 e na regra de offset)
WITH appointment_info AS (
  SELECT 
    a.id,
    a.company_id,
    a.appointment_date,
    a.appointment_time,
    a.appointment_date || ' ' || a.appointment_time as appointment_datetime_br
  FROM appointments a
  ORDER BY a.created_at DESC
  LIMIT 1
),
schedule_rules AS (
  SELECT 
    cms.message_kind_id,
    mk.code as tipo_mensagem,
    cms.offset_value,
    cms.offset_unit
  FROM company_message_schedules cms
  JOIN appointment_info ai ON ai.company_id = cms.company_id
  JOIN message_kinds mk ON mk.id = cms.message_kind_id
  WHERE cms.channel = 'WHATSAPP'
    AND cms.is_active = TRUE
)
SELECT 
  ai.appointment_datetime_br as horario_agendamento,
  sr.tipo_mensagem,
  sr.offset_value,
  sr.offset_unit,
  CASE 
    WHEN sr.offset_unit = 'HOURS' THEN
      (ai.appointment_date || ' ' || ai.appointment_time)::TIMESTAMP 
      + (sr.offset_value || ' hours')::INTERVAL
    WHEN sr.offset_unit = 'MINUTES' THEN
      (ai.appointment_date || ' ' || ai.appointment_time)::TIMESTAMP 
      + (sr.offset_value || ' minutes')::INTERVAL
  END as quando_deve_enviar,
  CASE 
    WHEN sr.offset_unit = 'HOURS' THEN
      ((ai.appointment_date || ' ' || ai.appointment_time)::TIMESTAMP 
       + (sr.offset_value || ' hours')::INTERVAL) AT TIME ZONE 'America/Sao_Paulo'
    WHEN sr.offset_unit = 'MINUTES' THEN
      ((ai.appointment_date || ' ' || ai.appointment_time)::TIMESTAMP 
       + (sr.offset_value || ' minutes')::INTERVAL) AT TIME ZONE 'America/Sao_Paulo'
  END as quando_deve_enviar_brasilia
FROM appointment_info ai
CROSS JOIN schedule_rules sr;

-- 5. Verificar TODOS os logs PENDING que estão aguardando envio
SELECT 
  msl.id,
  msl.appointment_id,
  msl.status,
  msl.scheduled_for,
  msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
  NOW() AT TIME ZONE 'America/Sao_Paulo' as agora_brasilia,
  CASE 
    WHEN msl.scheduled_for <= NOW() THEN '✅ JÁ DEVERIA TER SIDO ENVIADO'
    ELSE '⏳ AINDA NÃO É HORA (aguardando scheduler)'
  END as status_envio,
  mk.code as tipo_mensagem
FROM message_send_log msl
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE msl.status = 'PENDING'
ORDER BY msl.scheduled_for ASC;

