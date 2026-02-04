# 📋 Status da Implementação: Menus nos Cards de Planos

## ✅ O que foi implementado

### 1. Página de Planos (`SubscriptionPlansPage.tsx`)
- ✅ Toggle Mensal/Anual funcionando
- ✅ Desconto de 15% no plano anual implementado
- ✅ Busca de menus vinculados aos planos via `menu_plans`
- ✅ Exibição dos menus nos cards (substituindo features estáticas)
- ✅ Cálculo correto de preços (mensal × 12 × 0.85 para anual)
- ✅ Banner de desconto quando "Anual" está selecionado
- ✅ Badge de economia em cada card

### 2. Landing Page (`LandingPage.tsx`)
- ✅ Toggle Mensal/Anual implementado
- ✅ Desconto de 15% no plano anual implementado
- ✅ Busca de menus vinculados aos planos via `menu_plans`
- ✅ Estrutura de exibição dos menus criada
- ⚠️ **PROBLEMA:** Menus não estão aparecendo nos cards

## 🔍 Problema Identificado

### Sintoma
Os menus não estão sendo exibidos nos cards da landing page, mesmo com a estrutura de código implementada.

### Logs de Debug Adicionados
Foram adicionados logs no console para diagnosticar:
- `[LandingPage] Buscando menus para X planos`
- `[LandingPage] Buscando menus do plano: NOME (ID)`
- `[LandingPage] Dados brutos de menu_plans para NOME`
- `[LandingPage] Menus processados para NOME: X menus`
- `[LandingPage] Renderizando card do plano NOME`

### Possíveis Causas
1. **Menus não vinculados aos planos** na tabela `menu_plans`
2. **Problema de RLS (Row Level Security)** bloqueando a leitura de `menu_plans`
3. **Estrutura de dados diferente** do esperado na resposta do Supabase
4. **Timing de carregamento** - menus sendo buscados antes dos planos estarem prontos

## 🔧 Próximos Passos para Resolver

### 1. Verificar Logs do Console
- Abrir console do navegador (F12)
- Recarregar a landing page
- Verificar logs que começam com `[LandingPage]`
- Identificar onde o fluxo está falhando

### 2. Validar Vínculos no Banco
Executar query SQL no Supabase:
```sql
SELECT 
  sp.name as plan_name,
  COUNT(mp.menu_id) as total_menus,
  STRING_AGG(m.label, ', ') as menus
FROM subscription_plans sp
LEFT JOIN menu_plans mp ON mp.plan_id = sp.id
LEFT JOIN menus m ON m.id = mp.menu_id
WHERE sp.status = 'active'
GROUP BY sp.id, sp.name
ORDER BY sp.price;
```

### 3. Verificar RLS Policies
Confirmar que a política `authenticated_users_can_view_menu_plans` está ativa e permite leitura pública (se necessário para landing page).

### 4. Ajustar Query se Necessário
Se a landing page não requer autenticação, pode ser necessário:
- Usar `supabaseClient` sem autenticação
- Ou criar uma RLS policy que permita leitura pública de `menu_plans` para planos ativos

## 📝 Estrutura de Dados Esperada

### Interface Menu
```typescript
interface Menu {
  id: string;
  menu_key: string;
  label: string;
  icon: string;
  description: string | null;
  display_order: number;
}
```

### Interface Plan (atualizada)
```typescript
interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  features: string[] | null;
  duration_months: number;
  menus?: Menu[]; // Menus vinculados ao plano
}
```

## 🎯 Objetivo Final

- Landing page e página de planos exibindo os mesmos menus dinamicamente
- Toggle mensal/anual funcionando em ambas
- Desconto de 15% aplicado corretamente
- Menus substituindo features estáticas
- Fallback para features antigas se não houver menus

## 📌 Arquivos Modificados

1. `src/pages/SubscriptionPlansPage.tsx` - ✅ Funcionando
2. `src/pages/LandingPage.tsx` - ⚠️ Menus não aparecem
3. `OPCOES_APRESENTACAO_MENUS_PLANOS.md` - Documentação de opções de apresentação

## 🔄 Para Continuar

1. Verificar logs do console do navegador
2. Validar vínculos menu_plans no banco de dados
3. Corrigir problema identificado (RLS, query, ou estrutura de dados)
4. Testar exibição dos menus na landing page
5. Remover logs de debug após confirmação

---

**Última atualização:** Implementação de menus dinâmicos nos cards de planos
**Status:** Em progresso - aguardando diagnóstico do problema de exibição na landing page

