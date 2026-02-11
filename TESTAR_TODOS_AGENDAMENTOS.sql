-- =====================================================
-- TESTAR FUNÇÃO PARA TODOS OS AGENDAMENTOS RECENTES
-- =====================================================

-- 1. Listar agendamentos recentes com telefone válido
SELECT 
    a.id,
    a.created_at,
    cl.name as cliente,
    cl.phone,
    CASE 
        WHEN cl.phone = '00000000000' THEN '❌ INVÁLIDO'
        WHEN cl.phone IS NULL OR TRIM(cl.phone) = '' THEN '❌ VAZIO'
        ELSE '✅ VÁLIDO'
    END as status_telefone
FROM appointments a
JOIN clients cl ON cl.id = a.client_id
WHERE a.created_at >= NOW() - INTERVAL '1 day'
  AND cl.phone != '00000000000'
  AND cl.phone IS NOT NULL
  AND TRIM(cl.phone) != ''
ORDER BY a.created_at DESC
LIMIT 5;

-- 2. Executar função para cada agendamento válido
-- Substitua os IDs pelos IDs retornados acima

-- Exemplo 1:
SELECT 
    'Teste 1' as teste,
    public.schedule_whatsapp_messages_for_appointment('e4204821-d351-4139-8ebc-1058a3dec197'::UUID) as resultado;

-- 3. Verificar todos os logs criados
SELECT 
    id,
    appointment_id,
    message_kind_id,
    scheduled_for,
    status,
    created_at
FROM message_send_log
ORDER BY created_at DESC
LIMIT 10;


