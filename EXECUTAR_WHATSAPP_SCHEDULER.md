# Como Executar a Função WhatsApp Message Scheduler

## Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse: **Supabase Dashboard** → **Edge Functions** → **whatsapp-message-scheduler**
2. Clique na aba **"Test"** (ou **"Invocations"**)
3. Clique em **"Invoke Function"** ou **"Test"**
4. O método deve ser **POST**
5. Body pode ser vazio: `{}`
6. Clique em **"Run"** ou **"Invoke"**

## Opção 2: Via cURL (Terminal)

```bash
curl -X POST \
  'https://tegyiuktrmcqxkbjxqoc.supabase.co/functions/v1/whatsapp-message-scheduler' \
  -H 'Authorization: Bearer SEU_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

**Substitua `SEU_SERVICE_ROLE_KEY`** pela sua Service Role Key do Supabase.

## Opção 3: Via Postman/Insomnia

- **Method:** POST
- **URL:** `https://tegyiuktrmcqxkbjxqoc.supabase.co/functions/v1/whatsapp-message-scheduler`
- **Headers:**
  - `Authorization: Bearer SEU_SERVICE_ROLE_KEY`
  - `Content-Type: application/json`
- **Body:** `{}`

## Opção 4: Via JavaScript/TypeScript

```typescript
const response = await fetch(
  'https://tegyiuktrmcqxkbjxqoc.supabase.co/functions/v1/whatsapp-message-scheduler',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  }
);

const result = await response.json();
console.log(result);
```

## Verificar Logs

Após executar, verifique:

1. **Logs da Edge Function:**
   - Supabase Dashboard → Edge Functions → whatsapp-message-scheduler → Logs
   - Procure pelos logs que começam com `=== whatsapp-message-scheduler INICIADO ===`

2. **Tabela message_send_log:**
   ```sql
   SELECT * FROM message_send_log 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

## Checklist de Verificação

Antes de executar, verifique:

- [ ] Empresa tem `whatsapp_messaging_enabled = true`
- [ ] Existe um provedor ativo em `messaging_providers` com `is_active = true` e `channel = 'WHATSAPP'`
- [ ] Existe uma regra ativa em `company_message_schedules` com `is_active = true` e `channel = 'WHATSAPP'`
- [ ] Existe um template ativo em `company_message_templates` com `is_active = true` e `channel = 'WHATSAPP'`
- [ ] Existe um agendamento com data/hora dentro da janela de busca
- [ ] O cliente do agendamento tem telefone cadastrado

## Verificar Configuração

```sql
-- Verificar empresas habilitadas
SELECT id, whatsapp_messaging_enabled FROM companies WHERE whatsapp_messaging_enabled = true;

-- Verificar provedor
SELECT * FROM messaging_providers WHERE channel = 'WHATSAPP' AND is_active = true;

-- Verificar schedules
SELECT * FROM company_message_schedules WHERE channel = 'WHATSAPP' AND is_active = true;

-- Verificar templates
SELECT * FROM company_message_templates WHERE channel = 'WHATSAPP' AND is_active = true;

-- Verificar agendamentos
SELECT id, company_id, client_id, appointment_date, appointment_time, status 
FROM appointments 
WHERE status != 'cancelado'
ORDER BY appointment_date DESC, appointment_time DESC
LIMIT 10;
```

