-- =====================================================
-- CORRIGIR TELEFONES PLACEHOLDER E TESTAR FUNÇÃO
-- =====================================================

-- 1. Verificar quais clientes têm telefone placeholder
SELECT 
    id,
    name,
    phone,
    CASE 
        WHEN phone = '00000000000' THEN '❌ PLACEHOLDER'
        WHEN phone IS NULL OR TRIM(phone) = '' THEN '❌ VAZIO'
        ELSE '✅ VÁLIDO'
    END as status_telefone
FROM clients
WHERE id IN (
    SELECT DISTINCT client_id 
    FROM appointments 
    WHERE created_at >= NOW() - INTERVAL '1 day'
    ORDER BY created_at DESC
    LIMIT 10
);

-- 2. Atualizar telefones placeholder para um telefone válido de teste
-- ATENÇÃO: Substitua '5546999999999' por um telefone válido real
UPDATE clients 
SET phone = '5546999999999'  -- ⚠️ SUBSTITUA POR TELEFONE VÁLIDO
WHERE phone = '00000000000' 
  AND id IN (
    SELECT DISTINCT client_id 
    FROM appointments 
    WHERE created_at >= NOW() - INTERVAL '1 day'
  );

-- 3. Verificar se há agendamentos com clientes que têm telefone válido
SELECT 
    a.id as appointment_id,
    a.created_at,
    cl.name as cliente,
    cl.phone,
    CASE 
        WHEN cl.phone = '00000000000' THEN '❌ PLACEHOLDER'
        WHEN cl.phone IS NULL OR TRIM(cl.phone) = '' THEN '❌ VAZIO'
        ELSE '✅ VÁLIDO'
    END as status_telefone
FROM appointments a
JOIN clients cl ON cl.id = a.client_id
WHERE a.created_at >= NOW() - INTERVAL '1 day'
ORDER BY a.created_at DESC
LIMIT 10;

-- 4. Testar função com agendamento que tem telefone válido
-- Use o appointment_id de um agendamento com telefone válido
-- Exemplo: e4204821-d351-4139-8ebc-1058a3dec197 (cliente "Padrão" com telefone 5546999151842)
SELECT 
    '=== TESTE COM TELEFONE VÁLIDO ===' as secao,
    public.schedule_whatsapp_messages_for_appointment('e4204821-d351-4139-8ebc-1058a3dec197'::UUID) as resultado;

-- 5. Verificar se logs foram criados
SELECT 
    '=== LOGS CRIADOS ===' as secao,
    id,
    appointment_id,
    message_kind_id,
    scheduled_for,
    status,
    created_at
FROM message_send_log
WHERE appointment_id = 'e4204821-d351-4139-8ebc-1058a3dec197'
ORDER BY created_at DESC;

