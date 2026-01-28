# 📋 Scripts SQL para Aplicar no Supabase

## ⚠️ IMPORTANTE: Aplique na ordem abaixo

### 1️⃣ Migration: Corrigir RLS de Horários de Colaboradores

**Arquivo:** `supabase/migrations/20250109_fix_working_schedules_rls.sql`

**Quando aplicar:** Se você teve erro 403 ao salvar horários de colaboradores

**Como aplicar:**
1. Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/sql/new
2. Abra o arquivo `supabase/migrations/20250109_fix_working_schedules_rls.sql`
3. **Copie TODO o conteúdo** do arquivo
4. Cole no editor SQL do Supabase
5. Clique em **"Run"** ou **"Execute"**

---

### 2️⃣ Migration: Corrigir RLS de Checkout (Finalizar Atendimento)

**Arquivo:** `supabase/migrations/20250109_fix_checkout_rls.sql`

**Quando aplicar:** Se você teve erro 403 ao finalizar atendimentos/checkout

**Como aplicar:**
1. Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/sql/new
2. Abra o arquivo `supabase/migrations/20250109_fix_checkout_rls.sql`
3. **Copie TODO o conteúdo** do arquivo
4. Cole no editor SQL do Supabase
5. Clique em **"Run"** ou **"Execute"**

---

## ✅ Verificar se Aplicou Corretamente

Após aplicar cada migration, você pode verificar se as políticas foram criadas:

```sql
-- Verificar políticas de working_schedules
SELECT * FROM pg_policies WHERE tablename = 'working_schedules';

-- Verificar políticas de schedule_exceptions
SELECT * FROM pg_policies WHERE tablename = 'schedule_exceptions';

-- Verificar políticas de cash_movements
SELECT * FROM pg_policies WHERE tablename = 'cash_movements';

-- Verificar políticas de transaction_products
SELECT * FROM pg_policies WHERE tablename = 'transaction_products';

-- Verificar políticas de appointments (UPDATE)
SELECT * FROM pg_policies WHERE tablename = 'appointments' AND policyname LIKE '%update%';
```

---

## 🚨 Se Der Erro

Se algum script der erro, verifique:
1. Se a tabela existe
2. Se já existem políticas com o mesmo nome (o script usa `DROP POLICY IF EXISTS`, então deve ser seguro)
3. Se você tem permissões de administrador no Supabase

---

## 📝 Resumo

- ✅ **Migration 1**: Corrige erro ao salvar horários de colaboradores
- ✅ **Migration 2**: Corrige erro ao finalizar atendimentos/checkout
- ✅ **Ambas são seguras**: Usam `DROP POLICY IF EXISTS` e `DO $$` para verificar antes de criar

**Aplique ambas para garantir que tudo funcione corretamente!**

