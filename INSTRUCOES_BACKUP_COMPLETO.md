# 📦 Instruções para Backup Completo do TipoAgenda

## ✅ O que está incluído no backup

O backup completo inclui automaticamente:

1. **Políticas RLS (Row Level Security)** - Todas as políticas de segurança
2. **Views** - Todas as views do banco (ex: auth_users)
3. **Functions e Procedures** - Todas as funções SQL (ex: get_user_context, assign_user_to_company)
4. **Triggers** - Todos os triggers configurados
5. **Schema das Tabelas (CREATE TABLE)** - Estrutura completa de todas as tabelas com:
   - Colunas e tipos de dados
   - Constraints (NOT NULL, DEFAULT)
   - Primary Keys
   - Foreign Keys (com ON UPDATE/ON DELETE)
   - Unique constraints
   - Check constraints
6. **Dados das Tabelas** - Dados de todas as tabelas principais
7. **Edge Functions (referência)** - Lista das Edge Functions (código deve ser copiado manualmente)

## 🚀 Passo 1: Aplicar Migration das Funções Auxiliares

Para que o backup exporte automaticamente RLS, views, functions e triggers, você precisa aplicar a migration que cria as funções auxiliares:

1. Acesse o **SQL Editor** do Supabase: https://supabase.com/dashboard/project/[SEU_PROJECT_ID]/sql/new
2. Abra o arquivo `supabase/migrations/20260209_create_backup_helper_function.sql`
3. **Copie TODO o conteúdo** do arquivo
4. Cole no SQL Editor do Supabase
5. Clique em **"Run"** ou pressione `Ctrl+Enter`

Esta migration cria 5 funções auxiliares:
- `export_rls_policies()` - Exporta todas as políticas RLS
- `export_views()` - Exporta todas as views
- `export_functions()` - Exporta todas as functions SQL
- `export_triggers()` - Exporta todos os triggers
- `export_table_schemas()` - Exporta schema completo das tabelas (CREATE TABLE com colunas, constraints, PKs e FKs)

## 🚀 Passo 2: Fazer Deploy da Edge Function

Execute no terminal (na raiz do projeto):

```bash
supabase functions deploy create-backup
```

**OU** via Supabase Dashboard:

1. Acesse: https://supabase.com/dashboard/project/[SEU_PROJECT_ID]/functions
2. Crie uma nova função chamada `create-backup`
3. Cole o conteúdo do arquivo `supabase/functions/create-backup/index.ts`
4. Clique em **"Deploy"**

## 🚀 Passo 3: Usar o Backup

1. Acesse o **Admin Dashboard** como GLOBAL_ADMIN
2. Clique no card **"Backup do Banco de Dados"**
3. Clique em **"Criar e Baixar Backup"**
4. O arquivo `.sql` será baixado automaticamente

## 📝 Nota sobre Edge Functions

As Edge Functions são arquivos TypeScript/JavaScript e não podem ser exportadas via SQL. Para backup completo:

1. Copie manualmente a pasta `supabase/functions/` do projeto
2. Ou use controle de versão (Git) para manter o código das Edge Functions

## 🔍 Verificação

Após aplicar a migration, você pode verificar se as funções foram criadas:

```sql
-- Verificar se as funções existem
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE 'export_%';
```

Você deve ver:
- `export_rls_policies`
- `export_views`
- `export_functions`
- `export_triggers`

## ⚠️ Importante

- O backup exporta até **10.000 registros por tabela** para evitar timeouts
- Se você tiver mais registros, considere usar `pg_dump` diretamente
- Edge Functions devem ser copiadas manualmente da pasta do projeto
- O backup é gerado em formato SQL compatível com PostgreSQL

## 🎯 Resultado

Após seguir estes passos, você terá um backup completo que inclui:
- ✅ Todas as políticas RLS
- ✅ Todas as views
- ✅ Todas as functions SQL
- ✅ Todos os triggers
- ✅ Dados de todas as tabelas principais
- ✅ Referência das Edge Functions

