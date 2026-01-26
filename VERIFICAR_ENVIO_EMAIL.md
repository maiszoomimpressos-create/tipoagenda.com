# Como Verificar e Configurar Envio de Emails no Supabase

## Problema
O sistema mostra que o email foi enviado, mas o email não chega na caixa de entrada.

## Verificações Necessárias

### 1. Verificar Configurações de SMTP no Supabase

1. Acesse o painel do Supabase: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc
2. Vá em **Settings** > **Auth** > **SMTP Settings**
3. Verifique se há um SMTP configurado:
   - Se estiver usando o SMTP padrão do Supabase (limitado), pode não enviar para todos os emails
   - Recomenda-se configurar um SMTP próprio (Gmail, SendGrid, Mailgun, etc.)

### 2. Verificar Logs da Edge Function

1. No painel do Supabase, vá em **Edge Functions** > **resend-email-confirmation**
2. Clique em **Logs**
3. Procure por mensagens como:
   - "Confirmation email sent successfully via..."
   - "Error resending confirmation email..."
   - Verifique qual método foi usado e se houve erros

### 3. Verificar Logs de Autenticação

1. No painel do Supabase, vá em **Authentication** > **Logs**
2. Procure por tentativas de envio de email
3. Verifique se há erros relacionados a SMTP ou envio de email

### 4. Verificar Email Templates

1. No painel do Supabase, vá em **Authentication** > **Email Templates**
2. Verifique se o template de "Confirm signup" está configurado
3. O template deve ter o link de confirmação

### 5. Testar com Email Diferente

- Tente com um email diferente (Gmail, Outlook, etc.)
- Alguns provedores bloqueiam emails do Supabase por padrão

### 6. Verificar Rate Limiting

- O Supabase tem limites de envio de email
- Verifique se não excedeu o limite diário

## Solução: Configurar SMTP Próprio

### Opção 1: Gmail (Recomendado para testes)

1. No painel do Supabase, vá em **Settings** > **Auth** > **SMTP Settings**
2. Configure:
   - **SMTP Host**: `smtp.gmail.com`
   - **SMTP Port**: `587`
   - **SMTP User**: Seu email do Gmail
   - **SMTP Password**: Senha de app do Gmail (não a senha normal)
   - **Sender email**: Seu email do Gmail
   - **Sender name**: Nome que aparecerá no email

**Como obter senha de app do Gmail:**
1. Acesse: https://myaccount.google.com/apppasswords
2. Gere uma senha de app
3. Use essa senha no campo SMTP Password

### Opção 2: SendGrid (Recomendado para produção)

1. Crie conta no SendGrid
2. Obtenha API Key
3. Configure no Supabase:
   - **SMTP Host**: `smtp.sendgrid.net`
   - **SMTP Port**: `587`
   - **SMTP User**: `apikey`
   - **SMTP Password**: Sua API Key do SendGrid
   - **Sender email**: Email verificado no SendGrid

## Verificar se o Problema é do Código

Após fazer o deploy da função atualizada, verifique os logs:

1. Os logs devem mostrar qual método foi usado
2. Se todos os métodos falharem, o problema é de configuração do Supabase
3. Se algum método retornar sucesso mas o email não chegar, o problema é de SMTP

## Próximos Passos

1. ✅ Fazer deploy da função atualizada (com logs detalhados)
2. ✅ Verificar logs da Edge Function após testar
3. ✅ Configurar SMTP próprio se necessário
4. ✅ Testar novamente após configurar SMTP

## Contato

Se o problema persistir após configurar o SMTP, verifique:
- Se o email está na lista de emails permitidos do Supabase
- Se há bloqueios de firewall ou antivírus
- Se o provedor de email está bloqueando emails do Supabase

