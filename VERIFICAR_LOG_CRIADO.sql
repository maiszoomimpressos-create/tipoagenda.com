-- =====================================================
-- VERIFICAR SE O LOG FOI CRIADO (baseado no console)
-- =====================================================
-- Appointment ID do console: 7578cbcd-d7e7-4b38-89b5-68a76312cfc9
-- Console mostra: "logs_created": 1
-- =====================================================

-- 1. Verificar se o log existe na tabela
SELECT 
  msl.id,
  msl.appointment_id,
  msl.status,
  msl.scheduled_for,
  msl.created_at,
  mk.code as tipo_mensagem,
  c.name as cliente,
  c.phone as telefone
FROM message_send_log msl
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
LEFT JOIN clients c ON c.id = msl.client_id
WHERE msl.appointment_id = '7578cbcd-d7e7-4b38-89b5-68a76312cfc9'
ORDER BY msl.created_at DESC;

-- 2. Testar a função novamente (deve retornar logs_created: 0 porque já existe)
SELECT 
  public.schedule_whatsapp_messages_for_appointment('7578cbcd-d7e7-4b38-89b5-68a76312cfc9'::UUID) as resultado;

-- 3. Verificar se o scheduled_for já passou (se sim, deveria ter sido enviado)
SELECT 
  msl.id,
  msl.appointment_id,
  msl.status,
  msl.scheduled_for,
  msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
  NOW() AT TIME ZONE 'America/Sao_Paulo' as agora_brasilia,
  CASE 
    WHEN msl.scheduled_for <= NOW() THEN '✅ JÁ DEVERIA TER SIDO ENVIADO'
    ELSE '⏳ AINDA NÃO É HORA'
  END as status_envio
FROM message_send_log msl
WHERE msl.appointment_id = '7578cbcd-d7e7-4b38-89b5-68a76312cfc9'
  AND msl.status = 'PENDING';

