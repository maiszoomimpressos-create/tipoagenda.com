# ⚡ DEPLOY DA FUNÇÃO DE EMAIL - PASSO A PASSO

## 🎯 Objetivo
Fazer o email de notificação de cadastro de empresa funcionar AGORA.

## 📋 Passo a Passo (5 minutos)

### Passo 1: Acessar o Dashboard do Supabase

1. Abra: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions
2. Faça login se necessário

### Passo 2: Verificar se a Função Existe

1. Procure por `send-company-registration-notification` na lista de funções
2. **Se NÃO existir:**
   - Clique em **"New Function"** ou **"Create Function"**
   - Nome: `send-company-registration-notification`
   - Clique em **Create**

3. **Se JÁ existir:**
   - Clique nela para abrir

### Passo 3: Copiar o Código

1. Abra o arquivo local: `supabase/functions/send-company-registration-notification/index.ts`
2. **Selecione TODO o conteúdo** (Ctrl+A)
3. **Copie** (Ctrl+C)

### Passo 4: Colar no Supabase

1. No dashboard do Supabase, vá na aba **"Code"**
2. **Selecione TODO o código existente** (Ctrl+A)
3. **Cole o código novo** (Ctrl+V)
4. Clique em **"Deploy"** ou **"Save"**

### Passo 5: Configurar a API Key

1. No dashboard da função, vá em **"Settings"** (ou **"Secrets"**)
2. Procure por `RESEND_API_KEY`
3. **Se NÃO existir:**
   - Clique em **"Add Secret"** ou **"New Secret"**
   - Name: `RESEND_API_KEY`
   - Value: Cole sua API Key do Resend
   - Clique em **"Save"** ou **"Add"**

4. **Se JÁ existir:**
   - Verifique se está correta
   - Se estiver errada, edite e salve

### Passo 6: Verificar se Funcionou

1. Vá na aba **"Logs"**
2. Faça um novo cadastro de empresa
3. Os logs devem aparecer com: "=== send-company-registration-notification INICIADO ==="

## ✅ Pronto!

Agora o email será enviado automaticamente sempre que uma empresa for cadastrada.

## 🔍 Como Obter a RESEND_API_KEY (se não tiver)

1. Acesse: https://resend.com
2. Faça login
3. Vá em **API Keys**
4. Clique em **"Create API Key"**
5. Nome: `TipoAgenda`
6. Permissão: **"Sending access"**
7. Clique em **"Add"**
8. **COPIE a API Key** (ela só aparece uma vez!)

## 🚨 Se Ainda Não Funcionar

### Verificar Logs

1. Acesse os logs da função: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions/send-company-registration-notification/logs
2. Procure por erros ou avisos
3. Me envie o que aparecer nos logs

### Testar Manualmente

1. No dashboard da função, vá em **"Test"** ou **"Invoke"**
2. Cole este JSON:
```json
{
  "companyName": "Teste",
  "razaoSocial": "Teste LTDA",
  "cnpj": "12345678000190",
  "userPhone": "11999999999",
  "companyPhone": "11888888888",
  "address": "Rua Teste",
  "number": "123",
  "neighborhood": "Centro",
  "complement": "",
  "zipCode": "01234567",
  "city": "São Paulo",
  "state": "SP"
}
```
3. Clique em **"Run"**
4. Verifique se o email chegou em `edricolpani@hotmail.com`

