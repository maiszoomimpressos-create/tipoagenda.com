# ⚠️ CONFIGURE AGORA - É OBRIGATÓRIO

## O email NÃO vai funcionar sem isso!

### Passo 1: Criar conta no Resend (2 minutos)

1. Acesse: **https://resend.com**
2. Clique em **"Sign Up"** (criar conta)
3. Use QUALQUER email (não precisa ser Gmail)
4. Confirme seu email

### Passo 2: Obter API Key (1 minuto)

1. Após fazer login, clique em **"API Keys"** no menu lateral
2. Clique em **"Create API Key"**
3. Dê um nome: `TipoAgenda`
4. Selecione: **"Sending access"**
5. Clique em **"Add"**
6. **COPIE A API KEY** (ela só aparece uma vez!)

### Passo 3: Adicionar no Supabase (1 minuto)

1. Acesse: **https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/functions**
2. Clique em **"resend-email-confirmation"**
3. Vá em **"Settings"** ou **"Secrets"** (no menu lateral)
4. Clique em **"Add Secret"** ou **"New Secret"**
5. Configure:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Cole a API Key que você copiou
6. Clique em **"Save"** ou **"Add"**

### Passo 4: Fazer Deploy da Função

1. Ainda na página da função `resend-email-confirmation`
2. Cole o código atualizado do arquivo `supabase/functions/resend-email-confirmation/index.ts`
3. Clique em **"Deploy"** ou **"Save"**

### Pronto! Agora vai funcionar!

Teste o botão "Reenviar E-mail" e o email vai chegar em segundos!

---

## Por que isso é necessário?

O Supabase **NÃO envia emails automaticamente** sem SMTP configurado. O Resend é:
- ✅ **Gratuito** (3.000 emails/mês)
- ✅ **Funciona imediatamente**
- ✅ **Não precisa configurar SMTP**
- ✅ **Mais confiável**

## Se não fizer isso, o email NUNCA vai funcionar!

