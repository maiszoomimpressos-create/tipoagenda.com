-- =====================================================
-- CORRIGIR TELEFONE DO CLIENTE EDER
-- =====================================================

-- 1. Verificar cliente atual
SELECT 
    id,
    name,
    phone,
    LENGTH(phone) as tamanho_atual
FROM clients
WHERE LOWER(name) LIKE '%eder%'
   OR phone LIKE '%46999%'
ORDER BY created_at DESC
LIMIT 5;

-- 2. CORRIGIR TELEFONE (substitua CLIENT_ID pelo ID encontrado acima)
-- Telefone correto: 5546999151842
UPDATE clients
SET phone = '5546999151842'
WHERE id = 'CLIENT_ID_AQUI';  -- ⚠️ SUBSTITUA PELO ID DO CLIENTE

-- OU atualizar pelo nome (se tiver certeza que é único):
UPDATE clients
SET phone = '5546999151842'
WHERE LOWER(name) LIKE '%eder%'
  AND phone LIKE '%46999%';

-- 3. Verificar se foi atualizado
SELECT 
    id,
    name,
    phone,
    LENGTH(phone) as tamanho_atualizado
FROM clients
WHERE phone = '5546999151842'
   OR LOWER(name) LIKE '%eder%';

-- =====================================================
-- VERIFICAR TAMANHO DO CAMPO NO BANCO
-- =====================================================
SELECT 
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'clients'
  AND column_name = 'phone';

-- =====================================================
-- Se o campo phone for muito curto (ex: VARCHAR(10)),
-- pode estar truncando. Verifique e aumente se necessário:
-- ALTER TABLE clients ALTER COLUMN phone TYPE VARCHAR(20);
-- =====================================================

