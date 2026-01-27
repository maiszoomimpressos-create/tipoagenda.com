# ✅ Como Completar a Verificação do Domínio tipoagenda.com no Resend

## 📊 Status Atual

- ✅ **DKIM**: Verificado (registro `resend._domainkey` está OK)
- ❌ **Status Geral**: Failed (faltam outros registros DNS)

## 🔍 O que está faltando?

No painel do Resend, você deve ver uma lista de registros DNS necessários. Normalmente são:

1. **SPF** (TXT record) - Para autenticação do remetente
2. **DKIM** (TXT record) - ✅ JÁ ESTÁ VERIFICADO
3. **DMARC** (TXT record) - Para políticas de autenticação
4. Possivelmente um registro **CNAME** ou **TXT** adicional

## 📝 Passo a Passo para Completar a Verificação

### 1. Verificar quais registros estão faltando no Resend

1. Acesse: https://resend.com/domains
2. Clique no domínio `tipoagenda.com`
3. Veja a seção **"DNS Records"** ou **"Domain Verification"**
4. Identifique quais registros estão com status **"Pending"** ou **"Failed"** (além do DKIM que já está OK)

### 2. Adicionar os registros DNS faltantes

1. Acesse o painel do seu provedor de domínio (onde você comprou `tipoagenda.com`)
   - Exemplos: GoDaddy, Registro.br, Namecheap, Cloudflare, etc.
2. Vá em **DNS** ou **Zona DNS** ou **DNS Management**
3. Para cada registro que está faltando no Resend:
   - Clique em **"Add Record"** ou **"Adicionar Registro"**
   - Selecione o tipo (geralmente **TXT** ou **CNAME**)
   - Preencha:
     - **Nome/Host**: O que o Resend pediu (ex: `@`, `_dmarc`, etc.)
     - **Valor/Conteúdo**: O valor que o Resend forneceu
     - **TTL**: Deixe como padrão (geralmente 3600 ou Auto)
   - Salve o registro

### 3. Aguardar propagação DNS

- ⏱️ **Tempo**: 5 a 30 minutos (às vezes até 1 hora)
- 🔄 Os registros DNS precisam se propagar pela internet

### 4. Verificar novamente no Resend

1. Volte para: https://resend.com/domains
2. Clique no domínio `tipoagenda.com`
3. Clique no botão **"Verify"** ou **"Re-verify"**
4. Aguarde alguns segundos
5. Se todos os registros estiverem corretos, o status mudará para **"Verified"** ✅

## 🔄 Atualizar o Código (Após Verificação)

Depois que o domínio estiver **"Verified"** no Resend, atualize as Edge Functions:

### Arquivo 1: `supabase/functions/resend-email-confirmation/index.ts`

**Linha 121**, altere:
```typescript
from: 'onboarding@resend.dev', // Domínio de teste
```

Para:
```typescript
from: 'TipoAgenda <noreply@tipoagenda.com>', // Domínio verificado
```

### Arquivo 2: `supabase/functions/register-company-and-user/index.ts`

**Linha 308**, altere:
```typescript
from: 'onboarding@resend.dev', // Domínio de teste
```

Para:
```typescript
from: 'TipoAgenda <noreply@tipoagenda.com>', // Domínio verificado
```

### Fazer Deploy

1. Cole o código atualizado no Supabase Dashboard
2. Clique em **"Deploy"**
3. Pronto! Agora os emails serão enviados de `noreply@tipoagenda.com`

## ✅ Como Saber se Está Funcionando?

1. Faça um teste de cadastro
2. Verifique se o email chega
3. Veja o remetente: deve ser `TipoAgenda <noreply@tipoagenda.com>`
4. Verifique se não está na pasta de spam

## 🚨 Se Ainda Não Funcionar

1. Verifique se **TODOS** os registros DNS estão com status **"Verified"** no Resend
2. Aguarde mais tempo para propagação DNS (pode levar até 24 horas em casos raros)
3. Verifique se os registros DNS foram adicionados corretamente no seu provedor de domínio
4. No Resend, veja se há mensagens de erro específicas sobre qual registro está falhando

## 📌 Resumo

- **Agora**: Código usa `onboarding@resend.dev` (só funciona para email da conta do Resend)
- **Depois**: Após verificar o domínio, usar `noreply@tipoagenda.com` (funciona para qualquer email)
- **Status**: DKIM OK, mas faltam outros registros DNS para completar a verificação

