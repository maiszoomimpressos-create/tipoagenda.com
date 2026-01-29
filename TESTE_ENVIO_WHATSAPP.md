# 🧪 Guia de Teste - Envio de Mensagens WhatsApp

## 📋 Pré-requisitos

1. ✅ Migration executada (campos `user_id` e `queue_id` adicionados)
2. ✅ Provedor configurado com `user_id` e `queue_id` preenchidos
3. ✅ `SUPABASE_SERVICE_ROLE_KEY` disponível

---

## 🚀 ETAPA 1: Teste Direto da API do Provedor

Este teste verifica se a configuração do provedor está correta e se os campos `userId` e `queueId` estão sendo enviados.

### Passo 1: Definir a SERVICE_ROLE_KEY

**No PowerShell:**
```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = "SUA_SERVICE_ROLE_KEY_AQUI"
```

**No Bash/Linux:**
```bash
export SUPABASE_SERVICE_ROLE_KEY="SUA_SERVICE_ROLE_KEY_AQUI"
```

### Passo 2: Executar o teste

**Opção A - Usar valores padrão:**
```powershell
node scripts/test-whatsapp-provider.js
```
- Telefone padrão: `+5511999999999`
- Mensagem padrão: `"Teste de mensagem do sistema"`

**Opção B - Especificar telefone e mensagem:**
```powershell
node scripts/test-whatsapp-provider.js +5511999999999 "Sua mensagem de teste aqui"
```

### Passo 3: Verificar a saída

O script deve mostrar:
- ✅ Provedor encontrado (nome, URL, método, etc.)
- ✅ Headers da requisição
- ✅ Body completo (incluindo `userId` e `queueId`)
- ✅ Resposta da API (status HTTP, body)

**O que verificar:**
- ✅ O campo `userId` está presente no payload?
- ✅ O campo `queueId` está presente no payload?
- ✅ A API retornou status 200/201 (sucesso)?
- ✅ A mensagem foi realmente enviada?

---

## 🔄 ETAPA 2: Teste do Fluxo Completo (Opcional)

Este teste verifica o fluxo completo: agendamento → Edge Function → envio de mensagem.

### Passo 1: Criar um agendamento de teste

1. Acesse a aplicação
2. Crie um agendamento para **10-15 minutos no futuro**
3. Certifique-se de que:
   - O cliente tem telefone cadastrado
   - Há uma regra de envio configurada (ex: 10 minutos antes)
   - Há um template de mensagem ativo

### Passo 2: Executar a Edge Function manualmente

**No PowerShell:**
```powershell
# Definir SERVICE_ROLE_KEY se ainda não definiu
$env:SUPABASE_SERVICE_ROLE_KEY = "SUA_SERVICE_ROLE_KEY_AQUI"

# Executar a função
node scripts/test-whatsapp-scheduler.js
```

### Passo 3: Verificar os logs

1. Acesse o Supabase Dashboard → Edge Functions → `whatsapp-message-scheduler` → Logs
2. Procure por:
   - `sendViaProvider:` - mostra a requisição enviada
   - `Resposta da API` - mostra a resposta do provedor
   - `status: SENT` ou `status: FAILED` na tabela `message_send_log`

### Passo 4: Verificar na tabela `message_send_log`

Execute no SQL Editor do Supabase:
```sql
SELECT 
    id,
    client_id,
    appointment_id,
    scheduled_for,
    sent_at,
    status,
    provider_response
FROM message_send_log
ORDER BY created_at DESC
LIMIT 5;
```

**O que verificar:**
- ✅ Há um registro com `status: SENT`?
- ✅ O campo `sent_at` foi preenchido?
- ✅ O `provider_response` mostra sucesso?

---

## 🐛 Troubleshooting

### Erro: "Nenhum provedor WHATSAPP ativo encontrado"
- Verifique se há um provedor com `is_active = true` na tabela `messaging_providers`
- Verifique se `user_id` e `queue_id` estão preenchidos

### Erro: "Telefone inválido ou ausente"
- Verifique se o telefone está no formato E.164 (ex: `+5511999999999`)
- Verifique se o cliente tem telefone cadastrado

### Erro: Status HTTP 400/401/403 da API
- Verifique se o `auth_token` está correto
- Verifique se a URL da API está correta
- Verifique se o formato do payload está correto (JSON ou FormData)

### Erro: Status HTTP 500 da API
- Verifique se `userId` e `queueId` estão sendo enviados
- Verifique se os valores de `userId` e `queueId` são válidos para a API
- Consulte a documentação da API do provedor

---

## ✅ Checklist de Sucesso

- [ ] Migration executada com sucesso
- [ ] Provedor configurado com `user_id` e `queue_id`
- [ ] Teste direto da API retornou sucesso (status 200/201)
- [ ] Campos `userId` e `queueId` aparecem no payload enviado
- [ ] Mensagem foi recebida no WhatsApp
- [ ] Logs na tabela `message_send_log` mostram `status: SENT`

---

## 📝 Próximos Passos

Após confirmar que o teste funciona:

1. ✅ Configure o cron job para executar automaticamente (já deve estar configurado)
2. ✅ Monitore os logs periodicamente
3. ✅ Ajuste os templates de mensagem conforme necessário
4. ✅ Configure regras de envio para diferentes tipos de mensagem

