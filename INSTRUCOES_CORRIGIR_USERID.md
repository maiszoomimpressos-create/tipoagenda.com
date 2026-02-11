# 🔧 Como Corrigir o Erro ERR_NO_USER_FOUND

## ❌ Problema Atual

O erro `ERR_NO_USER_FOUND` (404) indica que o `userId` configurado (184) não existe na sua conta LiotPRO.

## ✅ Solução

### Passo 1: Encontrar os Valores Corretos no Painel LiotPRO

1. Acesse o painel da LiotPRO: `sistema.liotpro.online`
2. Procure por:
   - **ID do Usuário/Atendente** (geralmente na seção de usuários/atendentes)
   - **ID da Fila** (geralmente na seção de filas)

### Passo 2: Atualizar no Banco de Dados

**Opção A: Via SQL Editor do Supabase**

1. Abra o SQL Editor do Supabase
2. Execute o arquivo `ATUALIZAR_USERID_QUEUEID.sql`
3. **Substitua** `'SEU_USER_ID'` e `'SEU_QUEUE_ID'` pelos valores corretos
4. Execute o UPDATE

**Opção B: Via Interface Web**

1. Acesse: Admin Dashboard > Provedores WhatsApp
2. Clique em "Editar" no provedor ativo
3. Atualize os campos:
   - **ID do Usuário/Atendente** (com o valor correto)
   - **ID da Fila** (com o valor correto)
4. Salve

### Passo 3: Testar Novamente

```powershell
node scripts/test-whatsapp-provider.js +5546999151842 "Teste após correção"
```

## 📋 Exemplo de SQL

```sql
UPDATE public.messaging_providers
SET user_id = '123',      -- Valor correto do painel LiotPRO
    queue_id = '456'      -- Valor correto do painel LiotPRO
WHERE channel = 'WHATSAPP' 
  AND is_active = true;
```

## ✅ O que está funcionando

- ✅ Conexão com a API
- ✅ Token de autenticação
- ✅ Formato do telefone (sem +)
- ✅ URL da API
- ✅ Payload JSON

## ❌ O que precisa ser corrigido

- ❌ `userId` incorreto (184 não existe na sua conta)
- ❌ Possivelmente `queueId` também incorreto

## 💡 Dica

Se você não encontrar esses IDs no painel, entre em contato com o suporte da LiotPRO e peça:
- O ID do usuário/atendente associado ao seu token
- O ID da fila que deve ser usada para envio de mensagens

