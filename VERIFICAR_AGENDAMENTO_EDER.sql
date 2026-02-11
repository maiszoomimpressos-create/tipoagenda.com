-- =====================================================
-- VERIFICAR AGENDAMENTO DO CLIENTE EDER
-- =====================================================

-- 1. Buscar cliente "eder" ou similar
SELECT 
    id,
    name,
    phone,
    created_at
FROM clients
WHERE LOWER(name) LIKE '%eder%'
   OR phone LIKE '%46999151842%'
   OR phone LIKE '%5546999151842%'
ORDER BY created_at DESC;

-- 2. Buscar agendamentos recentes (últimas 24 horas)
SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.company_id,
    a.client_id,
    c.name as cliente,
    c.phone as telefone_cliente,
    a.created_at
FROM appointments a
LEFT JOIN clients c ON c.id = a.client_id
WHERE a.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY a.created_at DESC
LIMIT 20;

-- 3. Buscar agendamentos do cliente específico (se souber o ID)
-- Substitua 'CLIENT_ID_AQUI' pelo ID do cliente encontrado na query 1
/*
SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    c.name as cliente,
    c.phone as telefone_cliente
FROM appointments a
JOIN clients c ON c.id = a.client_id
WHERE c.id = 'CLIENT_ID_AQUI'
ORDER BY a.appointment_date DESC, a.appointment_time DESC;
*/

-- 4. Verificar todos os agendamentos de hoje
SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    c.name as cliente,
    c.phone as telefone_cliente,
    a.created_at
FROM appointments a
LEFT JOIN clients c ON c.id = a.client_id
WHERE a.appointment_date = CURRENT_DATE
ORDER BY a.appointment_time DESC;

-- 5. Verificar se o telefone está no formato correto
SELECT 
    id,
    name,
    phone,
    LENGTH(phone) as tamanho,
    phone ~ '^[0-9]+$' as apenas_numeros,
    CASE 
        WHEN phone LIKE '55%' THEN 'Tem DDI'
        WHEN phone LIKE '+55%' THEN 'Tem + e DDI'
        ELSE 'Sem DDI ou formato diferente'
    END as formato
FROM clients
WHERE LOWER(name) LIKE '%eder%'
   OR phone LIKE '%46999151842%'
   OR phone LIKE '%5546999151842%';

-- =====================================================
-- POSSÍVEIS PROBLEMAS:
-- =====================================================
-- 1. O telefone pode estar armazenado em formato diferente
-- 2. O cliente pode ter sido criado com nome diferente
-- 3. O agendamento pode ter sido criado sem vincular o cliente
-- 4. O agendamento pode estar com status 'cancelado'
-- =====================================================

