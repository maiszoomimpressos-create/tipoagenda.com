# Como Configurar Resend API para Envio de Emails

## Por que usar Resend?

- ✅ **Gratuito** até 3.000 emails/mês
- ✅ **Não depende do SMTP do Supabase**
- ✅ **Mais confiável** que SMTP padrão
- ✅ **Fácil de configurar** (apenas uma API Key)
- ✅ **Funciona imediatamente** após configurar

## Passo a Passo

### 1. Criar conta no Resend

1. Acesse: https://resend.com
2. Clique em **"Sign Up"** (criar conta)
3. Use seu email (pode ser qualquer email, não precisa ser Gmail)
4. Confirme seu email

### 2. Obter API Key

1. Após fazer login, vá em **API Keys** no menu lateral
2. Clique em **"Create API Key"**
3. Dê um nome (ex: "TipoAgenda Production")
4. Selecione as permissões: **"Sending access"**
5. Clique em **"Add"**
6. **COPIE A API KEY** (ela só aparece uma vez!)

### 3. Adicionar API Key no Supabase

1. Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions
2. Vá em **Edge Functions** > **resend-email-confirmation**
3. Clique em **Settings** ou **Secrets**
4. Adicione uma nova variável de ambiente:
   - **Nome**: `RESEND_API_KEY`
   - **Valor**: Cole a API Key que você copiou
5. Clique em **Save**

### 4. Verificar Domínio (Opcional para produção)

Para usar um domínio próprio (ex: noreply@tipoagenda.com):

1. No Resend, vá em **Domains**
2. Clique em **"Add Domain"**
3. Adicione seu domínio (ex: tipoagenda.com)
4. Siga as instruções para adicionar os registros DNS
5. Aguarde a verificação (pode levar alguns minutos)

**Para testes, você pode usar o domínio padrão do Resend: `onboarding@resend.dev`**

### 5. Atualizar Código (se necessário)

Se quiser usar um domínio próprio, edite a Edge Function e altere:

```typescript
from: 'TipoAgenda <noreply@tipoagenda.com>',
```

Para:

```typescript
from: 'TipoAgenda <onboarding@resend.dev>', // Para testes
// ou
from: 'TipoAgenda <noreply@seu-dominio.com>', // Para produção
```

## Testar

1. Faça o deploy da Edge Function atualizada
2. Teste o botão "Reenviar E-mail"
3. Verifique sua caixa de entrada
4. O email deve chegar em segundos!

## Troubleshooting

### Email não chega

1. Verifique se a API Key está correta
2. Verifique os logs da Edge Function
3. Verifique se o email não está na pasta de spam
4. Tente com outro email

### Erro "Unauthorized"

- A API Key está incorreta ou expirada
- Gere uma nova API Key e atualize

### Erro "Domain not verified"

- Use `onboarding@resend.dev` para testes
- Ou verifique seu domínio no Resend

## Limites Gratuitos

- **3.000 emails/mês** no plano gratuito
- **100 emails/dia** no plano gratuito
- Mais que suficiente para começar!

## Upgrade (quando necessário)

Quando precisar de mais:
- Plano Pro: $20/mês - 50.000 emails
- Plano Business: $80/mês - 200.000 emails

## Pronto!

Após configurar, os emails serão enviados automaticamente via Resend, sem depender do SMTP do Supabase!

