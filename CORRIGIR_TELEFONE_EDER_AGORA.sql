-- =====================================================
-- CORRIGIR TELEFONE DO CLIENTE EDER - EXECUTAR AGORA
-- =====================================================

-- 1. Verificar cliente e agendamento
SELECT 
    c.id as client_id,
    c.name as cliente,
    c.phone as telefone_atual,
    a.id as appointment_id,
    a.appointment_date,
    a.appointment_time,
    a.status
FROM clients c
JOIN appointments a ON a.client_id = c.id
WHERE LOWER(c.name) LIKE '%eder%'
   OR c.phone LIKE '%46999%'
ORDER BY a.created_at DESC
LIMIT 5;

-- 2. CORRIGIR TELEFONE (telefone correto: 5546999151842)
-- Execute esta query substituindo CLIENT_ID pelo ID encontrado acima
UPDATE clients
SET phone = '5546999151842'
WHERE id IN (
    SELECT DISTINCT c.id
    FROM clients c
    JOIN appointments a ON a.client_id = c.id
    WHERE (LOWER(c.name) LIKE '%eder%' OR c.phone LIKE '%46999%')
      AND a.created_at >= NOW() - INTERVAL '24 hours'
    LIMIT 1
);

-- 3. Verificar se foi corrigido
SELECT 
    c.id,
    c.name,
    c.phone,
    a.appointment_date,
    a.appointment_time
FROM clients c
JOIN appointments a ON a.client_id = c.id
WHERE c.phone = '5546999151842'
ORDER BY a.created_at DESC;

-- =====================================================
-- VERIFICAR TAMANHO DO CAMPO (se estiver truncando)
-- =====================================================
SELECT 
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'clients'
  AND column_name = 'phone';

-- Se o campo for menor que 15 caracteres, aumente:
-- ALTER TABLE public.clients ALTER COLUMN phone TYPE VARCHAR(20);

