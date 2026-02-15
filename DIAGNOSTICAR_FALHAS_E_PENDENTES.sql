-- =====================================================
-- DIAGNOSTICAR FALHAS E MENSAGENS PENDENTES
-- =====================================================
-- Execute este SQL para entender por que não há mensagens
-- sendo enviadas e por que 4 falharam
-- =====================================================

-- 1. VER TODAS AS MENSAGENS POR STATUS
SELECT 
    '=== RESUMO COMPLETO ===' as secao,
    status,
    COUNT(*) as total,
    MIN(created_at) as primeira_criada,
    MAX(updated_at) as ultima_atualizada
FROM message_send_log
GROUP BY status
ORDER BY status;

| secao                   | status | total | primeira_criada               | ultima_atualizada             |
| ----------------------- | ------ | ----- | ----------------------------- | ----------------------------- |
| === RESUMO COMPLETO === | FAILED | 4     | 2026-02-13 02:07:58.975943+00 | 2026-02-13 02:14:40.621618+00 |

-- 2. VER DETALHES DAS 4 MENSAGENS QUE FALHARAM
SELECT 
    '=== MENSAGENS QUE FALHARAM ===' as secao,
    msl.id,
    msl.appointment_id,
    a.appointment_date,
    a.appointment_time,
    cl.name as cliente,
    cl.phone as telefone,
    mk.code as tipo_mensagem,
    msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
    msl.status,
    msl.sent_at,
    msl.provider_response,
    CASE 
        WHEN msl.provider_response::text LIKE '%401%' OR msl.provider_response::text LIKE '%unauthorized%' THEN '❌ ERRO DE AUTENTICAÇÃO (token inválido)'
        WHEN msl.provider_response::text LIKE '%403%' OR msl.provider_response::text LIKE '%forbidden%' THEN '❌ ERRO DE PERMISSÃO (sem acesso)'
        WHEN msl.provider_response::text LIKE '%404%' THEN '❌ URL DO PROVEDOR INCORRETA'
        WHEN msl.provider_response::text LIKE '%400%' OR msl.provider_response::text LIKE '%bad request%' THEN '❌ DADOS INVÁLIDOS (formato do telefone, etc)'
        WHEN msl.provider_response::text LIKE '%500%' OR msl.provider_response::text LIKE '%server error%' THEN '❌ ERRO NO SERVIDOR DO PROVEDOR'
        WHEN msl.provider_response::text LIKE '%Telefone%' OR msl.provider_response::text LIKE '%phone%' THEN '❌ TELEFONE INVÁLIDO'
        ELSE '❓ ERRO DESCONHECIDO - VER provider_response'
    END as tipo_erro
FROM message_send_log msl
LEFT JOIN appointments a ON a.id = msl.appointment_id
LEFT JOIN clients cl ON cl.id = msl.client_id
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE msl.status = 'FAILED'
ORDER BY msl.updated_at DESC;

| secao                          | id                                   | appointment_id                       | appointment_date | appointment_time | cliente     | telefone      | tipo_mensagem        | scheduled_for_brasilia | status | sent_at                    | provider_response                                                 | tipo_erro                                    |
| ------------------------------ | ------------------------------------ | ------------------------------------ | ---------------- | ---------------- | ----------- | ------------- | -------------------- | ---------------------- | ------ | -------------------------- | ----------------------------------------------------------------- | -------------------------------------------- |
| === MENSAGENS QUE FALHARAM === | 926cc879-0da8-4403-9c41-5ba945931a78 | 420c32b0-7a52-4f89-997e-28980fe7fe02 | 2026-02-13       | 07:00:00         | Edson Filho | 5546999151842 | APPOINTMENT_REMINDER | 2026-02-13 06:50:00    | FAILED | 2026-02-13 09:40:57.874+00 | {"code":400,"error":"ERR_NO_WHATSAPP_CONNECTION","success":false} | ❌ DADOS INVÁLIDOS (formato do telefone, etc) |
| === MENSAGENS QUE FALHARAM === | df2513ec-b92f-4f43-b1b7-b059d2b1230c | bbe7a36b-c925-45c4-ba83-75d68fabe56a | 2026-02-13       | 06:00:00         | Edson Filho | 5546999151842 | APPOINTMENT_REMINDER | 2026-02-13 05:50:00    | FAILED | 2026-02-13 09:40:57.752+00 | {"code":400,"error":"ERR_NO_WHATSAPP_CONNECTION","success":false} | ❌ DADOS INVÁLIDOS (formato do telefone, etc) |
| === MENSAGENS QUE FALHARAM === | addd697b-a4db-48ef-b3e4-8132719acce1 | e412bc8c-a345-4561-b88c-6a6bc3faced6 | 2026-02-13       | 06:00:00         | amanda      | 5546999174521 | APPOINTMENT_REMINDER | 2026-02-13 05:50:00    | FAILED | 2026-02-13 09:40:57.618+00 | {"code":400,"error":"ERR_NO_WHATSAPP_CONNECTION","success":false} | ❌ DADOS INVÁLIDOS (formato do telefone, etc) |
| === MENSAGENS QUE FALHARAM === | 81dbdf27-c458-4c49-9e6e-1d323a18e729 | f9305c67-3f32-4551-8ab6-d621bd01ee04 | 2026-02-13       | 06:00:00         | Lyon        | 46999151842   | APPOINTMENT_REMINDER | 2026-02-13 05:50:00    | FAILED | 2026-02-13 09:40:57.426+00 | {"code":400,"error":"ERR_NO_WHATSAPP_CONNECTION","success":false} | ❌ DADOS INVÁLIDOS (formato do telefone, etc) |

-- 3. VERIFICAR SE HÁ MENSAGENS PENDING QUE DEVERIAM SER ENVIADAS
SELECT 
    '=== MENSAGENS PENDING (DEVERIAM SER ENVIADAS) ===' as secao,
    msl.id,
    msl.appointment_id,
    a.appointment_date,
    a.appointment_time,
    cl.name as cliente,
    cl.phone as telefone,
    mk.code as tipo_mensagem,
    msl.scheduled_for,
    msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
    NOW() AT TIME ZONE 'America/Sao_Paulo' as agora_brasilia,
    msl.status,
    CASE 
        WHEN msl.scheduled_for::timestamp <= NOW() THEN '⚠️ DEVERIA TER SIDO ENVIADA JÁ!'
        ELSE '⏳ AINDA NÃO É HORA'
    END as status_envio
FROM message_send_log msl
LEFT JOIN appointments a ON a.id = msl.appointment_id
LEFT JOIN clients cl ON cl.id = msl.client_id
LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
WHERE msl.status = 'PENDING'
ORDER BY msl.scheduled_for
LIMIT 20;
Success. No rows returned

-- 4. VERIFICAR AGENDAMENTOS RECENTES SEM LOGS (POR QUE NÃO ESTÃO SENDO CRIADOS?)
SELECT 
    '=== AGENDAMENTOS RECENTES SEM LOGS ===' as secao,
    a.id as appointment_id,
    a.appointment_date,
    a.appointment_time,
    cl.name as cliente,
    cl.phone as telefone,
    a.status as status_agendamento,
    a.created_at,
    c.whatsapp_messaging_enabled,
    CASE 
        WHEN c.whatsapp_messaging_enabled = FALSE THEN '❌ WHATSAPP DESABILITADO NA EMPRESA'
        WHEN cl.phone IS NULL OR cl.phone = '' OR cl.phone = '00000000000' THEN '❌ CLIENTE SEM TELEFONE VÁLIDO'
        WHEN NOT EXISTS (
            SELECT 1 FROM company_message_schedules cms 
            WHERE cms.company_id = a.company_id 
            AND cms.channel = 'WHATSAPP' 
            AND cms.is_active = TRUE
        ) THEN '❌ SEM REGRAS DE ENVIO CONFIGURADAS'
        ELSE '⚠️ LOGS NÃO FORAM CRIADOS (POSSÍVEL ERRO NA FUNÇÃO schedule_whatsapp_messages_for_appointment)'
    END as possivel_causa
FROM appointments a
JOIN companies c ON c.id = a.company_id
LEFT JOIN clients cl ON cl.id = a.client_id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '2 days'
  AND a.status NOT IN ('cancelado', 'desistencia')
  AND NOT EXISTS (
      SELECT 1 FROM message_send_log msl 
      WHERE msl.appointment_id = a.id
  )
ORDER BY a.created_at DESC
LIMIT 10;

| secao                                  | appointment_id                       | appointment_date | appointment_time | cliente         | telefone      | status_agendamento | created_at                    | whatsapp_messaging_enabled | possivel_causa                                                                                 |
| -------------------------------------- | ------------------------------------ | ---------------- | ---------------- | --------------- | ------------- | ------------------ | ----------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------- |
| === AGENDAMENTOS RECENTES SEM LOGS === | 178a7f3c-02d5-40a2-abeb-c112b4cdef0c | 2026-02-12       | 14:00:00         | Padrão          | 5546999151842 | pendente           | 2026-02-12 16:44:41.590389+00 | false                      | ❌ WHATSAPP DESABILITADO NA EMPRESA                                                             |
| === AGENDAMENTOS RECENTES SEM LOGS === | 17e92d3a-9d3c-46f2-a40b-4ca5ee6b1aa2 | 2026-02-12       | 07:00:00         | Edson Filho     | 5546999151842 | pendente           | 2026-02-12 09:33:39.359647+00 | true                       | ⚠️ LOGS NÃO FORAM CRIADOS (POSSÍVEL ERRO NA FUNÇÃO schedule_whatsapp_messages_for_appointment) |
| === AGENDAMENTOS RECENTES SEM LOGS === | e4cdaa26-18b1-48e5-a2bd-b041fd2fcec7 | 2026-02-12       | 07:00:00         | Padrão          | 5546999151842 | pendente           | 2026-02-12 09:32:49.28162+00  | true                       | ⚠️ LOGS NÃO FORAM CRIADOS (POSSÍVEL ERRO NA FUNÇÃO schedule_whatsapp_messages_for_appointment) |
| === AGENDAMENTOS RECENTES SEM LOGS === | 92e3d5f1-0aeb-477d-b4d3-efdef50937ee | 2026-02-12       | 07:00:00         | Lyon            | 46999151842   | pendente           | 2026-02-12 09:31:28.741013+00 | true                       | ⚠️ LOGS NÃO FORAM CRIADOS (POSSÍVEL ERRO NA FUNÇÃO schedule_whatsapp_messages_for_appointment) |
| === AGENDAMENTOS RECENTES SEM LOGS === | 04080d64-860c-4e00-8df8-453b6fef2dc8 | 2026-02-11       | 22:30:00         | amanda          | 5546999174521 | pendente           | 2026-02-12 01:23:34.629242+00 | true                       | ⚠️ LOGS NÃO FORAM CRIADOS (POSSÍVEL ERRO NA FUNÇÃO schedule_whatsapp_messages_for_appointment) |
| === AGENDAMENTOS RECENTES SEM LOGS === | 7578cbcd-d7e7-4b38-89b5-68a76312cfc9 | 2026-02-12       | 09:00:00         | amanda          | 5546999174521 | concluido          | 2026-02-12 01:15:36.937186+00 | true                       | ⚠️ LOGS NÃO FORAM CRIADOS (POSSÍVEL ERRO NA FUNÇÃO schedule_whatsapp_messages_for_appointment) |
| === AGENDAMENTOS RECENTES SEM LOGS === | 407fce4e-e303-478b-a40f-d3e17b65bce2 | 2026-02-11       | 22:30:00         | amanda          | 5546999174521 | pendente           | 2026-02-12 01:06:38.886033+00 | true                       | ⚠️ LOGS NÃO FORAM CRIADOS (POSSÍVEL ERRO NA FUNÇÃO schedule_whatsapp_messages_for_appointment) |
| === AGENDAMENTOS RECENTES SEM LOGS === | e1af9733-febd-4bb1-b3d7-51c82e924961 | 2026-02-12       | 09:00:00         | Edson Filho     | 5546999151842 | pendente           | 2026-02-12 01:04:41.870489+00 | true                       | ⚠️ LOGS NÃO FORAM CRIADOS (POSSÍVEL ERRO NA FUNÇÃO schedule_whatsapp_messages_for_appointment) |
| === AGENDAMENTOS RECENTES SEM LOGS === | 97911fe4-254a-477d-8cb8-9404fcd508eb | 2026-02-11       | 15:30:00         | poliana azevedo | 5546999151842 | pendente           | 2026-02-11 18:00:42.805256+00 | false                      | ❌ WHATSAPP DESABILITADO NA EMPRESA                                                             |
| === AGENDAMENTOS RECENTES SEM LOGS === | b4da00da-6f4c-4db5-a389-43c97a066bf6 | 2026-02-11       | 09:30:00         | poliana azevedo | 5546999151842 | pendente           | 2026-02-11 10:07:16.737738+00 | false                      | ❌ WHATSAPP DESABILITADO NA EMPRESA                                                             |
-- 5. VERIFICAR PROVEDOR CONFIGURADO
SELECT 
    '=== PROVEDOR DE WHATSAPP ===' as secao,
    id,
    name,
    channel,
    is_active,
    base_url,
    http_method,
    CASE 
        WHEN auth_key IS NOT NULL AND auth_token IS NOT NULL THEN '✅ TEM AUTENTICAÇÃO'
        ELSE '❌ SEM AUTENTICAÇÃO'
    END as status_auth,
    CASE 
        WHEN user_id IS NOT NULL AND user_id != '' THEN '✅ TEM USER_ID'
        ELSE '❌ SEM USER_ID'
    END as status_user_id,
    CASE 
        WHEN queue_id IS NOT NULL AND queue_id != '' THEN '✅ TEM QUEUE_ID'
        ELSE '❌ SEM QUEUE_ID'
    END as status_queue_id
FROM messaging_providers
WHERE channel = 'WHATSAPP'
ORDER BY is_active DESC, created_at DESC
LIMIT 1;
| secao                        | id                                   | name     | channel  | is_active | base_url                                           | http_method | status_auth        | status_user_id | status_queue_id |
| ---------------------------- | ------------------------------------ | -------- | -------- | --------- | -------------------------------------------------- | ----------- | ------------------ | -------------- | --------------- |
| === PROVEDOR DE WHATSAPP === | e6d7c903-96d9-4e3a-9948-25075d6c1dbf | WHATSAPP | WHATSAPP | true      | https://liotteste.liotpro.online/api/messages/send | POST        | ✅ TEM AUTENTICAÇÃO | ✅ TEM USER_ID  | ✅ TEM QUEUE_ID  |
-- =====================================================
-- FIM DO DIAGNÓSTICO
-- =====================================================



SELECT 
    msl.id,
    msl.appointment_id,
    cl.name as cliente,
    cl.phone as telefone,
    msl.provider_response,
    msl.sent_at
FROM message_send_log msl
LEFT JOIN clients cl ON cl.id = msl.client_id
WHERE msl.status = 'FAILED'
ORDER BY msl.updated_at DESC;
| id                                   | appointment_id                       | cliente     | telefone      | provider_response                                                 | sent_at                    |
| ------------------------------------ | ------------------------------------ | ----------- | ------------- | ----------------------------------------------------------------- | -------------------------- |
| 926cc879-0da8-4403-9c41-5ba945931a78 | 420c32b0-7a52-4f89-997e-28980fe7fe02 | Edson Filho | 5546999151842 | {"code":400,"error":"ERR_NO_WHATSAPP_CONNECTION","success":false} | 2026-02-13 09:40:57.874+00 |
| df2513ec-b92f-4f43-b1b7-b059d2b1230c | bbe7a36b-c925-45c4-ba83-75d68fabe56a | Edson Filho | 5546999151842 | {"code":400,"error":"ERR_NO_WHATSAPP_CONNECTION","success":false} | 2026-02-13 09:40:57.752+00 |
| addd697b-a4db-48ef-b3e4-8132719acce1 | e412bc8c-a345-4561-b88c-6a6bc3faced6 | amanda      | 5546999174521 | {"code":400,"error":"ERR_NO_WHATSAPP_CONNECTION","success":false} | 2026-02-13 09:40:57.618+00 |
| 81dbdf27-c458-4c49-9e6e-1d323a18e729 | f9305c67-3f32-4551-8ab6-d621bd01ee04 | Lyon        | 46999151842   | {"code":400,"error":"ERR_NO_WHATSAPP_CONNECTION","success":false} | 2026-02-13 09:40:57.426+00 |


SELECT 
    COUNT(*) as total_pending,
    MIN(scheduled_for AT TIME ZONE 'America/Sao_Paulo') as primeira_agendada,
    MAX(scheduled_for AT TIME ZONE 'America/Sao_Paulo') as ultima_agendada
FROM message_send_log
WHERE status = 'PENDING';

| total_pending | primeira_agendada | ultima_agendada |
| ------------- | ----------------- | --------------- |
| 0             | null              | null            |

SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    cl.name as cliente,
    cl.phone,
    a.created_at
FROM appointments a
LEFT JOIN clients cl ON cl.id = a.client_id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '1 day'
  AND a.status NOT IN ('cancelado', 'desistencia')
  AND NOT EXISTS (
      SELECT 1 FROM message_send_log msl 
      WHERE msl.appointment_id = a.id
  )
ORDER BY a.created_at DESC
LIMIT 5;

| id                                   | appointment_date | appointment_time | cliente     | phone         | created_at                    |
| ------------------------------------ | ---------------- | ---------------- | ----------- | ------------- | ----------------------------- |
| 178a7f3c-02d5-40a2-abeb-c112b4cdef0c | 2026-02-12       | 14:00:00         | Padrão      | 5546999151842 | 2026-02-12 16:44:41.590389+00 |
| 17e92d3a-9d3c-46f2-a40b-4ca5ee6b1aa2 | 2026-02-12       | 07:00:00         | Edson Filho | 5546999151842 | 2026-02-12 09:33:39.359647+00 |
| e4cdaa26-18b1-48e5-a2bd-b041fd2fcec7 | 2026-02-12       | 07:00:00         | Padrão      | 5546999151842 | 2026-02-12 09:32:49.28162+00  |
| 92e3d5f1-0aeb-477d-b4d3-efdef50937ee | 2026-02-12       | 07:00:00         | Lyon        | 46999151842   | 2026-02-12 09:31:28.741013+00 |
| 04080d64-860c-4e00-8df8-453b6fef2dc8 | 2026-02-11       | 22:30:00         | amanda      | 5546999174521 | 2026-02-12 01:23:34.629242+00 |