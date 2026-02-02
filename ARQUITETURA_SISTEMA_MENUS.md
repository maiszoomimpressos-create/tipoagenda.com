# 🏗️ Arquitetura do Sistema de Controle de Menus

## 📋 Visão Geral

Sistema completo de controle de menus que permite:
- **Admin Global**: Criar menus e vincular a planos de assinatura
- **Proprietário**: Definir quais funções (roles) têm acesso a quais menus na sua empresa

---

## 🗄️ Arquitetura de Banco de Dados

### 1. Tabela: `menus`
Armazena os menus do sistema.

```sql
CREATE TABLE public.menus (
  id UUID PRIMARY KEY,
  menu_key TEXT UNIQUE NOT NULL,      -- Ex: 'dashboard', 'agendamentos'
  label TEXT NOT NULL,                -- Nome exibido: 'Dashboard', 'Agendamentos'
  icon TEXT NOT NULL,                 -- Classe do ícone: 'fas fa-chart-line'
  path TEXT NOT NULL,                 -- Rota: '/dashboard', '/agendamentos/:companyId'
  display_order INTEGER DEFAULT 0,    -- Ordem de exibição
  is_active BOOLEAN DEFAULT true,     -- Se está ativo
  description TEXT,                   -- Descrição opcional
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Responsabilidade**: Admin Global (CRUD completo)

---

### 2. Tabela: `menu_plans`
Relacionamento N:N entre menus e planos de assinatura.

```sql
CREATE TABLE public.menu_plans (
  id UUID PRIMARY KEY,
  menu_id UUID REFERENCES menus(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ,
  UNIQUE(menu_id, plan_id)
);
```

**Responsabilidade**: Admin Global (CRUD completo)
**Lógica**: Se um menu está vinculado a um plano, ele só aparece para empresas com aquele plano ativo.

---

### 3. Tabela: `menu_role_permissions`
Permissões de menu por role (função) por empresa.

```sql
CREATE TABLE public.menu_role_permissions (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  menu_id UUID REFERENCES menus(id) ON DELETE CASCADE,
  role_type_id INTEGER REFERENCES role_types(id) ON DELETE CASCADE,
  has_access BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(company_id, menu_id, role_type_id)
);
```

**Responsabilidade**: Proprietário da empresa (CRUD completo)
**Lógica**: Define quais roles têm acesso a quais menus na empresa específica.

---

## 🔐 Políticas RLS (Row Level Security)

### `menus`
- **SELECT**: Todos os usuários autenticados podem ver menus ativos
- **INSERT/UPDATE/DELETE**: Apenas Admin Global

### `menu_plans`
- **SELECT**: Todos os usuários autenticados podem ver
- **INSERT/UPDATE/DELETE**: Apenas Admin Global

### `menu_role_permissions`
- **SELECT**: Usuários podem ver permissões de suas empresas
- **INSERT/UPDATE/DELETE**: Apenas Proprietários/Admins da empresa

---

## 🎯 Fluxo de Funcionamento

### 1. Admin Global cria menu
```
Admin Global → MenuManagementPage
  → Cria menu (ex: "Dashboard")
  → Vincula a planos (ex: "Plano Básico", "Plano Premium")
```

### 2. Proprietário configura permissões
```
Proprietário → MenuPermissionsPage
  → Seleciona empresa
  → Para cada menu disponível no plano da empresa:
    → Define quais roles têm acesso
    → Ex: "Dashboard" → Gerente ✅, Colaborador ❌
```

### 3. Sistema filtra menus no frontend
```
MainApplication → useMenuItems hook
  → Busca menus do plano ativo da empresa
  → Filtra por permissões da role do usuário
  → Exibe apenas menus permitidos
```

---

## 📁 Estrutura de Arquivos

```
supabase/migrations/
  ├── 20250130_create_menu_system.sql          # Criação de tabelas
  └── 20250130_create_menu_system_rls.sql      # Políticas RLS

src/
  ├── pages/
  │   ├── MenuManagementPage.tsx               # Admin Global: CRUD de menus
  │   └── MenuPermissionsPage.tsx              # Proprietário: Permissões por role
  ├── hooks/
  │   └── useMenuItems.ts                       # Hook para buscar menus dinamicamente
  └── components/
      └── MainApplication.tsx                  # Integração com menu dinâmico
```

---

## 🔄 Lógica de Filtro de Menus

### Hook: `useMenuItems`

```typescript
// 1. Buscar plano ativo da empresa
const activePlan = await getActivePlan(companyId);

// 2. Buscar menus vinculados ao plano
const menus = await getMenusByPlan(activePlan.id);

// 3. Buscar permissões da role do usuário
const permissions = await getMenuPermissions(companyId, userRoleId);

// 4. Filtrar menus permitidos
const allowedMenus = menus.filter(menu => 
  permissions[menu.id]?.has_access === true
);

// 5. Ordenar por display_order
return allowedMenus.sort((a, b) => a.display_order - b.display_order);
```

---

## 🎨 Interface do Usuário

### Admin Global: MenuManagementPage
- **Card no AdminDashboard**: "Gestão de Menus"
- **Funcionalidades**:
  - Listar todos os menus
  - Criar novo menu
  - Editar menu existente
  - Deletar menu
  - Vincular/desvincular menus a planos
  - Definir ordem de exibição

### Proprietário: MenuPermissionsPage
- **Card no Dashboard**: "Permissões de Menu"
- **Funcionalidades**:
  - Listar menus disponíveis no plano da empresa
  - Para cada menu, definir quais roles têm acesso
  - Interface tipo matriz: Menu × Role (Checkbox)

---

## 🚀 Ordem de Implementação

1. ✅ Criar migrations (tabelas + RLS)
2. ✅ Criar MenuManagementPage (Admin Global)
3. ✅ Criar MenuPermissionsPage (Proprietário)
4. ✅ Criar hook useMenuItems
5. ✅ Integrar no MainApplication
6. ✅ Adicionar cards nos dashboards
7. ✅ Adicionar rotas no App.tsx

---

## 📝 Exemplo de Uso

### Admin Global cria menu "Relatórios Avançados"
```sql
INSERT INTO menus (menu_key, label, icon, path, display_order)
VALUES ('relatorios-avancados', 'Relatórios Avançados', 'fas fa-chart-pie', '/relatorios/avancados', 10);

-- Vincular apenas ao Plano Premium
INSERT INTO menu_plans (menu_id, plan_id)
SELECT m.id, p.id
FROM menus m, subscription_plans p
WHERE m.menu_key = 'relatorios-avancados'
  AND p.name = 'Premium';
```

### Proprietário permite acesso apenas para Gerente
```sql
INSERT INTO menu_role_permissions (company_id, menu_id, role_type_id, has_access)
SELECT 
  'company-uuid',
  m.id,
  rt.id,
  CASE WHEN rt.description = 'Gerente' THEN true ELSE false END
FROM menus m, role_types rt
WHERE m.menu_key = 'relatorios-avancados'
  AND rt.description IN ('Gerente', 'Colaborador');
```

---

## ⚠️ Considerações Importantes

1. **Performance**: Índices criados em todas as FKs e campos de filtro
2. **Segurança**: RLS em todas as tabelas
3. **Integridade**: Constraints UNIQUE para evitar duplicatas
4. **Cascata**: DELETE CASCADE para manter consistência
5. **Cache**: Menus podem ser cacheados no frontend, mas devem ser invalidados ao alterar permissões

---

## 🔍 Validações

- Menu deve ter `menu_key` único
- `path` deve ser válido (começar com `/`)
- `display_order` deve ser numérico
- `menu_plans` não pode ter duplicatas (menu_id, plan_id)
- `menu_role_permissions` não pode ter duplicatas (company_id, menu_id, role_type_id)

