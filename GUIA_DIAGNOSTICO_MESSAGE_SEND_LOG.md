# 🔍 Guia de Diagnóstico: Por que message_send_log está vazia?

## Passo 1: Verificar se a função existe no banco

Execute no Supabase SQL Editor:

```sql
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'schedule_whatsapp_messages_for_appointment';
```

**Se não retornar nada:** A migração não foi executada. Execute o arquivo `20260210_schedule_whatsapp_messages_on_appointment.sql`.

---

## Passo 2: Verificar condições necessárias

Para cada agendamento criado, execute substituindo `<APPOINTMENT_ID>` pelo ID real:

```sql
-- Verificar condições para um agendamento específico
SELECT 
    a.id as appointment_id,
    a.company_id,
    a.client_id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    -- Verificar WhatsApp habilitado
    c.whatsapp_messaging_enabled,
    -- Verificar telefone do cliente
    cl.phone as telefone_cliente,
    -- Verificar regras de envio
    (SELECT COUNT(*) FROM company_message_schedules 
     WHERE company_id = a.company_id 
     AND channel = 'WHATSAPP' 
     AND is_active = TRUE 
     AND reference = 'APPOINTMENT_START') as total_regras_ativas,
    -- Verificar provedor ativo
    (SELECT COUNT(*) FROM messaging_providers 
     WHERE channel = 'WHATSAPP' 
     AND is_active = TRUE) as total_provedores_ativos
FROM appointments a
JOIN companies c ON c.id = a.company_id
JOIN clients cl ON cl.id = a.client_id
WHERE a.id = '<APPOINTMENT_ID>';
```

**Verifique:**
- ✅ `whatsapp_messaging_enabled` deve ser `true`
- ✅ `telefone_cliente` não deve ser `NULL` ou vazio
- ✅ `total_regras_ativas` deve ser maior que 0
- ✅ `total_provedores_ativos` deve ser maior que 0

---

## Passo 3: Testar a função manualmente

Execute no Supabase SQL Editor (substitua `<APPOINTMENT_ID>`):

```sql
SELECT public.schedule_whatsapp_messages_for_appointment('<APPOINTMENT_ID>'::UUID);
```

**O resultado deve mostrar:**
```json
{
  "success": true,
  "message": "Processamento concluído.",
  "logs_created": 2,  // Deve ser > 0
  "logs_skipped": 0,
  "errors": []
}
```

**Se `logs_created` for 0, verifique:**
- `logs_skipped`: quantos foram pulados e por quê
- `errors`: array de erros encontrados
- `message`: mensagem explicativa

---

## Passo 4: Verificar logs do console do navegador

1. Abra o DevTools (F12)
2. Vá na aba Console
3. Crie um novo agendamento
4. Procure por logs que começam com:
   - `[NovoAgendamentoPage]`
   - `[ClientAppointmentForm]`
   - `[appointmentService]`

**Procure por:**
- ✅ `✅ Resultado do agendamento:` - mostra o resultado da função
- ❌ `❌ ERRO ao agendar mensagens WhatsApp:` - mostra erros
- ⚠️ `⚠️ Nenhum log foi criado` - mostra por que não criou

---

## Passo 5: Verificar se há logs na tabela

```sql
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
```

---

## Problemas Comuns e Soluções

### Problema 1: "Função não encontrada"
**Solução:** Execute a migração `20260210_schedule_whatsapp_messages_on_appointment.sql` no Supabase.

### Problema 2: "WhatsApp desabilitado"
**Solução:** 
```sql
UPDATE companies 
SET whatsapp_messaging_enabled = TRUE 
WHERE id = '<COMPANY_ID>';
```

### Problema 3: "Sem regras de envio ativas"
**Solução:** Configure regras de envio em `/mensagens-whatsapp` → Aba "Regras de Envio"

### Problema 4: "Cliente sem telefone"
**Solução:** Adicione telefone ao cliente antes de criar o agendamento.

### Problema 5: "Sem provedor WhatsApp ativo"
**Solução:** Configure um provedor WhatsApp ativo no painel de administrador global.

### Problema 6: "Erro de permissão/RLS"
**Solução:** A função usa `SECURITY DEFINER`, então não deveria ter problemas de RLS. Se houver, verifique se a função foi criada pelo usuário correto (postgres ou service_role).

---

## Teste Completo

Execute este script completo substituindo `<APPOINTMENT_ID>`:

```sql
-- 1. Verificar agendamento
SELECT * FROM appointments WHERE id = '<APPOINTMENT_ID>';

-- 2. Verificar condições
SELECT 
    a.id,
    c.whatsapp_messaging_enabled,
    cl.phone,
    (SELECT COUNT(*) FROM company_message_schedules 
     WHERE company_id = a.company_id AND channel = 'WHATSAPP' AND is_active = TRUE) as regras,
    (SELECT COUNT(*) FROM messaging_providers 
     WHERE channel = 'WHATSAPP' AND is_active = TRUE) as provedores
FROM appointments a
JOIN companies c ON c.id = a.company_id
JOIN clients cl ON cl.id = a.client_id
WHERE a.id = '<APPOINTMENT_ID>';

-- 3. Executar função
SELECT public.schedule_whatsapp_messages_for_appointment('<APPOINTMENT_ID>'::UUID);

-- 4. Verificar logs criados
SELECT * FROM message_send_log WHERE appointment_id = '<APPOINTMENT_ID>';
```

