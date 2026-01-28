# ✅ Checklist: Verificar Deploy das Edge Functions

## 🔍 Problema Atual

O domínio `tipoagenda.com` está **verificado** no Resend, mas ainda está dando erro 403. Isso indica que:

1. ⚠️ A Edge Function pode não ter sido deployada com o código atualizado
2. ⚠️ A API Key pode estar em modo de teste

## ✅ Checklist de Verificação

### 1. Verificar se a Edge Function foi Deployada

**Edge Function:** `register-company-and-user`

1. Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions
2. Clique em **`register-company-and-user`**
3. Verifique o código na linha **308**:
   - ✅ Deve estar: `from: 'TipoAgenda <noreply@tipoagenda.com>'`
   - ❌ NÃO deve estar: `from: 'onboarding@resend.dev'`
4. Se estiver com `onboarding@resend.dev`, você precisa fazer deploy:
   - Abra o arquivo: `supabase/functions/register-company-and-user/index.ts`
   - Copie TODO o conteúdo
   - Cole no editor da Edge Function no Supabase
   - Clique em **"Deploy"**

### 2. Verificar a Edge Function `resend-email-confirmation`

1. Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions
2. Clique em **`resend-email-confirmation`**
3. Verifique o código na linha **121**:
   - ✅ Deve estar: `from: 'TipoAgenda <noreply@tipoagenda.com>'`
   - ❌ NÃO deve estar: `from: 'onboarding@resend.dev'`
4. Se estiver com `onboarding@resend.dev`, faça o deploy também

### 3. Verificar a API Key do Resend

1. Acesse: https://resend.com/api-keys
2. Verifique se a API Key está:
   - ✅ **Ativa** (não revogada)
   - ✅ **Não está em modo de teste** (se houver essa opção)
3. Se necessário, crie uma nova API Key:
   - Clique em **"Create API Key"**
   - Dê um nome: `TipoAgenda Production`
   - Selecione: **"Sending access"**
   - **COPIE A API KEY** (ela só aparece uma vez!)

### 4. Verificar se a API Key está Configurada no Supabase

**Para `register-company-and-user`:**
1. Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions/register-company-and-user
2. Vá em **Settings** ou **Secrets**
3. Verifique se existe:
   - **Nome**: `RESEND_API_KEY`
   - **Valor**: (deve ter a API Key do Resend)
4. Se não existir ou estiver errada:
   - Adicione/Atualize: `RESEND_API_KEY` = sua-api-key-do-resend

**Para `resend-email-confirmation`:**
1. Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions/resend-email-confirmation
2. Vá em **Settings** ou **Secrets**
3. Verifique se existe:
   - **Nome**: `RESEND_API_KEY`
   - **Valor**: (deve ter a API Key do Resend)
4. Se não existir ou estiver errada:
   - Adicione/Atualize: `RESEND_API_KEY` = sua-api-key-do-resend

## 🧪 Teste Após Verificar

1. Faça um novo cadastro de empresa
2. Verifique se o email chega
3. Verifique se o remetente é `TipoAgenda <noreply@tipoagenda.com>`
4. Se ainda der erro 403, verifique os logs da Edge Function no Supabase

## 📋 Resumo

- ✅ Domínio verificado no Resend
- ⚠️ Verificar se Edge Functions foram deployadas
- ⚠️ Verificar se API Key está configurada corretamente
- ⚠️ Verificar se API Key não está em modo de teste

