# 🚀 Executar Função e Verificar Logs

## ⚠️ PROBLEMA: Tabela `message_send_log` está vazia

Isso significa que a função `whatsapp-message-scheduler` não está criando logs. Vamos diagnosticar e corrigir.

---

## 📋 Passo 1: Diagnóstico Completo

Execute no SQL Editor do Supabase o arquivo `DIAGNOSTICO_COMPLETO.sql` para verificar:

1. ✅ Se há empresas habilitadas
2. ✅ Se há provedor configurado
3. ✅ Se há regras de envio
4. ✅ Se há templates
5. ✅ Se há agendamentos futuros
6. ✅ Se os clientes têm telefone

---

## 📋 Passo 2: Executar a Função Manualmente

### Opção A: Via Script (Windows)
```cmd
scripts\test-whatsapp-scheduler.bat
```

### Opção B: Via npm
```bash
npm run deploy:whatsapp-scheduler
# Depois execute manualmente no Supabase Dashboard
```

### Opção C: Via Supabase Dashboard
1. Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions/whatsapp-message-scheduler
2. Clique na aba **"Test"** ou **"Invocations"**
3. Clique em **"Invoke Function"**
4. Body: `{}`
5. Clique em **"Run"**

---

## 📋 Passo 3: Verificar Logs Após Execução

Execute no SQL Editor:

```sql
SELECT 
    id,
    scheduled_for,
    status,
    created_at,
    CASE 
        WHEN scheduled_for::text LIKE '%-03:00' THEN '✅ BRASÍLIA'
        WHEN scheduled_for::text LIKE '%Z' THEN '❌ UTC (ERRADO)'
        WHEN scheduled_for::text LIKE '%+00:00' THEN '❌ UTC (ERRADO)'
        ELSE '⚠️ FORMATO DESCONHECIDO'
    END as timezone_status
FROM message_send_log
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📋 Passo 4: Verificar Logs da Função

1. Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions/whatsapp-message-scheduler
2. Clique na aba **"Logs"**
3. Procure por:
   - `=== whatsapp-message-scheduler INICIADO ===`
   - `Logs inseridos com sucesso: X`
   - Erros ou avisos

---

## 🔍 Possíveis Problemas

### 1. "Nenhuma regra de envio ativa encontrada"
- **Solução:** Configure uma regra em `company_message_schedules`

### 2. "Nenhum template encontrado"
- **Solução:** Configure um template em `company_message_templates`

### 3. "Nenhum agendamento na janela de tempo"
- **Solução:** Crie um agendamento para hoje ou amanhã

### 4. "Cliente sem telefone"
- **Solução:** Cadastre telefone para o cliente

---

## ✅ Checklist Final

- [ ] Diagnóstico executado
- [ ] Função executada manualmente
- [ ] Logs criados na tabela `message_send_log`
- [ ] `scheduled_for` está com `-03:00` (horário de Brasília)
- [ ] Logs da função mostram sucesso

