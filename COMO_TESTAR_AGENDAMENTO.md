# 🧪 Como Testar o Envio Automático de Mensagens

## ✅ Pré-requisitos (Verificar)

Execute o SQL `VERIFICAR_CONFIGURACAO_COMPLETA.sql` para verificar se tudo está configurado:

1. **Empresa habilitada:** Deve ter pelo menos 1 empresa com `whatsapp_messaging_enabled = true`
2. **Provedor configurado:** Deve ter 1 provedor WHATSAPP ativo com:
   - URL correta: `https://liotteste.liotpro.online/api/messages/send`
   - Token com "Bearer " prefix
   - `user_id` e `queue_id` corretos
3. **Schedule (regra de envio):** Deve ter pelo menos 1 regra ativa
   - Exemplo: Enviar 10 minutos antes do agendamento
4. **Template:** Deve ter 1 template ativo para o tipo de mensagem do schedule
5. **Cliente com telefone:** O cliente do agendamento deve ter telefone cadastrado

## 🧪 Passo a Passo para Testar

### Opção 1: Teste Rápido (Agendamento para daqui a poucos minutos)

1. **Criar um agendamento:**
   - Data: Hoje
   - Hora: Daqui a 15-20 minutos (ex: se agora são 14:00, agende para 14:15)
   - Cliente: Use um cliente que tenha telefone cadastrado
   - Status: "pendente" ou "confirmado" (não "cancelado")

2. **Configurar schedule (se ainda não tiver):**
   - Tipo de mensagem: Escolha um (ex: "LEMBRETE")
   - Offset: 10 minutos ANTES
   - Reference: APPOINTMENT_START
   - Ativo: Sim

3. **Aguardar:**
   - A Edge Function roda a cada minuto (via cron)
   - Quando faltar 10 minutos para o agendamento, a mensagem será enviada

4. **Verificar logs:**
   ```sql
   SELECT * FROM message_send_log 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

### Opção 2: Teste Imediato (Executar Edge Function manualmente)

1. **Criar agendamento para AGORA:**
   - Data: Hoje
   - Hora: Hora atual (ex: 14:00)
   - Cliente: Com telefone cadastrado

2. **Configurar schedule:**
   - Offset: 0 minutos (ou -5 minutos para enviar imediatamente)

3. **Executar Edge Function manualmente:**
   - No Supabase Dashboard: Edge Functions > whatsapp-message-scheduler > Invoke
   - Ou via API:
   ```powershell
   $env:SUPABASE_SERVICE_ROLE_KEY = "SUA_CHAVE"
   curl -X POST https://tegyiuktrmcqxkbjxqoc.supabase.co/functions/v1/whatsapp-message-scheduler `
     -H "Authorization: Bearer $env:SUPABASE_SERVICE_ROLE_KEY" `
     -H "Content-Type: application/json"
   ```

## 📋 Checklist Rápido

- [ ] Empresa com `whatsapp_messaging_enabled = true`
- [ ] Provedor WHATSAPP ativo e configurado corretamente
- [ ] Schedule (regra de envio) ativo
- [ ] Template ativo para o tipo de mensagem
- [ ] Agendamento criado com cliente que tem telefone
- [ ] Agendamento não está cancelado
- [ ] Edge Function deployada e rodando

## 🔍 Verificar se Funcionou

1. **Ver logs na tabela:**
   ```sql
   SELECT 
       id,
       appointment_id,
       scheduled_for,
       status,
       sent_at,
       provider_response
   FROM message_send_log
   ORDER BY created_at DESC
   LIMIT 5;
   ```

2. **Verificar se recebeu a mensagem no WhatsApp**

3. **Ver logs da Edge Function:**
   - Supabase Dashboard > Edge Functions > whatsapp-message-scheduler > Logs

## ⚠️ Problemas Comuns

- **Nenhuma mensagem enviada:**
  - Verifique se o schedule está ativo
  - Verifique se o template está ativo
  - Verifique se o cliente tem telefone
  - Verifique se o agendamento não está cancelado

- **Status FAILED:**
  - Verifique os logs em `provider_response`
  - Verifique se o token está correto
  - Verifique se user_id e queue_id estão corretos

- **Mensagem não chegou:**
  - Verifique se o número está correto
  - Verifique se o número está no formato correto (sem +)
  - Verifique os logs da API LiotPRO

