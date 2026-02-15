# 📊 Análise do Resultado do Agendamento

## ✅ O que está FUNCIONANDO:

1. **Log criado com sucesso** ✅
   - `id`: `30cae21e-8db0-4ee1-bb53-a28340ac7e86`
   - `status`: `PENDING` (correto, aguardando envio)
   - `tipo_mensagem`: `APPOINTMENT_REMINDER` (lembrete)

2. **Agendamento registrado** ✅
   - `appointment_id`: `04080d64-860c-4e00-8df8-453b6fef2dc8`

---

## ⚠️ PROBLEMA IDENTIFICADO:

### **Horário de Envio Incorreto para Lembrete**

- **Agendamento**: 22:30 - 23:00 (horário de Brasília)
- **scheduled_for_brasilia**: 22:40 (horário de Brasília)
- **Tipo**: `APPOINTMENT_REMINDER` (lembrete)

**Problema**: O lembrete está agendado para **22:40**, que é **10 minutos DEPOIS** do início do agendamento (22:30).

**Lembrete deveria ser ANTES do agendamento, não depois!**

---

## 🔍 O que verificar:

### 1. Verificar a regra de schedule configurada:

```sql
SELECT 
  cms.id,
  cms.message_kind_id,
  mk.code as tipo_mensagem,
  cms.offset_value,
  cms.offset_unit,
  cms.reference,
  CASE 
    WHEN cms.offset_value < 0 THEN 
      CONCAT('Envia ', ABS(cms.offset_value), ' ', cms.offset_unit, ' ANTES do agendamento')
    WHEN cms.offset_value > 0 THEN 
      CONCAT('Envia ', cms.offset_value, ' ', cms.offset_unit, ' DEPOIS do agendamento')
    ELSE 'Envia no momento do agendamento'
  END as descricao
FROM company_message_schedules cms
JOIN message_kinds mk ON mk.id = cms.message_kind_id
WHERE cms.company_id = (
  SELECT company_id FROM appointments WHERE id = '04080d64-860c-4e00-8df8-453b6fef2dc8'
)
  AND cms.channel = 'WHATSAPP'
  AND cms.is_active = TRUE
  AND mk.code = 'APPOINTMENT_REMINDER';
```

**O que esperar:**
- Se `offset_value` for **positivo** (ex: `1` ou `10`), o lembrete será enviado **DEPOIS** do agendamento (ERRADO para lembrete)
- Se `offset_value` for **negativo** (ex: `-1` ou `-60`), o lembrete será enviado **ANTES** do agendamento (CORRETO para lembrete)

---

### 2. Verificar se o scheduled_for já passou:

```sql
SELECT 
  msl.scheduled_for AT TIME ZONE 'America/Sao_Paulo' as scheduled_for_brasilia,
  NOW() AT TIME ZONE 'America/Sao_Paulo' as agora_brasilia,
  CASE 
    WHEN msl.scheduled_for <= NOW() THEN '✅ JÁ DEVERIA TER SIDO ENVIADO'
    ELSE '⏳ AINDA NÃO É HORA'
  END as status_envio,
  EXTRACT(EPOCH FROM (NOW() - msl.scheduled_for)) / 60 as minutos_atraso
FROM message_send_log msl
WHERE msl.id = '30cae21e-8db0-4ee1-bb53-a28340ac7e86';
```

**O que esperar:**
- Se `agora_brasilia` > `scheduled_for_brasilia`, a mensagem **já deveria ter sido enviada**
- Se ainda não foi enviada, o problema está no **scheduler não processando**

---

## 🎯 Próximos Passos:

1. **Execute a query #1** para verificar a regra de schedule
2. **Execute a query #2** para verificar se já passou da hora
3. **Me envie os resultados** para eu identificar se:
   - O problema é a regra configurada errada (offset positivo quando deveria ser negativo)
   - Ou o problema é o scheduler não processando os PENDING

---

## 💡 Solução Provisória (se o offset estiver errado):

Se a regra estiver com `offset_value` positivo para lembrete, você precisa:

1. **Corrigir a regra** no banco:
```sql
UPDATE company_message_schedules
SET offset_value = -1  -- 1 hora ANTES (negativo)
WHERE message_kind_id = (
  SELECT id FROM message_kinds WHERE code = 'APPOINTMENT_REMINDER'
)
  AND channel = 'WHATSAPP'
  AND is_active = TRUE;
```

2. **Recriar o log** para o agendamento:
```sql
-- Deletar log antigo
DELETE FROM message_send_log 
WHERE appointment_id = '04080d64-860c-4e00-8df8-453b6fef2dc8'
  AND status = 'PENDING';

-- Recriar com a regra correta
SELECT public.schedule_whatsapp_messages_for_appointment('04080d64-860c-4e00-8df8-453b6fef2dc8'::UUID);
```

