-- =====================================================
-- CORRIGIR REGRAS DE LEMBRETE (APPOINTMENT_REMINDER)
-- =====================================================
-- Problema: offset_value está positivo, enviando DEPOIS do agendamento
-- Solução: Alterar para negativo para enviar ANTES do agendamento
-- =====================================================

-- 1. VERIFICAR REGRAS ATUAIS
SELECT 
  cms.id,
  cms.company_id,
  mk.code as tipo_mensagem,
  cms.offset_value,
  cms.offset_unit,
  CASE 
    WHEN cms.offset_value < 0 THEN 
      CONCAT('✅ CORRETO: Envia ', ABS(cms.offset_value), ' ', cms.offset_unit, ' ANTES')
    WHEN cms.offset_value > 0 THEN 
      CONCAT('❌ ERRADO: Envia ', cms.offset_value, ' ', cms.offset_unit, ' DEPOIS (deveria ser ANTES)')
    ELSE '⚠️ ZERO: Envia no momento do agendamento'
  END as status
FROM company_message_schedules cms
JOIN message_kinds mk ON mk.id = cms.message_kind_id
WHERE cms.channel = 'WHATSAPP'
  AND cms.is_active = TRUE
  AND mk.code = 'APPOINTMENT_REMINDER';

-- 2. CORRIGIR REGRAS DE LEMBRETE (alterar offset positivo para negativo)
-- IMPORTANTE: Ajuste o valor conforme sua necessidade:
-- - Para 1 hora antes: offset_value = -60, offset_unit = 'MINUTES'
-- - Para 30 minutos antes: offset_value = -30, offset_unit = 'MINUTES'
-- - Para 10 minutos antes: offset_value = -10, offset_unit = 'MINUTES'

UPDATE company_message_schedules
SET 
  offset_value = -60,  -- 60 minutos ANTES (1 hora antes)
  offset_unit = 'MINUTES'
WHERE id IN (
  SELECT cms.id
  FROM company_message_schedules cms
  JOIN message_kinds mk ON mk.id = cms.message_kind_id
  WHERE cms.channel = 'WHATSAPP'
    AND cms.is_active = TRUE
    AND mk.code = 'APPOINTMENT_REMINDER'
    AND cms.offset_value > 0  -- Apenas corrigir se estiver positivo
);

-- 3. VERIFICAR SE A CORREÇÃO FUNCIONOU
SELECT 
  cms.id,
  cms.company_id,
  mk.code as tipo_mensagem,
  cms.offset_value,
  cms.offset_unit,
  CASE 
    WHEN cms.offset_value < 0 THEN 
      CONCAT('✅ CORRIGIDO: Envia ', ABS(cms.offset_value), ' ', cms.offset_unit, ' ANTES')
    ELSE '⚠️ AINDA PRECISA CORREÇÃO'
  END as status
FROM company_message_schedules cms
JOIN message_kinds mk ON mk.id = cms.message_kind_id
WHERE cms.channel = 'WHATSAPP'
  AND cms.is_active = TRUE
  AND mk.code = 'APPOINTMENT_REMINDER';

-- 4. DELETAR LOGS ANTIGOS COM HORÁRIO ERRADO
-- (Para o agendamento específico que você criou)
DELETE FROM message_send_log 
WHERE appointment_id = '04080d64-860c-4e00-8df8-453b6fef2dc8'
  AND status = 'PENDING';

-- 5. RECRIAR LOG COM A REGRA CORRIGIDA
SELECT 
  public.schedule_whatsapp_messages_for_appointment('04080d64-860c-4e00-8df8-453b6fef2dc8'::UUID) as resultado;

-- 6. VERIFICAR O NOVO LOG CRIADO
SELECT 
  msl.id,
  msl.appointment_id,
  msl.status,
  msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
  mk.code as tipo_mensagem,
  CASE 
    WHEN msl.scheduled_for <= (SELECT appointment_date || ' ' || appointment_time FROM appointments WHERE id = msl.appointment_id)::TIMESTAMP THEN 
      '✅ CORRETO: Antes do agendamento'
    ELSE '❌ ERRADO: Depois do agendamento'
  END as validacao
FROM message_send_log msl
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE msl.appointment_id = '04080d64-860c-4e00-8df8-453b6fef2dc8'
ORDER BY msl.created_at DESC;

