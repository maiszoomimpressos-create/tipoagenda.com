# ✅ Correções Aplicadas - Envio WhatsApp LiotPRO

## 🔍 Problemas Identificados

1. **URL incorreta:** Estava usando `api.liotpro.com.br`, mas a URL correta é `https://liotteste.liotpro.online/api/messages/send`
2. **Formato de telefone:** A API espera número SEM o prefixo "+" (ex: `5511999999999`), mas estávamos enviando com "+" (ex: `+5511999999999`)

## ✅ Correções Aplicadas

### 1. Formatação do Telefone
- **Arquivo:** `supabase/functions/whatsapp-message-scheduler/index.ts`
- **Mudança:** Adicionada formatação para remover "+" e espaços antes de enviar para API
- **Código:**
  ```typescript
  const formattedPhoneForAPI = toPhone.replace(/[+\s]/g, '');
  ```
- **Resultado:** Telefone `+5511999999999` → `5511999999999`

### 2. Script de Teste Atualizado
- **Arquivo:** `scripts/test-whatsapp-provider.js`
- **Mudança:** Mesma formatação de telefone aplicada no script de teste

### 3. Script SQL para Verificar/Corrigir Configuração
- **Arquivo:** `VERIFICAR_E_CORRIGIR_PROVEDOR.sql`
- **Conteúdo:**
  - Verifica URL base (deve ser `https://liotteste.liotpro.online/api/messages/send`)
  - Verifica payload template (deve ter campos corretos)
  - Garante que `user_id` e `queue_id` estão preenchidos

## 📋 Próximos Passos

1. **Execute o SQL de verificação/correção:**
   ```sql
   -- Execute VERIFICAR_E_CORRIGIR_PROVEDOR.sql no Supabase SQL Editor
   ```

2. **Faça o deploy da Edge Function atualizada:**
   ```bash
   npm run deploy:whatsapp-scheduler
   ```

3. **Teste novamente:**
   ```powershell
   node scripts/test-whatsapp-provider.js +5546999151842 "Teste após correções"
   ```

## 🎯 Formato Esperado pela API LiotPRO

### URL
```
https://liotteste.liotpro.online/api/messages/send
```

### Headers
```
Authorization: Bearer {token}
Content-Type: application/json
```

### Body (JSON)
```json
{
  "number": "5511999999999",  // SEM o "+"
  "body": "Mensagem",
  "userId": "184",
  "queueId": "73",
  "sendSignature": false,
  "closeTicket": false,
  "status": "pending"
}
```

## ✅ Status

- [x] Formatação de telefone corrigida
- [x] Script de teste atualizado
- [x] Script SQL de verificação criado
- [ ] SQL executado no Supabase
- [ ] Edge Function deployada
- [ ] Teste final realizado

