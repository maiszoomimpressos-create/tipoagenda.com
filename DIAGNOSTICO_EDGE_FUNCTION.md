# 🔍 Diagnóstico: Edge Function whatsapp-message-scheduler não está gerando logs

## ⚠️ Problema Identificado

Você executou o `net.http_post` e não aparecem logs na aba "Logs" da Edge Function. Isso pode ter várias causas.

---

## ✅ Checklist de Verificação (Execute na Ordem)

### 1. Verificar se o `net.http_post` realmente chamou a função

Execute no SQL Editor:

```sql
-- Verificar se o request_id foi gerado
SELECT 
  id,
  status_code,
  content,
  created
FROM net._http_response_queue
ORDER BY created DESC
LIMIT 5;
```

**O que esperar:**
- Se aparecer uma linha com `status_code = 200` ou `status_code = 500`, a função **foi chamada**.
- Se não aparecer nada ou aparecer `status_code = 401/403`, há problema de autenticação.

---

### 2. Verificar se a Edge Function está deployada corretamente

**No Supabase Dashboard:**

1. Vá em **Edge Functions** → **whatsapp-message-scheduler**
2. Clique na aba **"Code"**
3. Procure pela linha: `console.log('Buscando logs PENDING (sem filtro de horário)...'`

**Se NÃO encontrar essa linha:**
- ❌ A função **NÃO está atualizada** no Supabase
- ✅ **Solução:** Faça deploy do código atualizado (veja instruções abaixo)

---

### 3. Verificar se a função existe e está ativa

Execute no SQL Editor:

```sql
-- Verificar se a função está registrada no Supabase
SELECT 
  name,
  version,
  created_at,
  updated_at
FROM supabase_functions.functions
WHERE name = 'whatsapp-message-scheduler';
```

**O que esperar:**
- Se retornar uma linha, a função existe.
- Se não retornar nada, a função pode não estar deployada.

---

### 4. Testar a função diretamente via Dashboard (Método Mais Confiável)

**No Supabase Dashboard:**

1. Vá em **Edge Functions** → **whatsapp-message-scheduler**
2. Clique na aba **"Invocations"** (ou **"Test"**)
3. Clique em **"Invoke Function"** ou **"Test"**
4. Método: **POST**
5. Body: `{}`
6. Clique em **"Run"** ou **"Invoke"**

**O que esperar:**
- Se aparecer uma resposta JSON (mesmo que com erro), a função **foi executada**.
- Depois disso, vá na aba **"Logs"** e procure pelos logs dessa execução.

---

### 5. Verificar autenticação do `net.http_post`

O problema pode ser que o `current_setting('app.settings.service_role_key', true)` não está retornando a Service Role Key corretamente.

**Teste alternativo (com Service Role Key explícita):**

```sql
-- IMPORTANTE: Substitua 'SUA_SERVICE_ROLE_KEY_AQUI' pela sua Service Role Key real
-- Você encontra ela em: Supabase Dashboard → Settings → API → service_role key

SELECT
  net.http_post(
    url := 'https://tegyiuktrmcqxkbjxqoc.supabase.co/functions/v1/whatsapp-message-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SUA_SERVICE_ROLE_KEY_AQUI'
    ),
    body := '{}'::jsonb
  ) AS request_id;
```

**⚠️ ATENÇÃO:** Não compartilhe sua Service Role Key publicamente. Use apenas para teste.

---

## 🚀 Como Fazer Deploy da Função Atualizada

### Opção 1: Via Dashboard (Recomendado)

1. **Abra o arquivo local:**
   - `supabase/functions/whatsapp-message-scheduler/index.ts`

2. **Copie TODO o código:**
   - Selecione tudo (Ctrl+A)
   - Copie (Ctrl+C)

3. **No Supabase Dashboard:**
   - Vá em **Edge Functions** → **whatsapp-message-scheduler**
   - Clique na aba **"Code"**
   - Selecione TODO o código (Ctrl+A)
   - Cole o novo código (Ctrl+V)
   - Clique em **"Deploy"** ou **"Save"**

4. **Aguarde a confirmação de sucesso**

### Opção 2: Via Script PowerShell

```powershell
cd c:\V3\tipoagenda.com
.\scripts\deploy-whatsapp-scheduler.ps1
```

O script vai:
- Copiar o código para o clipboard
- Abrir o Supabase Dashboard
- Você só precisa colar e clicar em "Deploy"

---

## 🔍 Verificar Logs em Outras Abas

Se a aba **"Logs"** está vazia, tente:

1. **Aba "Invocations":**
   - Mostra todas as execuções da função
   - Clique em uma execução para ver detalhes e logs

2. **Aba "Overview":**
   - Pode mostrar estatísticas e últimas execuções

3. **Filtros de tempo:**
   - Na aba "Logs", tente mudar o filtro de "Last hour" para "Last 24 hours" ou "All time"

---

## 📋 Próximos Passos Após Diagnóstico

Depois de executar os passos acima, me informe:

1. ✅ O que você encontrou em cada verificação
2. ✅ Se a função está deployada (código atualizado no Dashboard)
3. ✅ Se o `net.http_post` retornou algum `status_code`
4. ✅ Se conseguiu executar a função via Dashboard (aba "Invocations")

Com essas informações, posso te ajudar a resolver o problema específico.

