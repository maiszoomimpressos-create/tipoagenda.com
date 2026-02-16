# 🔍 Diagnóstico Completo: Problema de Vinculação Menu-Planos

## 📋 Problema Relatado
- Usuário cadastrou vinculação entre planos e menus duas vezes
- Ao acessar novamente, os planos vinculados não aparecem
- Na página `admin-dashboard/menus`, mostra "Nenhum plano vinculado"

## 🔧 Correções Implementadas

### 1. **Correção na Query de Busca** ✅
**Problema encontrado:**
- A query estava usando `plans(id, name)` mas a tabela se chama `subscription_plans`
- Isso causava erro na busca dos planos vinculados

**Correção aplicada:**
```typescript
// ANTES (ERRADO):
.select('menu_id, plan_id, plans(id, name)')

// DEPOIS (CORRETO):
.select('menu_id, plan_id, subscription_plans(id, name, status)')
```

### 2. **Logs de Debug Adicionados** ✅
- Logs para verificar se os planos estão sendo buscados
- Logs para verificar se há discrepância entre planos vinculados e planos disponíveis
- Logs para identificar problemas de sincronização

## 🧪 Como Diagnosticar

### Passo 1: Verificar no Banco de Dados
Execute o script SQL `VERIFICAR_VINCULACAO_MENU_PLANOS.sql` no Supabase SQL Editor:

```sql
-- Verificar vinculações existentes
SELECT 
  mp.id as vinculacao_id,
  mp.menu_id,
  m.menu_key,
  m.label as menu_nome,
  mp.plan_id,
  sp.name as plano_nome,
  sp.status as plano_status,
  mp.created_at
FROM menu_plans mp
LEFT JOIN menus m ON m.id = mp.menu_id
LEFT JOIN subscription_plans sp ON sp.id = mp.plan_id
ORDER BY m.label, sp.name;
```

**O que verificar:**
- ✅ Se há registros na tabela `menu_plans`
- ✅ Se os `menu_id` e `plan_id` são válidos
- ✅ Se os planos estão com `status = 'active'`

### Passo 2: Verificar no Console do Navegador
1. Abra o Console do Navegador (F12)
2. Acesse a página `admin-dashboard/menus`
3. Procure por logs que começam com `[MenuManagementPage]`

**Logs esperados:**
```
[MenuManagementPage] Planos vinculados encontrados: [...]
[MenuManagementPage] Mapa de planos por menu: {...}
```

**Se aparecer erro:**
- Verifique se você é Admin Global
- Verifique se há problemas de RLS (Row Level Security)

### Passo 3: Verificar RLS (Row Level Security)
Execute no Supabase SQL Editor:

```sql
-- Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'menu_plans';
```

**O que verificar:**
- ✅ Se existe política `authenticated_users_can_view_menu_plans` para SELECT
- ✅ Se existe política `global_admin_can_insert_menu_plans` para INSERT
- ✅ Se você tem permissão de Admin Global

## 🐛 Possíveis Causas

### 1. **Problema de RLS (Row Level Security)**
**Sintoma:** Dados são salvos mas não aparecem ao buscar

**Solução:**
- Verificar se você é Admin Global
- Verificar se as políticas RLS estão corretas
- Executar o script `20250130_create_menu_system_rls.sql` novamente

### 2. **Problema na Foreign Key**
**Sintoma:** Erro ao inserir ou dados órfãos

**Solução:**
- Verificar se os `menu_id` e `plan_id` existem
- Verificar se os planos estão com `status = 'active'`

### 3. **Problema de Cache/Estado**
**Sintoma:** Dados aparecem no banco mas não na tela

**Solução:**
- Já corrigido: agora recarrega os dados após salvar
- Limpar cache do navegador
- Recarregar a página (F5)

### 4. **Problema na Query de Busca**
**Sintoma:** Query retorna vazio mesmo com dados no banco

**Solução:**
- ✅ Já corrigido: query agora usa `subscription_plans` em vez de `plans`
- Verificar se a relação está configurada corretamente no Supabase

## ✅ Checklist de Verificação

Após fazer a vinculação, verifique:

- [ ] Mensagem de sucesso aparece?
- [ ] Logs no console mostram dados sendo salvos?
- [ ] Query SQL mostra os registros na tabela `menu_plans`?
- [ ] Os badges de planos aparecem na lista de menus?
- [ ] Ao recarregar a página, os planos ainda aparecem?

## 🔄 Próximos Passos

1. **Testar a correção:**
   - Vincular um plano a um menu
   - Verificar se aparece imediatamente
   - Recarregar a página e verificar se persiste

2. **Se ainda não funcionar:**
   - Executar o script SQL de diagnóstico
   - Verificar logs no console
   - Verificar políticas RLS
   - Verificar se você tem permissão de Admin Global

3. **Se funcionar:**
   - Remover logs de debug (opcional)
   - Testar com outros menus e planos

## 📝 Arquivos Modificados

1. **`src/pages/MenuManagementPage.tsx`**
   - Corrigida query de busca (linha 103)
   - Adicionados logs de debug
   - Melhorado tratamento de erros

2. **`VERIFICAR_VINCULACAO_MENU_PLANOS.sql`** (novo)
   - Script SQL para diagnóstico completo

3. **`DIAGNOSTICO_COMPLETO_MENU_PLANOS.md`** (este arquivo)
   - Documentação do problema e soluções


