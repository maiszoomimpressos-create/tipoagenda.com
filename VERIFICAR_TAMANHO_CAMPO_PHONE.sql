-- =====================================================
-- VERIFICAR TAMANHO DO CAMPO PHONE
-- =====================================================

-- Verificar tamanho atual do campo
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'clients'
  AND column_name = 'phone';

-- =====================================================
-- Se o campo for menor que 15 caracteres, 
-- execute este comando para aumentar:
-- =====================================================
-- ALTER TABLE public.clients ALTER COLUMN phone TYPE VARCHAR(20);
-- =====================================================

-- Verificar telefones truncados (menos de 10 dígitos)
SELECT 
    id,
    name,
    phone,
    LENGTH(phone) as tamanho
FROM clients
WHERE phone IS NOT NULL
  AND LENGTH(phone) < 10
ORDER BY created_at DESC
LIMIT 20;

