# 🚀 SOLUÇÃO RÁPIDA: Fazer Email Funcionar AGORA

## O Problema
A Edge Function `send-company-registration-notification` não foi deployada, então não há logs e o email não é enviado.

## Solução IMEDIATA (2 minutos)

### Opção 1: Deploy via CLI (Recomendado)

```bash
# 1. Certifique-se de estar na pasta do projeto
cd C:\V3\tipoagenda.com

# 2. Faça login no Supabase (se necessário)
supabase login

# 3. Deploy da função
supabase functions deploy send-company-registration-notification
```

### Opção 2: Deploy Manual (Se CLI não funcionar)

1. **Acesse:** https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions

2. **Clique em "New Function"** ou procure se já existe `send-company-registration-notification`

3. **Se não existir, crie:**
   - Nome: `send-company-registration-notification`
   - Copie TODO o conteúdo do arquivo: `supabase/functions/send-company-registration-notification/index.ts`

4. **Se já existir, edite:**
   - Vá em **Code**
   - Cole o conteúdo atualizado do arquivo
   - Clique em **Deploy** ou **Save**

5. **Configure a API Key:**
   - Vá em **Settings** > **Secrets**
   - Adicione/Verifique: `RESEND_API_KEY` = sua-api-key-do-resend

## Verificar se Funcionou

1. **Faça um novo cadastro de empresa**
2. **Verifique os logs:**
   - https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions/send-company-registration-notification/logs
   - Deve aparecer: "=== send-company-registration-notification INICIADO ==="
3. **Verifique o email:** `edricolpani@hotmail.com` (incluindo spam)

## Se Ainda Não Funcionar

### Verificar RESEND_API_KEY

1. Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions/register-company-and-user
2. Vá em **Settings** > **Secrets**
3. Verifique se `RESEND_API_KEY` está configurada
4. **Copie a mesma API Key** para a função `send-company-registration-notification`

### Testar Manualmente

1. Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions/send-company-registration-notification
2. Vá em **Test** ou **Invoke**
3. Cole este JSON:
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
4. Clique em **Run**
5. Verifique os logs e o email

## IMPORTANTE

O email é enviado em DOIS lugares:
1. ✅ **register-company-and-user** - Já está funcionando (fluxo UnifiedRegistrationPage)
2. ⚠️ **send-company-registration-notification** - Precisa ser deployada (fluxo CompanyRegistrationPage)

Após fazer o deploy, o email será enviado em AMBOS os fluxos!

