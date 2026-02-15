
-- PASSO 1: RESETAR MENSAGENS FAILED PARA REENVIO
-- Isso vai fazer com que as 4 mensagens que falharam sejam reenviadas
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
    '=== MENSAGENS RESETADAS ===' as secao,
    COUNT(*) as total_resetadas
FROM message_send_log
WHERE status = 'PENDING'
  AND updated_at >= NOW() - INTERVAL '1 minute';

| secao                       | total_resetadas |
| --------------------------- | --------------- |
| === MENSAGENS RESETADAS === | 0               |
-- PASSO 2: CRIAR LOGS PARA AGENDAMENTOS QUE NÃO TÊM
-- Execute a função schedule_whatsapp_messages_for_appointment para cada agendamento sem log

-- Agendamento 1
SELECT public.schedule_whatsapp_messages_for_appointment('17e92d3a-9d3c-46f2-a40b-4ca5ee6b1aa2'::UUID) as resultado_1;
| resultado_1                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| {"errors":["Erro ao criar log para message_kind cfbd956a-cce5-4ba0-9af3-7549447c7d27: record \"v_appointment\" has no field \"created_at\" (SQLSTATE: 42703)"],"message":"Processamento concluído com sucesso.","success":true,"debug_info":{"has_provider":true,"appointment_id":"17e92d3a-9d3c-46f2-a40b-4ca5ee6b1aa2","has_valid_phone":true,"total_schedules_found":2},"logs_created":1,"logs_skipped":1} |

-- Agendamento 2
SELECT public.schedule_whatsapp_messages_for_appointment('e4cdaa26-18b1-48e5-a2bd-b041fd2fcec7'::UUID) as resultado_2;

| resultado_2                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| {"errors":["Erro ao criar log para message_kind cfbd956a-cce5-4ba0-9af3-7549447c7d27: record \"v_appointment\" has no field \"created_at\" (SQLSTATE: 42703)"],"message":"Processamento concluído com sucesso.","success":true,"debug_info":{"has_provider":true,"appointment_id":"e4cdaa26-18b1-48e5-a2bd-b041fd2fcec7","has_valid_phone":true,"total_schedules_found":2},"logs_created":1,"logs_skipped":1} |
-- Agendamento 3
SELECT public.schedule_whatsapp_messages_for_appointment('92e3d5f1-0aeb-477d-b4d3-efdef50937ee'::UUID) as resultado_3;

| resultado_3                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| {"errors":["Erro ao criar log para message_kind cfbd956a-cce5-4ba0-9af3-7549447c7d27: record \"v_appointment\" has no field \"created_at\" (SQLSTATE: 42703)"],"message":"Processamento concluído com sucesso.","success":true,"debug_info":{"has_provider":true,"appointment_id":"92e3d5f1-0aeb-477d-b4d3-efdef50937ee","has_valid_phone":true,"total_schedules_found":2},"logs_created":1,"logs_skipped":1} |
-- Agendamento 4
SELECT public.schedule_whatsapp_messages_for_appointment('04080d64-860c-4e00-8df8-453b6fef2dc8'::UUID) as resultado_4;

| resultado_4                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| {"errors":["Erro ao criar log para message_kind cfbd956a-cce5-4ba0-9af3-7549447c7d27: record \"v_appointment\" has no field \"created_at\" (SQLSTATE: 42703)"],"message":"Processamento concluído com sucesso.","success":true,"debug_info":{"has_provider":true,"appointment_id":"04080d64-860c-4e00-8df8-453b6fef2dc8","has_valid_phone":true,"total_schedules_found":2},"logs_created":1,"logs_skipped":1} |
-- Agendamento 5
SELECT public.schedule_whatsapp_messages_for_appointment('e1af9733-febd-4bb1-b3d7-51c82e924961'::UUID) as resultado_5;

| resultado_5                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| {"errors":["Erro ao criar log para message_kind cfbd956a-cce5-4ba0-9af3-7549447c7d27: record \"v_appointment\" has no field \"created_at\" (SQLSTATE: 42703)"],"message":"Processamento concluído com sucesso.","success":true,"debug_info":{"has_provider":true,"appointment_id":"e1af9733-febd-4bb1-b3d7-51c82e924961","has_valid_phone":true,"total_schedules_found":2},"logs_created":1,"logs_skipped":1} |
-- PASSO 3: VERIFICAR CONFIGURAÇÃO DO PROVEDOR
-- O erro ERR_NO_WHATSAPP_CONNECTION geralmente significa:
-- 1. user_id ou queue_id incorretos no LiotPRO
-- 2. Conexão WhatsApp não está ativa no painel do LiotPRO
-- 3. Token de autenticação expirado ou inválido

SELECT 
    '=== CONFIGURAÇÃO DO PROVEDOR ===' as secao,
    id,
    name,
    base_url,
    auth_key,
    CASE 
        WHEN auth_token IS NOT NULL AND LENGTH(auth_token) > 10 THEN '✅ TEM TOKEN (verificar se está válido)'
        ELSE '❌ TOKEN INVÁLIDO OU AUSENTE'
    END as status_token,
    user_id,
    queue_id,
    CASE 
        WHEN user_id IS NULL OR user_id = '' THEN '❌ USER_ID VAZIO - CORRIGIR!'
        WHEN queue_id IS NULL OR queue_id = '' THEN '❌ QUEUE_ID VAZIO - CORRIGIR!'
        ELSE '✅ USER_ID E QUEUE_ID PREENCHIDOS'
    END as status_ids,
    payload_template
FROM messaging_providers
WHERE channel = 'WHATSAPP'
  AND is_active = TRUE
LIMIT 1;
| secao                            | id                                   | name     | base_url                                           | auth_key      | status_token                           | user_id | queue_id | status_ids                       | payload_template                                                                                                                            |
| -------------------------------- | ------------------------------------ | -------- | -------------------------------------------------- | ------------- | -------------------------------------- | ------- | -------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| === CONFIGURAÇÃO DO PROVEDOR === | e6d7c903-96d9-4e3a-9948-25075d6c1dbf | WHATSAPP | https://liotteste.liotpro.online/api/messages/send | Authorization | ✅ TEM TOKEN (verificar se está válido) | 2       | 3        | ✅ USER_ID E QUEUE_ID PREENCHIDOS | {"body":"{text}","number":"{phone}","status":"pending","userId":"{userId}","queueId":"{queueId}","closeTicket":false,"sendSignature":false} |
-- PASSO 4: VERIFICAR SE AGORA HÁ MENSAGENS PENDING
SELECT 
    '=== MENSAGENS PENDING APÓS CORREÇÕES ===' as secao,
    COUNT(*) as total_pending,
    MIN(scheduled_for AT TIME ZONE 'America/Sao_Paulo') as primeira_agendada,
    MAX(scheduled_for AT TIME ZONE 'America/Sao_Paulo') as ultima_agendada
FROM message_send_log
WHERE status = 'PENDING';
| secao                                    | total_pending | primeira_agendada   | ultima_agendada     |
| ---------------------------------------- | ------------- | ------------------- | ------------------- |
| === MENSAGENS PENDING APÓS CORREÇÕES === | 9             | 2026-02-11 22:20:00 | 2026-02-13 06:50:00 |

-- =====================================================
-- INSTRUÇÕES APÓS EXECUTAR ESTE SQL:
-- =====================================================
-- 1. Verifique o resultado do PASSO 3 (configuração do provedor)
-- 2. Se user_id ou queue_id estiverem vazios, corrija no painel do LiotPRO
-- 3. Verifique se a conexão WhatsApp está ativa no painel do LiotPRO
-- 4. Execute novamente a Edge Function via PowerShell:
--    .\scripts\test-whatsapp-scheduler.ps1
-- 5. Verifique os logs da Edge Function no Supabase Dashboard
-- =====================================================

