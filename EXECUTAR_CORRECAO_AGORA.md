# 🚨 CORREÇÃO COMPLETA - EXECUTAR AGORA

## ⚠️ PROBLEMA IDENTIFICADO

1. **10 minutos ANTES do agendamento**: Deve usar `APPOINTMENT_START` com `offset_value = -10` (negativo)
2. **1 minuto DEPOIS que finalizou**: Deve ser acionado quando status muda para `concluido`
3. **Cron job não está funcionando**: Mensagens PENDING não estão sendo processadas

## ✅ SOLUÇÃO IMPLEMENTADA

A migration `20260214_fix_whatsapp_messaging_complete.sql` corrige:

1. ✅ Função SQL corrigida para usar `updated_at` quando status = 'concluido' e referência = 'APPOINTMENT_CREATION'
2. ✅ Trigger criado para detectar quando agendamento é finalizado e agendar mensagem
3. ✅ Cron job configurado para executar a cada 2 minutos

## 📋 PASSOS PARA EXECUTAR

### 1. EXECUTAR A MIGRATION

Execute no **Supabase SQL Editor**:

```sql
-- Copie e cole TODO o conteúdo do arquivo:
-- supabase/migrations/20260214_fix_whatsapp_messaging_complete.sql
```

**OU** execute diretamente no Supabase Dashboard:
- Vá em **Database** → **Migrations**
- Clique em **New Migration**
- Cole o conteúdo do arquivo
- Execute

### 2. VERIFICAR CONFIGURAÇÃO DAS REGRAS

Execute este SQL para verificar suas regras:

```sql
SELECT 
    mk.code as tipo_mensagem,
    cms.offset_value,
    cms.offset_unit,
    cms.reference,
    CASE 
        WHEN cms.offset_value < 0 THEN CONCAT('Envia ', ABS(cms.offset_value), ' ', cms.offset_unit, ' ANTES')
        WHEN cms.offset_value > 0 THEN CONCAT('Envia ', cms.offset_value, ' ', cms.offset_unit, ' DEPOIS')
        ELSE 'Envia no momento'
    END as descricao
FROM company_message_schedules cms
JOIN message_kinds mk ON mk.id = cms.message_kind_id
WHERE cms.company_id = '3437e70c-049e-4dea-bb51-69c3dde89e59'
  AND cms.channel = 'WHATSAPP'
  AND cms.is_active = TRUE;
```

**Deve ter:**
- `APPOINTMENT_REMINDER` com `offset_value = -10` e `reference = 'APPOINTMENT_START'` (10 min ANTES)
- `POST_SERVICE_THANKS` com `offset_value = 1` e `reference = 'APPOINTMENT_CREATION'` (1 min DEPOIS)

### 3. CORRIGIR REGRAS SE NECESSÁRIO

Se as regras estiverem erradas, execute:

```sql
-- Corrigir lembrete: 10 minutos ANTES (offset negativo)
UPDATE company_message_schedules
SET offset_value = -10,
    reference = 'APPOINTMENT_START'
WHERE company_id = '3437e70c-049e-4dea-bb51-69c3dde89e59'
  AND message_kind_id = (SELECT id FROM message_kinds WHERE code = 'APPOINTMENT_REMINDER')
  AND channel = 'WHATSAPP';

-- Corrigir agradecimento: 1 minuto DEPOIS (offset positivo, referência criação)
UPDATE company_message_schedules
SET offset_value = 1,
    reference = 'APPOINTMENT_CREATION'
WHERE company_id = '3437e70c-049e-4dea-bb51-69c3dde89e59'
  AND message_kind_id = (SELECT id FROM message_kinds WHERE code = 'POST_SERVICE_THANKS')
  AND channel = 'WHATSAPP';
```

### 4. TESTAR O SISTEMA

#### Teste 1: Criar novo agendamento
1. Crie um agendamento para daqui a 15 minutos
2. Verifique se o log foi criado:
```sql
SELECT * FROM message_send_log 
WHERE appointment_id = 'ID_DO_AGENDAMENTO'
ORDER BY created_at DESC;
```
3. Deve ter 1 log PENDING com `scheduled_for` = 10 minutos antes do horário

#### Teste 2: Finalizar agendamento
1. Finalize um agendamento (mude status para 'concluido')
2. Verifique se o log foi criado:
```sql
SELECT * FROM message_send_log 
WHERE appointment_id = 'ID_DO_AGENDAMENTO'
ORDER BY created_at DESC;
```
3. Deve ter 1 log PENDING com `scheduled_for` = 1 minuto depois da finalização

#### Teste 3: Executar Edge Function manualmente
Execute o script PowerShell:
```powershell
.\ENVIAR_MENSAGENS_AGORA.ps1
```

Ou via Supabase Dashboard:
- Edge Functions → whatsapp-message-scheduler → Invoke Function
- Method: POST
- Body: `{}`

### 5. VERIFICAR CRON JOB

Execute:
```sql
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'whatsapp-message-scheduler-job';
```

Deve retornar 1 job ativo com schedule `*/2 * * * *` (a cada 2 minutos).

## ✅ CHECKLIST FINAL

- [ ] Migration executada com sucesso
- [ ] Regras configuradas corretamente (offset negativo para lembrete, positivo para agradecimento)
- [ ] Trigger criado (verificar com `\df handle_appointment_completion_whatsapp`)
- [ ] Cron job ativo (verificar com SQL acima)
- [ ] Teste de criação de agendamento funcionou
- [ ] Teste de finalização funcionou
- [ ] Edge Function executada manualmente e processou mensagens

## 🚨 SE AINDA NÃO FUNCIONAR

1. Verifique os logs da Edge Function no Supabase Dashboard
2. Verifique se há erros na tabela `message_send_log` (campo `provider_response`)
3. Execute a Edge Function manualmente e veja o resultado
4. Verifique se o provedor LiotPRO está configurado corretamente















