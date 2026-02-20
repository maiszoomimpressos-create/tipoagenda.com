# ✅ FAZER EMAIL FUNCIONAR AGORA - 3 PASSOS

## O Problema
O email não está sendo enviado porque a função `send-company-registration-notification` não foi deployada.

## Solução (2 minutos)

### Passo 1: Acessar o Dashboard
https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions

### Passo 2: Criar/Editar a Função
1. Procure `send-company-registration-notification`
2. Se NÃO existir: Clique em "New Function" → Nome: `send-company-registration-notification`
3. Se existir: Clique nela

### Passo 3: Copiar e Colar o Código
1. Abra: `supabase/functions/send-company-registration-notification/index.ts`
2. Copie TODO o conteúdo (Ctrl+A, Ctrl+C)
3. No Supabase, aba "Code", cole (Ctrl+V)
4. Clique em "Deploy" ou "Save"
5. Vá em "Settings" > "Secrets"
6. Adicione/Verifique: `RESEND_API_KEY` = sua-api-key

## Pronto!
Agora o email será enviado automaticamente.

## Verificar
1. Faça um cadastro de empresa
2. Verifique os logs da função
3. Verifique o email em `edricolpani@hotmail.com`

