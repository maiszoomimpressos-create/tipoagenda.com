# 🔍 Diagnóstico: Email de Cadastro de Empresa Não Chegou

## Possíveis Causas (em ordem de probabilidade)

### 1. ⚠️ Edge Function não foi deployada
**Problema:** O código foi criado localmente, mas não foi enviado para o Supabase.

**Solução:**
1. Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions
2. Verifique se existe a função `send-company-registration-notification`
3. Se NÃO existir:
   - Faça deploy da função usando o CLI do Supabase:
     ```bash
     supabase functions deploy send-company-registration-notification
     ```
   - Ou copie o código manualmente no dashboard do Supabase

### 2. ⚠️ RESEND_API_KEY não configurada
**Problema:** A API Key do Resend não está configurada nas Edge Functions.

**Solução:**
1. Para `register-company-and-user`:
   - Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions/register-company-and-user
   - Vá em **Settings** > **Secrets**
   - Verifique se existe `RESEND_API_KEY`
   - Se não existir, adicione com a sua API Key do Resend

2. Para `send-company-registration-notification`:
   - Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions/send-company-registration-notification
   - Vá em **Settings** > **Secrets**
   - Adicione `RESEND_API_KEY` com a sua API Key do Resend

### 3. ⚠️ Código não está sendo executado
**Problema:** O código pode não estar sendo chamado ou há um erro silencioso.

**Como verificar:**
1. Acesse os logs da Edge Function `register-company-and-user`:
   - https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions/register-company-and-user/logs
   - Procure por: "Notification email sent successfully" ou "Failed to send notification email"
   - Procure por: "RESEND_API_KEY não configurada"

2. Acesse os logs da Edge Function `send-company-registration-notification`:
   - https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions/send-company-registration-notification/logs
   - Procure por erros ou avisos

### 4. ⚠️ Email está indo para spam
**Problema:** O email pode ter sido enviado, mas está na pasta de spam.

**Solução:**
- Verifique a pasta de spam/lixo eletrônico do email `edricolpani@hotmail.com`
- Verifique também a pasta "Outros" ou "Outras" no Outlook/Hotmail

### 5. ⚠️ Resend está em modo de teste
**Problema:** Se a API Key do Resend estiver em modo de teste, só envia para emails verificados.

**Como verificar:**
- Acesse: https://resend.com/api-keys
- Verifique se a API Key está em modo "Production" ou "Test"
- Se estiver em modo "Test", você só pode enviar para o email da sua conta do Resend

### 6. ⚠️ Domínio não verificado no Resend
**Problema:** O domínio `tipoagenda.com` pode não estar verificado no Resend.

**Solução:**
- Acesse: https://resend.com/domains
- Verifique se `tipoagenda.com` está verificado
- Se não estiver, use temporariamente: `onboarding@resend.dev` para testes

## 🔧 Passos Imediatos para Resolver

### Passo 1: Verificar Logs
1. Faça um novo cadastro de empresa (ou simule)
2. Acesse os logs das Edge Functions:
   - `register-company-and-user` → Logs
   - `send-company-registration-notification` → Logs
3. Procure por mensagens de erro ou aviso

### Passo 2: Verificar Configuração
1. Verifique se `RESEND_API_KEY` está configurada em AMBAS as funções
2. Verifique se as funções foram deployadas

### Passo 3: Testar Manualmente
1. Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions/send-company-registration-notification
2. Vá em **Test** ou **Invoke**
3. Use este body de teste:
```json
{
  "companyName": "Empresa Teste",
  "razaoSocial": "Empresa Teste LTDA",
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
4. Clique em **Run** ou **Invoke**
5. Verifique os logs para ver se o email foi enviado

### Passo 4: Verificar Email
1. Verifique a caixa de entrada de `edricolpani@hotmail.com`
2. Verifique a pasta de spam
3. Verifique se há filtros de email ativos

## 📋 Checklist de Verificação

- [ ] Edge Function `send-company-registration-notification` foi deployada?
- [ ] `RESEND_API_KEY` está configurada em `register-company-and-user`?
- [ ] `RESEND_API_KEY` está configurada em `send-company-registration-notification`?
- [ ] Logs mostram tentativa de envio?
- [ ] Logs mostram algum erro?
- [ ] Email foi verificado na pasta de spam?
- [ ] Resend está em modo Production?
- [ ] Domínio está verificado no Resend?

## 🚨 Se Nada Funcionar

1. **Copie os logs** das Edge Functions e me envie
2. **Teste manualmente** a função `send-company-registration-notification` e me envie o resultado
3. **Verifique** se outros emails do sistema estão funcionando (ex: confirmação de cadastro)

