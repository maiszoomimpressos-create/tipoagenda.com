# 🔧 Instruções para Corrigir o Erro de `auth_users`

## Problema

O erro `Could not find the table 'public.auth_users' in the schema cache` ocorre porque a view `auth_users` ainda não foi criada no banco de dados do Supabase.

## Solução Implementada

Foi criada uma solução temporária que funciona **mesmo sem a view**:

1. ✅ **Edge Function `get-user-auth-data`**: Busca dados de `auth.users` usando service role
2. ✅ **Fallback automático**: O código tenta usar a view primeiro, e se falhar, usa a Edge Function
3. ✅ **Edge Functions atualizadas**: `send-contact-request-email` agora usa `auth.admin.getUserById` diretamente

## O que você precisa fazer AGORA

### Passo 1: Fazer Deploy da Edge Function

A Edge Function `get-user-auth-data` precisa ser deployada no Supabase:

```bash
# No terminal, na raiz do projeto:
supabase functions deploy get-user-auth-data
```

**OU** via Supabase Dashboard:

1. Acesse: https://supabase.com/dashboard/project/[SEU_PROJECT_ID]/functions
2. Clique em **"Create a new function"**
3. Nome: `get-user-auth-data`
4. Cole o conteúdo do arquivo `supabase/functions/get-user-auth-data/index.ts`
5. Clique em **"Deploy"**

### Passo 2: Executar a Migration da View (Opcional, mas Recomendado)

Para melhor performance a longo prazo, execute a migration que cria a view `auth_users`:

1. Acesse o **SQL Editor** do Supabase: https://supabase.com/dashboard/project/[SEU_PROJECT_ID]/sql/new
2. Abra o arquivo `supabase/migrations/20260206_create_auth_users_view.sql`
3. Copie todo o conteúdo do arquivo
4. Cole no SQL Editor
5. Clique em **"Run"** ou pressione `Ctrl+Enter`

**Conteúdo da Migration:**
```sql
-- View para expor dados básicos de usuários de auth.users para uso em joins e telas administrativas
-- Mantém o acesso centralizado e evita dependência direta do schema auth no frontend.

create or replace view public.auth_users
as
select
  u.id,
  u.email,
  u.raw_user_meta_data,
  u.created_at
from auth.users u;

-- Garantir que a view execute com os privilégios do criador,
-- evitando necessidade de conceder acesso direto a auth.users.
alter view public.auth_users set (security_invoker = true);

-- Permitir leitura da view para clientes autenticados e anônimos (RLS continua valendo nas tabelas chamadas pelo app).
grant select on public.auth_users to anon, authenticated;
```

### Passo 3: Testar

1. Recarregue a página do admin dashboard (Ctrl+F5 para limpar cache)
2. Clique em **"Gerenciar Usuários"**
3. A lista deve carregar sem erros

## Como Funciona Agora

### Com a View Criada (Recomendado):
- ✅ Consultas rápidas via `from('auth_users')`
- ✅ Menos chamadas à API
- ✅ Melhor performance

### Sem a View (Fallback Automático):
- ✅ Edge Function `get-user-auth-data` busca os dados
- ✅ Funciona, mas é um pouco mais lento
- ✅ Requer deploy da Edge Function

## Verificação

Após executar os passos acima, verifique no console do navegador:

- ❌ **Antes**: `Could not find the table 'public.auth_users'`
- ✅ **Depois**: Lista de usuários carrega normalmente

## Notas Importantes

- A Edge Function **deve ser deployada** para o fallback funcionar
- A view é **opcional**, mas melhora a performance
- Se você já tem outras migrations pendentes, pode executar todas de uma vez via CLI: `supabase db push`

