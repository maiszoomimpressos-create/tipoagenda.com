# 🚀 Scripts de Deploy - Edge Functions

## ⚠️ IMPORTANTE: Sempre execute o deploy após alterar Edge Functions!

---

## 📋 Scripts Disponíveis

### 1. Deploy da função `whatsapp-message-scheduler`

**Windows (CMD):**
```cmd
scripts\deploy-whatsapp-scheduler.bat
```

**Windows (PowerShell):**
```powershell
.\scripts\deploy-whatsapp-scheduler.ps1
```

**Linux/Mac:**
```bash
bash scripts/deploy-whatsapp-scheduler.sh
```

**Node.js (qualquer OS):**
```bash
npm run deploy:whatsapp-scheduler
```

---

## ✅ O que os scripts fazem:

1. ✅ Verificam se o arquivo existe
2. ✅ Copiam o código para o clipboard automaticamente
3. ✅ Abrem o Supabase Dashboard no navegador
4. ✅ Mostram instruções claras

**Você só precisa:**
1. Colar o código (Ctrl+V) no editor do Supabase
2. Clicar em "Deploy"

---

## 📝 Como usar:

### Passo 1: Execute o script

Escolha um dos scripts acima conforme seu sistema operacional.

### Passo 2: No Supabase Dashboard

1. O navegador abrirá automaticamente na página da função
2. Clique no editor de código
3. Selecione TODO o código (Ctrl+A)
4. Cole o novo código (Ctrl+V) - já está no clipboard!
5. Clique em **"Deploy"** ou **"Save"**
6. Aguarde a confirmação

---

## 🔍 Verificar se o deploy funcionou:

### 1. Verificar código no Dashboard

Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions/whatsapp-message-scheduler

Procure por:
- ✅ Função `toBrasiliaISOString` no código
- ✅ `scheduled_for: scheduledForBR` (não deve estar `scheduledFor.toISOString()`)

### 2. Testar a função

Execute:
```bash
npm run deploy:whatsapp-scheduler
# ou
scripts\test-whatsapp-scheduler.bat
```

### 3. Verificar logs

1. Supabase Dashboard → Edge Functions → whatsapp-message-scheduler → Logs
2. Execute a função novamente
3. Procure por logs com `scheduledFor_BR: 2026-01-27T20:50:00-03:00`

### 4. Verificar tabela `message_send_log`

```sql
SELECT 
  id,
  scheduled_for,
  status,
  created_at
FROM message_send_log
ORDER BY created_at DESC
LIMIT 5;
```

**O campo `scheduled_for` deve ter:**
- ✅ Formato: `2026-01-27T20:50:00-03:00` (horário de Brasília)
- ❌ NÃO deve ter `Z` no final (ex: `2026-01-28T00:50:00Z`)

---

## ⚠️ Problemas Comuns

### "Script não funciona"
- **Windows:** Execute como Administrador
- **Linux/Mac:** Dê permissão: `chmod +x scripts/deploy-whatsapp-scheduler.sh`
- **Node.js:** Instale dependências: `npm install`

### "Não copiou para clipboard"
- Copie manualmente o arquivo: `supabase/functions/whatsapp-message-scheduler/index.ts`
- Cole no editor do Supabase

### "Dashboard não abriu"
- Abra manualmente: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions/whatsapp-message-scheduler

---

## 📌 Lembrete

**SEMPRE execute o deploy após alterar qualquer Edge Function!**

As mudanças no código local **NÃO** são aplicadas automaticamente no Supabase.

