-- =====================================================
-- TESTE COMPLETO: Verificar por que message_send_log está vazia
-- =====================================================
-- Execute este script substituindo <APPOINTMENT_ID> pelo ID
-- de um agendamento que você criou recentemente
-- =====================================================

-- SUBSTITUA ESTE VALOR PELO ID DE UM AGENDAMENTO REAL
\set appointment_id '00000000-0000-0000-0000-000000000000'

-- =====================================================
-- 1. VERIFICAR SE A FUNÇÃO EXISTE
-- =====================================================
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Função existe'
        ELSE '❌ Função NÃO existe - Execute a migração 20260210_schedule_whatsapp_messages_on_appointment.sql'
    END as status_funcao,
    proname as nome_funcao
FROM pg_proc
WHERE proname = 'schedule_whatsapp_messages_for_appointment';

-- =====================================================
-- 2. VERIFICAR AGENDAMENTO E CONDIÇÕES
-- =====================================================
SELECT 
    '=== DADOS DO AGENDAMENTO ===' as secao,
    a.id as appointment_id,
    a.company_id,
    a.client_id,
    a.appointment_date,
    a.appointment_time,
    a.status as appointment_status,
    '---' as separador,
    '=== CONDIÇÕES NECESSÁRIAS ===' as secao2,
    CASE 
        WHEN c.whatsapp_messaging_enabled = TRUE THEN '✅ WhatsApp HABILITADO'
        ELSE '❌ WhatsApp DESABILITADO - Execute: UPDATE companies SET whatsapp_messaging_enabled = TRUE WHERE id = ''' || a.company_id || ''';'
    END as status_whatsapp,
    CASE 
        WHEN cl.phone IS NOT NULL AND TRIM(cl.phone) != '' THEN '✅ Cliente TEM telefone: ' || cl.phone
        ELSE '❌ Cliente SEM telefone - Adicione telefone ao cliente'
    END as status_telefone,
    (SELECT COUNT(*) FROM company_message_schedules 
     WHERE company_id = a.company_id 
     AND channel = 'WHATSAPP' 
     AND is_active = TRUE 
     AND reference = 'APPOINTMENT_START') as total_regras_ativas,
    CASE 
        WHEN (SELECT COUNT(*) FROM company_message_schedules 
              WHERE company_id = a.company_id 
              AND channel = 'WHATSAPP' 
              AND is_active = TRUE 
              AND reference = 'APPOINTMENT_START') > 0 
        THEN '✅ TEM regras de envio ativas'
        ELSE '❌ SEM regras de envio - Configure em /mensagens-whatsapp → Regras de Envio'
    END as status_regras,
    (SELECT COUNT(*) FROM messaging_providers 
     WHERE channel = 'WHATSAPP' 
     AND is_active = TRUE) as total_provedores_ativos,
    CASE 
        WHEN (SELECT COUNT(*) FROM messaging_providers 
              WHERE channel = 'WHATSAPP' 
              AND is_active = TRUE) > 0 
        THEN '✅ TEM provedor WhatsApp ativo'
        ELSE '❌ SEM provedor WhatsApp - Configure no painel de admin global'
    END as status_provedor
FROM appointments a
JOIN companies c ON c.id = a.company_id
JOIN clients cl ON cl.id = a.client_id
WHERE a.id = :appointment_id;

-- =====================================================
-- 3. LISTAR REGRAS DE ENVIO ATIVAS
-- =====================================================
SELECT 
    '=== REGRAS DE ENVIO ATIVAS ===' as secao,
    cms.id,
    cms.message_kind_id,
    mk.code as message_kind_code,
    mk.description as message_kind_description,
    cms.offset_value,
    cms.offset_unit,
    cms.reference,
    cms.is_active
FROM appointments a
JOIN company_message_schedules cms ON cms.company_id = a.company_id
JOIN message_kinds mk ON mk.id = cms.message_kind_id
WHERE a.id = :appointment_id
  AND cms.channel = 'WHATSAPP'
  AND cms.is_active = TRUE
  AND cms.reference = 'APPOINTMENT_START';

-- =====================================================
-- 4. TESTAR A FUNÇÃO
-- =====================================================
SELECT 
    '=== RESULTADO DA FUNÇÃO ===' as secao,
    public.schedule_whatsapp_messages_for_appointment(:appointment_id::UUID) as resultado;

-- =====================================================
-- 5. VERIFICAR LOGS CRIADOS
-- =====================================================
SELECT 
    '=== LOGS NA MESSAGE_SEND_LOG ===' as secao,
    id,
    appointment_id,
    message_kind_id,
    scheduled_for,
    status,
    created_at
FROM message_send_log
WHERE appointment_id = :appointment_id
ORDER BY created_at DESC;

-- =====================================================
-- 6. VERIFICAR TODOS OS LOGS RECENTES
-- =====================================================
SELECT 
    '=== TODOS OS LOGS RECENTES ===' as secao,
    id,
    appointment_id,
    message_kind_id,
    scheduled_for,
    status,
    created_at
FROM message_send_log
ORDER BY created_at DESC
LIMIT 10;

