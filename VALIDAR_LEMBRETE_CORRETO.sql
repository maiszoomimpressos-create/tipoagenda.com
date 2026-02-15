-- =====================================================
-- VALIDAÇÃO CORRETA DO LEMBRETE
-- =====================================================
-- Problema: A query anterior estava comparando timestamps
-- sem considerar timezone corretamente
-- =====================================================

-- VALIDAÇÃO CORRETA (comparando ambos em horário de Brasília)
SELECT 
  msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
  (a.appointment_date || ' ' || a.appointment_time)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo' as horario_agendamento_brasilia,
  mk.code as tipo_mensagem,
  CASE 
    WHEN (msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo') < 
         ((a.appointment_date || ' ' || a.appointment_time)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') THEN 
      '✅ CORRETO: Lembrete ANTES do agendamento'
    ELSE 
      '❌ ERRADO: Lembrete DEPOIS ou NO MOMENTO do agendamento'
  END as validacao,
  EXTRACT(EPOCH FROM (
    ((a.appointment_date || ' ' || a.appointment_time)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') - 
    (msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo')
  )) / 60 as minutos_antes_do_agendamento
FROM message_send_log msl
LEFT JOIN appointments a ON a.id = msl.appointment_id
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE msl.appointment_id = '04080d64-860c-4e00-8df8-453b6fef2dc8'
ORDER BY msl.created_at DESC;

-- RESUMO: Verificar todos os logs PENDING e seus horários
SELECT 
  msl.id,
  msl.appointment_id,
  msl.status,
  msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
  (a.appointment_date || ' ' || a.appointment_time)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo' as horario_agendamento_brasilia,
  mk.code as tipo_mensagem,
  CASE 
    WHEN (msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo') < 
         ((a.appointment_date || ' ' || a.appointment_time)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') THEN 
      '✅ CORRETO'
    ELSE 
      '❌ ERRADO'
  END as validacao,
  EXTRACT(EPOCH FROM (
    ((a.appointment_date || ' ' || a.appointment_time)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') - 
    (msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo')
  )) / 60 as minutos_antes
FROM message_send_log msl
LEFT JOIN appointments a ON a.id = msl.appointment_id
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE msl.status = 'PENDING'
ORDER BY msl.scheduled_for ASC;

