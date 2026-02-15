-- =====================================================
-- VERIFICAR AGENDAMENTOS RECENTES
-- =====================================================
-- Execute este SQL para ver os agendamentos mais recentes
-- e entender por que não aparecem na busca de amanhã 6:00
-- =====================================================

-- 1. VERIFICAR OS ÚLTIMOS 10 AGENDAMENTOS CRIADOS
SELECT 
    '=== ÚLTIMOS 10 AGENDAMENTOS CRIADOS ===' as secao,
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
        WHEN a.appointment_date = CURRENT_DATE + INTERVAL '1 day' AND a.appointment_time = TIME '06:00:00' THEN '✅ É AMANHÃ 6:00'
        WHEN a.appointment_date = CURRENT_DATE + INTERVAL '1 day' THEN '⚠️ É AMANHÃ MAS NÃO É 6:00'
        WHEN a.appointment_date = CURRENT_DATE THEN '⚠️ É HOJE'
        WHEN a.appointment_date < CURRENT_DATE THEN '⚠️ É PASSADO'
        WHEN a.appointment_date > CURRENT_DATE + INTERVAL '1 day' THEN '⚠️ É DEPOIS DE AMANHÃ'
        ELSE '❓ DATA INDETERMINADA'
    END as validacao_data_hora,
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
ORDER BY a.created_at DESC
LIMIT 10;

-- 2. VERIFICAR SE HÁ LOGS PARA OS ÚLTIMOS AGENDAMENTOS
SELECT 
    '=== LOGS DOS ÚLTIMOS AGENDAMENTOS ===' as secao,
    a.id as appointment_id,
    a.appointment_date,
    a.appointment_time,
    cl.name as cliente,
    COUNT(msl.id) as total_logs,
    STRING_AGG(DISTINCT mk.code, ', ') as tipos_mensagem,
    STRING_AGG(DISTINCT msl.status::TEXT, ', ') as status_logs,
    MAX(msl.created_at) as ultimo_log_criado
FROM appointments a
LEFT JOIN clients cl ON cl.id = a.client_id
LEFT JOIN message_send_log msl ON msl.appointment_id = a.id
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '1 day'
GROUP BY a.id, a.appointment_date, a.appointment_time, cl.name
ORDER BY a.created_at DESC
LIMIT 10;

-- 3. VERIFICAR AGENDAMENTOS DE HOJE E AMANHÃ (QUALQUER HORÁRIO)
SELECT 
    '=== AGENDAMENTOS DE HOJE E AMANHÃ ===' as secao,
    a.id as appointment_id,
    a.appointment_date,
    a.appointment_time,
    CASE 
        WHEN a.appointment_date = CURRENT_DATE THEN 'HOJE'
        WHEN a.appointment_date = CURRENT_DATE + INTERVAL '1 day' THEN 'AMANHÃ'
        ELSE 'OUTRO DIA'
    END as dia,
    cl.name as cliente,
    a.status,
    COUNT(msl.id) as total_logs_criados
FROM appointments a
LEFT JOIN clients cl ON cl.id = a.client_id
LEFT JOIN message_send_log msl ON msl.appointment_id = a.id
WHERE a.appointment_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day'
  AND a.status NOT IN ('cancelado', 'desistencia')
GROUP BY a.id, a.appointment_date, a.appointment_time, cl.name, a.status
ORDER BY a.appointment_date, a.appointment_time;

-- 4. VERIFICAR SE A FUNÇÃO FOI CHAMADA (verificar logs de console ou erros)
-- Esta query verifica se há agendamentos sem logs (possível falha na chamada da função)
SELECT 
    '=== AGENDAMENTOS SEM LOGS (POSSÍVEL PROBLEMA) ===' as secao,
    a.id as appointment_id,
    a.company_id,
    c.name as empresa,
    a.appointment_date,
    a.appointment_time,
    cl.name as cliente,
    cl.phone as telefone,
    a.status,
    a.created_at,
    CASE 
        WHEN c.whatsapp_messaging_enabled = FALSE THEN '❌ WHATSAPP DESABILITADO NA EMPRESA'
        WHEN cl.phone IS NULL OR TRIM(cl.phone) = '' OR cl.phone = '00000000000' THEN '❌ CLIENTE SEM TELEFONE VÁLIDO'
        WHEN NOT EXISTS (
            SELECT 1 FROM company_message_schedules cms 
            WHERE cms.company_id = a.company_id 
            AND cms.channel = 'WHATSAPP' 
            AND cms.is_active = TRUE
        ) THEN '❌ SEM REGRAS DE ENVIO CONFIGURADAS'
        ELSE '⚠️ POSSÍVEL FALHA NA CHAMADA DA FUNÇÃO'
    END as possivel_causa
FROM appointments a
JOIN companies c ON c.id = a.company_id
LEFT JOIN clients cl ON cl.id = a.client_id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '1 day'
  AND a.status NOT IN ('cancelado', 'desistencia')
  AND NOT EXISTS (
      SELECT 1 FROM message_send_log msl 
      WHERE msl.appointment_id = a.id
  )
ORDER BY a.created_at DESC;

-- 5. VERIFICAR TODOS OS LOGS RECENTES (independente de agendamento)
SELECT 
    '=== TODOS OS LOGS RECENTES ===' as secao,
    msl.id as log_id,
    msl.appointment_id,
    a.appointment_date,
    a.appointment_time,
    mk.code as tipo_mensagem,
    msl.scheduled_for,
    msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
    msl.status,
    msl.created_at
FROM message_send_log msl
LEFT JOIN appointments a ON a.id = msl.appointment_id
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE msl.created_at >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY msl.created_at DESC
LIMIT 20;

-- 6. VERIFICAR DATA/HORA ATUAL DO BANCO
SELECT 
    '=== DATA/HORA ATUAL DO BANCO ===' as secao,
    CURRENT_DATE as data_atual,
    CURRENT_TIME as hora_atual,
    CURRENT_TIMESTAMP as timestamp_atual,
    CURRENT_DATE + INTERVAL '1 day' as amanha,
    (CURRENT_DATE + INTERVAL '1 day')::TEXT || ' 06:00:00' as amanha_6h_string;

-- =====================================================
-- FIM DA VERIFICAÇÃO
-- =====================================================

