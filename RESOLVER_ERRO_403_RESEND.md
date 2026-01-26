# 🔴 Erro 403 do Resend - Como Resolver

## O Problema

O erro mostra: **"You can only send testing emails to your own email address"**

Isso significa que o Resend está em **modo de teste** e só permite enviar emails para o email da sua conta do Resend.

## Solução Rápida (Para Testar Agora)

1. Acesse: https://resend.com
2. Veja qual é o email da sua conta (o email que você usou para criar a conta)
3. Use esse email para testar o cadastro
4. O email vai chegar!

## Solução Definitiva (Para Produção)

Para enviar emails para QUALQUER email, você precisa verificar um domínio:

### Passo 1: Adicionar Domínio no Resend

1. Acesse: https://resend.com/domains
2. Clique em **"Add Domain"**
3. Digite seu domínio (ex: `tipoagenda.com`)
4. Clique em **"Add"**

### Passo 2: Verificar Domínio

1. O Resend vai mostrar registros DNS que você precisa adicionar
2. Acesse o painel do seu provedor de domínio (onde você comprou o domínio)
3. Adicione os registros DNS que o Resend pediu
4. Aguarde alguns minutos para propagação
5. Volte no Resend e clique em **"Verify"**

### Passo 3: Atualizar o Código

Depois de verificar o domínio, atualize a Edge Function:

No arquivo `supabase/functions/resend-email-confirmation/index.ts`, linha 121, altere:

```typescript
from: 'TipoAgenda <onboarding@resend.dev>',
```

Para:

```typescript
from: 'TipoAgenda <noreply@tipoagenda.com>', // Use seu domínio verificado
```

### Passo 4: Fazer Deploy Novamente

1. Cole o código atualizado no Supabase
2. Clique em "Deploy"

## Alternativa Rápida (Sem Verificar Domínio)

Se você não tem um domínio próprio, pode usar o domínio de teste do Resend, mas **só funciona para o email da sua conta do Resend**.

Para testar agora:
- Use o email da sua conta do Resend como email de cadastro
- O email vai chegar!

## Resumo

- **Modo de teste**: Só envia para seu email
- **Domínio verificado**: Envia para qualquer email
- **Para produção**: Você PRECISA verificar um domínio

