# 🚀 Como Fazer Deploy da Edge Function whatsapp-message-scheduler

## ⚠️ IMPORTANTE: Você precisa fazer deploy para as mudanças terem efeito!

As alterações no código local **NÃO** são aplicadas automaticamente no Supabase. Você precisa fazer deploy manualmente.

---

## 📋 Passo a Passo para Deploy

### Opção 1: Via Supabase Dashboard (Recomendado - Mais Fácil)

1. **Acesse o Supabase Dashboard:**
   - URL: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions

2. **Encontre a função `whatsapp-message-scheduler`:**
   - Clique em **"whatsapp-message-scheduler"** na lista de funções

3. **Abra o editor de código:**
   - Você verá o código atual da função no editor

4. **Substitua TODO o código:**
   - Abra o arquivo local: `supabase/functions/whatsapp-message-scheduler/index.ts`
   - Selecione TODO o conteúdo (Ctrl+A)
   - Copie (Ctrl+C)
   - Volte ao Supabase Dashboard
   - Selecione TODO o código no editor (Ctrl+A)
   - Cole o novo código (Ctrl+V)

5. **Faça o Deploy:**
   - Clique no botão **"Deploy"** ou **"Save"** (geralmente no canto superior direito)
   - Aguarde alguns segundos até aparecer a mensagem de sucesso

6. **Verifique se funcionou:**
   - Você verá uma mensagem de sucesso
   - O código atualizado estará visível no editor

---

### Opção 2: Via CLI do Supabase (Avançado)

Se você tem o Supabase CLI instalado:

```bash
# 1. Fazer login (se ainda não fez)
supabase login

# 2. Linkar ao projeto (se ainda não linkou)
supabase link --project-ref tegyiuktrmcqxkbjxqoc

# 3. Fazer deploy da função específica
supabase functions deploy whatsapp-message-scheduler
```

**Nota:** Se você não tem o CLI instalado, use a **Opção 1** (Dashboard).

---

## ✅ Verificar se o Deploy Funcionou

### 1. Verificar o código no Dashboard

1. Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions/whatsapp-message-scheduler
2. Procure pela função `toBrasiliaISOString` no código
3. Procure por `scheduled_for: scheduledForBR` (não deve estar `scheduledFor.toISOString()`)
4. Se encontrar essas mudanças, o deploy foi bem-sucedido!

### 2. Testar a função

Execute a função manualmente usando um dos scripts:

**Windows:**
```cmd
scripts\test-whatsapp-scheduler.bat
```

**PowerShell:**
```powershell
.\scripts\test-whatsapp-scheduler.ps1
```

**Linux/Mac:**
```bash
bash scripts/test-whatsapp-scheduler.sh
```

### 3. Verificar os logs

1. Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions/whatsapp-message-scheduler
2. Vá na aba **"Logs"**
3. Execute a função novamente
4. Procure por logs que mostram:
   - `scheduledFor_BR: 2026-01-27T20:50:00-03:00` (com `-03:00` no final)
   - Não deve aparecer `Z` no final (que indica UTC)

### 4. Verificar a tabela `message_send_log`

Execute no SQL Editor do Supabase:

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

**O que verificar:**
- O campo `scheduled_for` deve ter o formato: `2026-01-27T20:50:00-03:00`
- **NÃO** deve ter `Z` no final (ex: `2026-01-28T00:50:00Z`)
- O horário deve estar em **horário de Brasília** (ex: `20:50` para 20:50)

---

## 🔍 O que foi alterado?

### Antes (UTC):
```typescript
scheduled_for: scheduledFor.toISOString()
// Resultado: "2026-01-28T00:50:00.000Z" (UTC)
```

### Depois (Brasília):
```typescript
scheduled_for: toBrasiliaISOString(scheduledFor)
// Resultado: "2026-01-27T20:50:00-03:00" (Brasília)
```

---

## ⚠️ Problemas Comuns

### 1. "Ainda está gravando em UTC"
- **Solução:** Verifique se você fez o deploy corretamente (veja "Verificar se o Deploy Funcionou" acima)
- **Solução:** Limpe o cache do navegador e verifique novamente

### 2. "Não consigo encontrar o botão Deploy"
- **Solução:** Procure por "Save" ou "Update" no canto superior direito do editor
- **Solução:** Verifique se você está na página correta da função

### 3. "O código não atualizou"
- **Solução:** Aguarde alguns segundos e recarregue a página
- **Solução:** Verifique se você copiou TODO o código do arquivo local

---

## 📞 Precisa de Ajuda?

Se ainda estiver com problemas:
1. Verifique os logs da função no Supabase Dashboard
2. Execute a função manualmente e veja os logs
3. Verifique a tabela `message_send_log` para ver o formato do `scheduled_for`

