# ✅ GARANTIA DE ENVIO DE MENSAGENS WHATSAPP

## 📋 CHECKLIST DE VERIFICAÇÃO

Para garantir que as mensagens serão enviadas para os 3 agendamentos de amanhã às 6:00, execute o SQL `VERIFICACAO_COMPLETA_ENVIO_MENSAGENS.sql` e verifique:

### 1. ✅ Cron Job Ativo
- **O que verificar:** O cron job `whatsapp-message-scheduler-job` deve estar `active = true`
- **Frequência:** Executa a cada 5 minutos (`*/5 * * * *`)
- **Comando:** Deve usar `net.http_post` (não `pg_net.http_post`)
- **Como corrigir:** Execute o SQL `CORRIGIR_CRON_JOB_PG_NET.sql` se necessário

### 2. ✅ Empresa com WhatsApp Habilitado
- **O que verificar:** `companies.whatsapp_messaging_enabled = true` para sua empresa
- **Como verificar:**
  ```sql
  SELECT id, name, whatsapp_messaging_enabled 
  FROM companies 
  WHERE id = 'SEU_COMPANY_ID';
  ```

### 3. ✅ Provedor de WhatsApp Ativo
- **O que verificar:** Deve existir um registro em `messaging_providers` com:
  - `channel = 'WHATSAPP'`
  - `is_active = true`
- **Como verificar:**
  ```sql
  SELECT * FROM messaging_providers 
  WHERE channel = 'WHATSAPP' AND is_active = true;
  ```

### 4. ✅ Regras de Envio Configuradas
- **O que verificar:** Deve existir pelo menos uma regra ativa em `company_message_schedules` com:
  - `channel = 'WHATSAPP'`
  - `is_active = true`
  - `reference = 'APPOINTMENT_START'` (para lembretes antes do agendamento)
  - `offset_value` negativo para lembretes (ex: `-10` para 10 minutos antes)
- **Como verificar:**
  ```sql
  SELECT cms.*, mk.code as tipo_mensagem
  FROM company_message_schedules cms
  JOIN message_kinds mk ON mk.id = cms.message_kind_id
  WHERE cms.company_id = 'SEU_COMPANY_ID'
    AND cms.channel = 'WHATSAPP'
    AND cms.is_active = TRUE;
  ```

### 5. ✅ Templates de Mensagem Configurados
- **O que verificar:** Deve existir pelo menos um template ativo em `company_message_templates` para cada tipo de mensagem
- **Como verificar:**
  ```sql
  SELECT cmt.*, mk.code as tipo_mensagem
  FROM company_message_templates cmt
  JOIN message_kinds mk ON mk.id = cmt.message_kind_id
  WHERE cmt.company_id = 'SEU_COMPANY_ID'
    AND cmt.channel = 'WHATSAPP'
    AND cmt.is_active = TRUE;
  ```

### 6. ✅ Clientes com Telefone Válido
- **O que verificar:** Os 3 clientes dos agendamentos devem ter telefone válido (não `00000000000` ou vazio)
- **Como verificar:**
  ```sql
  SELECT a.id, cl.name, cl.phone
  FROM appointments a
  JOIN clients cl ON cl.id = a.client_id
  WHERE a.appointment_date = CURRENT_DATE + INTERVAL '1 day'
    AND a.appointment_time = TIME '06:00:00';
  ```

### 7. ✅ Logs Criados na `message_send_log`
- **O que verificar:** Após criar os agendamentos, devem aparecer registros em `message_send_log` com:
  - `status = 'PENDING'`
  - `scheduled_for` calculado corretamente (ex: 10 minutos antes das 6:00 = 5:50)
- **Como verificar:**
  ```sql
  SELECT msl.*, mk.code as tipo_mensagem
  FROM message_send_log msl
  JOIN appointments a ON a.id = msl.appointment_id
  LEFT JOIN message_kinds mk ON mk.id = msl.message_kind_id
  WHERE a.appointment_date = CURRENT_DATE + INTERVAL '1 day'
    AND a.appointment_time = TIME '06:00:00'
  ORDER BY msl.created_at DESC;
  ```

## 🔄 FLUXO COMPLETO DE ENVIO

### Passo 1: Criação do Agendamento
1. Usuário cria agendamento (via `NovoAgendamentoPage`, `ClientAppointmentForm` ou `appointmentService`)
2. Após inserir o agendamento, o código chama automaticamente:
   ```typescript
   await supabase.rpc('schedule_whatsapp_messages_for_appointment', {
     p_appointment_id: appointmentData.id
   });
   ```
3. A função SQL `schedule_whatsapp_messages_for_appointment`:
   - Busca as regras de envio ativas da empresa
   - Calcula `scheduled_for` baseado em `appointment_date`, `appointment_time` e `offset_value`
   - Insere registros em `message_send_log` com `status = 'PENDING'`

### Passo 2: Processamento pelo Cron Job
1. A cada 5 minutos, o cron job executa a Edge Function `whatsapp-message-scheduler`
2. A Edge Function:
   - Busca todos os logs com `status = 'PENDING'` (sem filtro de horário)
   - Para cada log:
     - Busca dados do cliente, template e provedor
     - Formata a mensagem substituindo placeholders
     - Envia via provedor de WhatsApp
     - Atualiza o log para `status = 'SENT'` ou `'FAILED'`

### Passo 3: Verificação de Envio
- **Horário esperado:** Se a regra está configurada para `-10 MINUTES`, a mensagem será enviada às **5:50** (10 minutos antes das 6:00)
- **Tolerância:** O cron roda a cada 5 minutos, então a mensagem pode ser enviada entre **5:50 e 5:55**

## ⚠️ PONTOS DE ATENÇÃO

### 1. Timezone
- **Importante:** O sistema trabalha com horário de **Brasília (UTC-3)**
- `scheduled_for` é salvo em horário de Brasília
- A Edge Function converte corretamente para UTC ao processar

### 2. Offset Negativo para Lembretes
- **CRÍTICO:** Regras de `APPOINTMENT_REMINDER` devem ter `offset_value` **negativo**
- Exemplo: Para enviar 10 minutos antes, configure `offset_value = -10`
- O formulário agora converte automaticamente: se você digitar `10` para um lembrete, salva como `-10`

### 3. Telefone Válido
- O sistema **rejeita** telefones `00000000000` (placeholder)
- O telefone deve estar no formato brasileiro (DDD + número)

### 4. Status do Agendamento
- Mensagens **não são enviadas** para agendamentos com status `'cancelado'` ou `'desistencia'`
- Se um agendamento for cancelado, os logs correspondentes são automaticamente atualizados para `status = 'CANCELLED'`

## 🧪 TESTE MANUAL

Para testar imediatamente (sem esperar o cron):

1. **Executar a Edge Function manualmente:**
   ```sql
   SELECT net.http_post(
     url := 'https://tegyiuktrmcqxkbjxqoc.supabase.co/functions/v1/whatsapp-message-scheduler',
     headers := jsonb_build_object(
       'Content-Type', 'application/json',
       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
     ),
     body := '{}'::jsonb
   ) AS request_id;
   ```

2. **Verificar logs:**
   ```sql
   SELECT * FROM message_send_log 
   WHERE status = 'PENDING' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

3. **Verificar se foram enviadas:**
   ```sql
   SELECT * FROM message_send_log 
   WHERE status = 'SENT' 
   ORDER BY sent_at DESC 
   LIMIT 10;
   ```

## ✅ GARANTIA FINAL

**SIM, o sistema irá enviar as mensagens**, desde que:

1. ✅ Cron job esteja ativo e rodando a cada 5 minutos
2. ✅ Empresa tenha `whatsapp_messaging_enabled = true`
3. ✅ Provedor de WhatsApp esteja ativo
4. ✅ Regras de envio estejam configuradas corretamente (offset negativo para lembretes)
5. ✅ Templates de mensagem estejam configurados
6. ✅ Clientes tenham telefone válido
7. ✅ Logs foram criados na `message_send_log` após criar os agendamentos

**Execute o SQL `VERIFICACAO_COMPLETA_ENVIO_MENSAGENS.sql` para verificar todos esses pontos!**


