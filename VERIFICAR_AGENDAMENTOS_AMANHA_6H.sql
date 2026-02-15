-- =====================================================
-- VERIFICAÇÃO ESPECÍFICA: AGENDAMENTOS DE AMANHÃ ÀS 6:00
-- =====================================================
-- Execute este SQL para verificar se os 3 agendamentos
-- estão configurados corretamente para receber mensagens
-- =====================================================

-- 1. VERIFICAR OS 3 AGENDAMENTOS
SELECT 
    '=== AGENDAMENTOS DE AMANHÃ ÀS 6:00 ===' as secao,
    a.id as appointment_id,
    a.company_id,
    c.name as empresa,
    cl.name as cliente,
    cl.phone as telefone,
    a.appointment_date,
    a.appointment_time,
    a.status as status_agendamento,
    a.created_at,
    CASE 
        WHEN cl.phone IS NOT NULL AND TRIM(cl.phone) != '' AND cl.phone != '00000000000' THEN '✅ TEM TELEFONE VÁLIDO'
        ELSE '❌ SEM TELEFONE VÁLIDO'
    END as status_telefone,
    CASE 
        WHEN c.whatsapp_messaging_enabled = TRUE THEN '✅ WHATSAPP HABILITADO'
        ELSE '❌ WHATSAPP DESABILITADO'
    END as status_whatsapp
FROM appointments a
JOIN companies c ON c.id = a.company_id
LEFT JOIN clients cl ON cl.id = a.client_id
WHERE a.appointment_date = CURRENT_DATE + INTERVAL '1 day'
  AND a.appointment_time = TIME '06:00:00'
  AND a.status NOT IN ('cancelado', 'desistencia')
ORDER BY a.created_at DESC;

-- 2. VERIFICAR SE OS LOGS FORAM CRIADOS
SELECT 
    '=== LOGS DE MENSAGENS CRIADOS ===' as secao,
    msl.id as log_id,
    msl.appointment_id,
    mk.code as tipo_mensagem,
    mk.description as descricao_tipo,
    msl.scheduled_for,
    msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
    msl.status,
    CASE 
        WHEN msl.status = 'PENDING' AND msl.scheduled_for::timestamp <= NOW() THEN '⚠️ PENDENTE - DEVERIA TER SIDO ENVIADA'
        WHEN msl.status = 'PENDING' THEN '⏳ PENDENTE - AGUARDANDO HORÁRIO'
        WHEN msl.status = 'SENT' THEN '✅ ENVIADA'
        WHEN msl.status = 'FAILED' THEN '❌ FALHOU'
        WHEN msl.status = 'CANCELLED' THEN '🚫 CANCELADA'
        ELSE '❓ STATUS DESCONHECIDO'
    END as status_detalhado,
    msl.sent_at,
    msl.provider_response
FROM message_send_log msl
JOIN appointments a ON a.id = msl.appointment_id
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE a.appointment_date = CURRENT_DATE + INTERVAL '1 day'
  AND a.appointment_time = TIME '06:00:00'
ORDER BY msl.created_at DESC;

-- 3. VERIFICAR REGRAS DE ENVIO CONFIGURADAS
SELECT 
    '=== REGRAS DE ENVIO CONFIGURADAS ===' as secao,
    cms.id,
    mk.code as tipo_mensagem,
    mk.description as descricao_tipo,
    cms.offset_value,
    cms.offset_unit,
    cms.reference,
    CASE 
        WHEN cms.offset_value < 0 THEN CONCAT('Envia ', ABS(cms.offset_value), ' ', cms.offset_unit, ' ANTES do agendamento')
        WHEN cms.offset_value > 0 THEN CONCAT('Envia ', cms.offset_value, ' ', cms.offset_unit, ' DEPOIS do agendamento')
        ELSE 'Offset zero (sem diferença)'
    END as descricao_regra,
    CASE 
        WHEN cms.is_active = TRUE THEN '✅ ATIVA'
        ELSE '❌ INATIVA'
    END as status
FROM company_message_schedules cms
JOIN companies c ON c.id = cms.company_id
JOIN message_kinds mk ON mk.id = cms.message_kind_id
WHERE cms.company_id IN (
    SELECT DISTINCT company_id 
    FROM appointments 
    WHERE appointment_date = CURRENT_DATE + INTERVAL '1 day'
      AND appointment_time = TIME '06:00:00'
)
AND cms.channel = 'WHATSAPP'
AND cms.is_active = TRUE
ORDER BY cms.created_at DESC;

-- 4. VERIFICAR TEMPLATES CONFIGURADOS
SELECT 
    '=== TEMPLATES CONFIGURADOS ===' as secao,
    cmt.id,
    mk.code as tipo_mensagem,
    mk.description as descricao_tipo,
    cmt.name as nome_template,
    LEFT(cmt.body_template, 50) || '...' as preview_template,
    CASE 
        WHEN cmt.is_active = TRUE THEN '✅ ATIVO'
        ELSE '❌ INATIVO'
    END as status
FROM company_message_templates cmt
JOIN companies c ON c.id = cmt.company_id
JOIN message_kinds mk ON mk.id = cmt.message_kind_id
WHERE cmt.company_id IN (
    SELECT DISTINCT company_id 
    FROM appointments 
    WHERE appointment_date = CURRENT_DATE + INTERVAL '1 day'
      AND appointment_time = TIME '06:00:00'
)
AND cmt.channel = 'WHATSAPP'
AND cmt.is_active = TRUE
ORDER BY cmt.created_at DESC;

-- 5. RESUMO FINAL
SELECT 
    '=== RESUMO FINAL ===' as secao,
    (SELECT COUNT(*) FROM appointments 
     WHERE appointment_date = CURRENT_DATE + INTERVAL '1 day'
       AND appointment_time = TIME '06:00:00'
       AND status NOT IN ('cancelado', 'desistencia')) as total_agendamentos,
    (SELECT COUNT(*) FROM message_send_log msl
     JOIN appointments a ON a.id = msl.appointment_id
     WHERE a.appointment_date = CURRENT_DATE + INTERVAL '1 day'
       AND a.appointment_time = TIME '06:00:00'
       AND msl.status = 'PENDING') as mensagens_pendentes,
    (SELECT COUNT(*) FROM message_send_log msl
     JOIN appointments a ON a.id = msl.appointment_id
     WHERE a.appointment_date = CURRENT_DATE + INTERVAL '1 day'
       AND a.appointment_time = TIME '06:00:00'
       AND msl.status = 'SENT') as mensagens_enviadas,
    (SELECT COUNT(*) FROM message_send_log msl
     JOIN appointments a ON a.id = msl.appointment_id
     WHERE a.appointment_date = CURRENT_DATE + INTERVAL '1 day'
       AND a.appointment_time = TIME '06:00:00'
       AND msl.status = 'FAILED') as mensagens_falhadas,
    (SELECT MIN(msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo')
     FROM message_send_log msl
     JOIN appointments a ON a.id = msl.appointment_id
     WHERE a.appointment_date = CURRENT_DATE + INTERVAL '1 day'
       AND a.appointment_time = TIME '06:00:00'
       AND msl.status = 'PENDING') as proximo_envio_previsto;

-- 6. VERIFICAR SE O HORÁRIO DE ENVIO ESTÁ CORRETO
SELECT 
    '=== VALIDAÇÃO DE HORÁRIO DE ENVIO ===' as secao,
    a.appointment_date || ' ' || a.appointment_time as horario_agendamento,
    msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
    mk.code as tipo_mensagem,
    cms.offset_value,
    cms.offset_unit,
    CASE 
        WHEN mk.code = 'APPOINTMENT_REMINDER' AND msl.scheduled_for < (a.appointment_date || ' ' || a.appointment_time)::TIMESTAMP THEN '✅ CORRETO: Lembrete ANTES do agendamento'
        WHEN mk.code = 'APPOINTMENT_REMINDER' AND msl.scheduled_for >= (a.appointment_date || ' ' || a.appointment_time)::TIMESTAMP THEN '❌ ERRADO: Lembrete DEPOIS do agendamento'
        WHEN mk.code != 'APPOINTMENT_REMINDER' AND msl.scheduled_for > (a.appointment_date || ' ' || a.appointment_time)::TIMESTAMP THEN '✅ CORRETO: Mensagem DEPOIS do agendamento'
        WHEN mk.code != 'APPOINTMENT_REMINDER' AND msl.scheduled_for <= (a.appointment_date || ' ' || a.appointment_time)::TIMESTAMP THEN '⚠️ ATENÇÃO: Mensagem ANTES do agendamento (pode estar errado)'
        ELSE '❓ VALIDAÇÃO INDETERMINADA'
    END as validacao_horario
FROM message_send_log msl
JOIN appointments a ON a.id = msl.appointment_id
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
LEFT JOIN company_message_schedules cms ON cms.message_kind_id = mk.id 
    AND cms.company_id = a.company_id 
    AND cms.channel = 'WHATSAPP'
    AND cms.is_active = TRUE
WHERE a.appointment_date = CURRENT_DATE + INTERVAL '1 day'
  AND a.appointment_time = TIME '06:00:00'
  AND msl.status = 'PENDING'
ORDER BY msl.scheduled_for;

-- =====================================================
-- FIM DA VERIFICAÇÃO
-- =====================================================


