

-- 1. REENVIAR MENSAGENS QUE FALHARAM (APÓS CORRIGIR O PROVEDOR)
-- Primeiro, vamos resetar as mensagens FAILED para PENDING
-- para que sejam reenviadas na próxima execução
UPDATE message_send_log
SET 
    status = 'PENDING',
    sent_at = NULL,
    provider_response = NULL,
    updated_at = NOW()
WHERE status = 'FAILED'
  AND provider_response::text LIKE '%ERR_NO_WHATSAPP_CONNECTION%';

Success. No rows returned

-- Verificar quantas foram resetadas
SELECT 
    '=== MENSAGENS RESETADAS PARA REENVIO ===' as secao,
    COUNT(*) as total_resetadas
FROM message_send_log
WHERE status = 'PENDING'
  AND updated_at >= NOW() - INTERVAL '1 minute';

| secao                                    | total_resetadas |
| ---------------------------------------- | --------------- |
| === MENSAGENS RESETADAS PARA REENVIO === | 4               |
-- 2. CRIAR LOGS PARA AGENDAMENTOS QUE NÃO TÊM (MANUALMENTE)
-- Execute a função schedule_whatsapp_messages_for_appointment para cada agendamento sem log
-- Substitua os IDs pelos appointment_id que aparecem na query 4 do diagnóstico

-- Exemplo para um agendamento específico:
-- SELECT public.schedule_whatsapp_messages_for_appointment('17e92d3a-9d3c-46f2-a40b-4ca5ee6b1aa2'::UUID);

-- 3. VERIFICAR SE O PROVEDOR ESTÁ COM CONFIGURAÇÃO CORRETA
-- O erro ERR_NO_WHATSAPP_CONNECTION geralmente significa:
-- - user_id ou queue_id incorretos
-- - Conexão WhatsApp não está ativa no LiotPRO
-- - Token de autenticação expirado ou inválido

SELECT 
    '=== VERIFICAR CONFIGURAÇÃO DO PROVEDOR ===' as secao,
    id,
    name,
    base_url,
    auth_key,
    CASE 
        WHEN auth_token IS NOT NULL THEN '✅ TEM TOKEN (verificar se está válido)'
        ELSE '❌ SEM TOKEN'
    END as status_token,
    user_id,
    queue_id,
    CASE 
        WHEN user_id IS NULL OR user_id = '' THEN '❌ USER_ID VAZIO'
        WHEN queue_id IS NULL OR queue_id = '' THEN '❌ QUEUE_ID VAZIO'
        ELSE '✅ USER_ID E QUEUE_ID PREENCHIDOS'
    END as status_ids
FROM messaging_providers
WHERE channel = 'WHATSAPP'
  AND is_active = TRUE
LIMIT 1;

| secao                                      | id                                   | name     | base_url                                           | auth_key      | status_token                           | user_id | queue_id | status_ids                       |
| ------------------------------------------ | ------------------------------------ | -------- | -------------------------------------------------- | ------------- | -------------------------------------- | ------- | -------- | -------------------------------- |
| === VERIFICAR CONFIGURAÇÃO DO PROVEDOR === | e6d7c903-96d9-4e3a-9948-25075d6c1dbf | WHATSAPP | https://liotteste.liotpro.online/api/messages/send | Authorization | ✅ TEM TOKEN (verificar se está válido) | 2       | 3        | ✅ USER_ID E QUEUE_ID PREENCHIDOS |
-- =====================================================
-- INSTRUÇÕES:
-- 1. Primeiro, verifique se o user_id e queue_id estão corretos no LiotPRO
-- 2. Verifique se a conexão WhatsApp está ativa no painel do LiotPRO
-- 3. Execute o UPDATE acima para resetar as mensagens FAILED
-- 4. Execute a função schedule_whatsapp_messages_for_appointment para agendamentos sem log
-- 5. Execute novamente a Edge Function via PowerShell
-- =====================================================

