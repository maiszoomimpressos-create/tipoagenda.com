-- =====================================================
-- DIAGNÓSTICO COMPLETO: Por que não grava na message_send_log?
-- =====================================================
-- Execute estas queries após criar 2 agendamentos novos
-- =====================================================

-- 1. BUSCAR OS 2 ÚLTIMOS AGENDAMENTOS CRIADOS
SELECT 
  a.id as appointment_id,
  a.company_id,
  a.client_id,
  a.appointment_date,
  a.appointment_time,
  a.status as appointment_status,
  a.created_at,
  c.name as empresa,
  c.whatsapp_messaging_enabled,
  cl.name as cliente,
  cl.phone as telefone_cliente
FROM appointments a
LEFT JOIN companies c ON c.id = a.company_id
LEFT JOIN clients cl ON cl.id = a.client_id
ORDER BY a.created_at DESC
LIMIT 2;

-- 2. VERIFICAR SE EXISTEM LOGS PARA ESSES AGENDAMENTOS
-- (Substitua os IDs pelos appointment_id encontrados na query acima)
SELECT 
  msl.id,
  msl.appointment_id,
  msl.status,
  msl.scheduled_for,
  msl.created_at,
  mk.code as tipo_mensagem
FROM message_send_log msl
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE msl.appointment_id IN (
  -- COLE AQUI OS 2 appointment_id da query anterior
  'SUBSTITUA_PELO_ID_1',
  'SUBSTITUA_PELO_ID_2'
)
ORDER BY msl.created_at DESC;

-- 3. VERIFICAR CONDIÇÕES NECESSÁRIAS PARA A FUNÇÃO FUNCIONAR
-- (Para cada appointment_id encontrado, execute esta query)
WITH appointment_data AS (
  SELECT 
    a.id as appointment_id,
    a.company_id,
    a.client_id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    c.whatsapp_messaging_enabled,
    cl.phone as client_phone
  FROM appointments a
  LEFT JOIN companies c ON c.id = a.company_id
  LEFT JOIN clients cl ON cl.id = a.client_id
  WHERE a.id = 'SUBSTITUA_PELO_APPOINTMENT_ID'
)
SELECT 
  '1. WhatsApp Habilitado?' as verificacao,
  CASE 
    WHEN ad.whatsapp_messaging_enabled = TRUE THEN '✅ SIM'
    ELSE '❌ NÃO'
  END as resultado
FROM appointment_data ad
UNION ALL
SELECT 
  '2. Cliente tem telefone?' as verificacao,
  CASE 
    WHEN ad.client_phone IS NOT NULL 
      AND TRIM(ad.client_phone) != '' 
      AND ad.client_phone != '00000000000' 
      AND LENGTH(REGEXP_REPLACE(ad.client_phone, '[^0-9]', '', 'g')) >= 10 THEN '✅ SIM'
    ELSE '❌ NÃO (telefone: ' || COALESCE(ad.client_phone, 'NULL') || ')'
  END as resultado
FROM appointment_data ad
UNION ALL
SELECT 
  '3. Existe provedor ativo?' as verificacao,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM messaging_providers 
      WHERE channel = 'WHATSAPP' AND is_active = TRUE
    ) THEN '✅ SIM'
    ELSE '❌ NÃO'
  END as resultado
FROM appointment_data ad
UNION ALL
SELECT 
  '4. Existem schedules ativos?' as verificacao,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM company_message_schedules cms
      WHERE cms.company_id = ad.company_id
        AND cms.channel = 'WHATSAPP'
        AND cms.is_active = TRUE
    ) THEN '✅ SIM (' || (
      SELECT COUNT(*)::TEXT 
      FROM company_message_schedules cms
      WHERE cms.company_id = ad.company_id
        AND cms.channel = 'WHATSAPP'
        AND cms.is_active = TRUE
    ) || ' regras)'
    ELSE '❌ NÃO'
  END as resultado
FROM appointment_data ad
UNION ALL
SELECT 
  '5. Existem templates ativos?' as verificacao,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM company_message_templates cmt
      JOIN company_message_schedules cms ON cms.message_kind_id = cmt.message_kind_id
      WHERE cmt.company_id = ad.company_id
        AND cmt.channel = 'WHATSAPP'
        AND cmt.is_active = TRUE
        AND cms.company_id = ad.company_id
        AND cms.channel = 'WHATSAPP'
        AND cms.is_active = TRUE
    ) THEN '✅ SIM'
    ELSE '❌ NÃO'
  END as resultado
FROM appointment_data ad;

-- 4. TESTAR A FUNÇÃO DIRETAMENTE COM UM DOS AGENDAMENTOS
-- (Substitua pelo appointment_id real)
SELECT 
  public.schedule_whatsapp_messages_for_appointment('SUBSTITUA_PELO_APPOINTMENT_ID'::UUID) as resultado;

-- 5. VERIFICAR SE A FUNÇÃO EXISTE E TEM PERMISSÕES CORRETAS
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'schedule_whatsapp_messages_for_appointment';

-- 6. VERIFICAR RLS (Row Level Security) NA TABELA message_send_log
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'message_send_log';

-- 7. VERIFICAR SE HÁ ERROS NO LOG DO SUPABASE
-- (Execute no Supabase Dashboard → Logs → Database Logs)
-- Procure por erros relacionados a:
-- - "schedule_whatsapp_messages_for_appointment"
-- - "message_send_log"
-- - "RLS policy violation"

