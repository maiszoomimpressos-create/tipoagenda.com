-- =====================================================
-- TESTAR ENVIO MANUAL DE MENSAGENS PENDING
-- =====================================================
-- Este script simula o que a Edge Function deveria fazer
-- para verificar se há algum problema de acesso
-- =====================================================

-- 1. Verificar se conseguimos buscar mensagens PENDING como service_role
-- (Simulado - não podemos realmente executar como service_role via SQL)
-- Mas podemos verificar se há algum problema na estrutura

-- 2. Verificar se as mensagens têm todos os dados necessários
SELECT 
    msl.id,
    msl.appointment_id,
    msl.client_id,
    msl.company_id,
    msl.message_kind_id,
    msl.provider_id,
    msl.scheduled_for,
    msl.status,
    CASE 
        WHEN msl.client_id IS NULL THEN '❌ SEM CLIENT_ID'
        WHEN msl.company_id IS NULL THEN '❌ SEM COMPANY_ID'
        WHEN msl.provider_id IS NULL THEN '❌ SEM PROVIDER_ID'
        WHEN msl.message_kind_id IS NULL THEN '❌ SEM MESSAGE_KIND_ID'
        ELSE '✅ DADOS COMPLETOS'
    END as validacao_dados
FROM message_send_log msl
WHERE msl.status = 'PENDING'
  AND msl.scheduled_for <= NOW()
ORDER BY msl.scheduled_for ASC
LIMIT 10;

-- 3. Verificar se os clientes têm telefone
SELECT 
    msl.id as log_id,
    msl.client_id,
    c.name as cliente,
    c.phone as telefone,
    CASE 
        WHEN c.phone IS NULL OR TRIM(c.phone) = '' THEN '❌ SEM TELEFONE'
        WHEN LENGTH(REGEXP_REPLACE(c.phone, '[^0-9]', '', 'g')) < 10 THEN '❌ TELEFONE INVÁLIDO'
        ELSE '✅ TELEFONE OK'
    END as validacao_telefone
FROM message_send_log msl
JOIN clients c ON c.id = msl.client_id
WHERE msl.status = 'PENDING'
  AND msl.scheduled_for <= NOW()
ORDER BY msl.scheduled_for ASC
LIMIT 10;

-- 4. Verificar se há provedor ativo
SELECT 
    id,
    name,
    channel,
    is_active,
    CASE 
        WHEN is_active = TRUE THEN '✅ PROVEDOR ATIVO'
        ELSE '❌ PROVEDOR INATIVO'
    END as status_provedor
FROM messaging_providers
WHERE channel = 'WHATSAPP'
ORDER BY is_active DESC, created_at DESC
LIMIT 1;















