# 📋 Respostas às Dúvidas: Limite de Colaboradores (Opção 3)

## 🎯 Suas Dúvidas Respondidas

### **1. Onde ficará o cadastro para controle de quantidade de cadastros por planos?**

#### 📍 Localização da Interface

A interface de gerenciamento de limites ficará em **duas opções** (você escolhe qual prefere):

#### **OPÇÃO A: Integrada na Página de Funcionalidades do Plano** (RECOMENDADA)

**Localização**: `/admin-dashboard/plans/:planId/features`

**Como funciona**:
- Você já tem a página `PlanFeaturesManagementPage.tsx` que gerencia funcionalidades de planos
- Adicionaremos uma **nova seção** nesta mesma página para gerenciar limites
- Ficará visualmente separada, mas no mesmo lugar

**Estrutura Visual Proposta**:
```
┌─────────────────────────────────────────────────┐
│  Gerenciar Funcionalidades do Plano: Premium     │
├─────────────────────────────────────────────────┤
│                                                  │
│  📋 FUNCIONALIDADES DO PLANO                    │
│  [Lista de funcionalidades existente]           │
│                                                  │
│  ─────────────────────────────────────────────  │
│                                                  │
│  ⚙️ LIMITES DO PLANO                            │
│  [Nova seção para gerenciar limites]            │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ Tipo de Limite    │ Valor Atual          │  │
│  ├──────────────────────────────────────────┤  │
│  │ Colaboradores     │ 5 colaboradores      │  │
│  │ Serviços          │ Ilimitado            │  │
│  │ Clientes          │ Ilimitado            │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  [➕ Adicionar Limite] [✏️ Editar] [🗑️ Remover] │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Vantagens**:
- ✅ Tudo em um só lugar (funcionalidades + limites)
- ✅ Contexto claro (você vê o plano completo)
- ✅ Menos navegação entre páginas

---

#### **OPÇÃO B: Página Dedicada de Limites**

**Localização**: `/admin-dashboard/plans/:planId/limits`

**Como funciona**:
- Nova página dedicada apenas para gerenciar limites
- Acesso via botão "Gerenciar Limites" na página de planos
- Similar à página de funcionalidades, mas focada em limites

**Estrutura Visual Proposta**:
```
┌─────────────────────────────────────────────────┐
│  ← Voltar    Limites do Plano: Premium          │
├─────────────────────────────────────────────────┤
│                                                  │
│  📊 Limites Configurados                        │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ Tipo de Limite    │ Valor    │ Ações     │  │
│  ├──────────────────────────────────────────┤  │
│  │ 👥 Colaboradores  │ 5        │ [✏️] [🗑️] │  │
│  │ 📦 Serviços       │ ∞        │ [✏️] [🗑️] │  │
│  │ 👤 Clientes       │ ∞        │ [✏️] [🗑️] │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  [➕ Adicionar Novo Limite]                      │
│                                                  │
│  ℹ️ Dica: Deixe o valor em branco ou 0 para     │
│     permitir quantidade ilimitada.               │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Vantagens**:
- ✅ Foco total em limites
- ✅ Interface mais limpa
- ✅ Fácil de expandir no futuro

---

### **2. Quem poderá inserir e alterar essa tela de configuração?**

#### 🔐 Sistema de Permissões

**Apenas Global Admin** poderá gerenciar limites de planos.

#### Como Funciona:

**1. Proteção de Rota (Frontend)**
```typescript
// Já existe no sistema
<Route 
  path="/admin-dashboard/plans/:planId/features" 
  element={
    <GlobalAdminProtectedRoute>
      <PlanFeaturesManagementPage />
    </GlobalAdminProtectedRoute>
  } 
/>
```

**2. Políticas RLS (Backend - Banco de Dados)**

A tabela `plan_limits` terá políticas RLS idênticas às outras tabelas de admin:

```sql
-- SELECT: Todos podem ver (para validações)
CREATE POLICY "authenticated_users_can_view_plan_limits" 
ON public.plan_limits
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Apenas Global Admin
CREATE POLICY "global_admin_can_insert_plan_limits" 
ON public.plan_limits
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.type_user tu
    WHERE tu.user_id = auth.uid()
      AND UPPER(tu.cod) IN (
        'GLOBAL_ADMIN', 
        'ADMIN_GLOBAL', 
        'ADMINISTRADOR_GLOBAL', 
        'SUPER_ADMIN'
      )
  )
);

-- UPDATE: Apenas Global Admin
CREATE POLICY "global_admin_can_update_plan_limits" 
ON public.plan_limits
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.type_user tu
    WHERE tu.user_id = auth.uid()
      AND UPPER(tu.cod) IN (
        'GLOBAL_ADMIN', 
        'ADMIN_GLOBAL', 
        'ADMINISTRADOR_GLOBAL', 
        'SUPER_ADMIN'
      )
  )
);

-- DELETE: Apenas Global Admin
CREATE POLICY "global_admin_can_delete_plan_limits" 
ON public.plan_limits
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.type_user tu
    WHERE tu.user_id = auth.uid()
      AND UPPER(tu.cod) IN (
        'GLOBAL_ADMIN', 
        'ADMIN_GLOBAL', 
        'ADMINISTRADOR_GLOBAL', 
        'SUPER_ADMIN'
      )
  )
);
```

**3. Validação no Frontend (Hook)**

```typescript
// Já existe no sistema
const { isGlobalAdmin } = useIsGlobalAdmin();

if (!isGlobalAdmin) {
  // Redireciona ou esconde botões
  return <Navigate to="/" replace />;
}
```

#### Resumo de Permissões:

| Ação | Quem Pode | Como é Protegido |
|------|-----------|------------------|
| **Ver limites** | Todos autenticados | RLS permite SELECT |
| **Criar limite** | Apenas Global Admin | RLS + Frontend check |
| **Editar limite** | Apenas Global Admin | RLS + Frontend check |
| **Deletar limite** | Apenas Global Admin | RLS + Frontend check |

**Proprietários, Colaboradores e outros usuários NÃO terão acesso** a essa interface.

---

### **3. Você poderá incluir futuramente um novo plano para grandes empresas e o sistema já estará respeitando essa nova configuração?**

#### ✅ SIM! Totalmente Flexível e Escalável

A **Opção 3 (Tabela Dedicada de Limites)** foi escolhida justamente por ser a mais flexível para o futuro.

#### Como Funciona:

**1. Estrutura da Tabela `plan_limits`**

```sql
CREATE TABLE public.plan_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  limit_type TEXT NOT NULL, -- 'collaborators', 'services', 'clients', etc
  limit_value INTEGER NOT NULL, -- NULL ou 0 = ilimitado
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, limit_type) -- Um plano só pode ter um limite de cada tipo
);
```

**2. Fluxo para Novo Plano**

Quando você criar um novo plano "Enterprise" no futuro:

```
Passo 1: Criar o plano
  → Admin Dashboard > Planos > Novo Plano
  → Preencher: Nome, Preço, Descrição, etc.
  → Salvar

Passo 2: Configurar limites (se necessário)
  → Admin Dashboard > Planos > [Enterprise] > Limites
  → Adicionar Limite: "Colaboradores" = 50
  → Adicionar Limite: "Serviços" = 100
  → Salvar

Passo 3: Sistema automaticamente respeita
  → Quando empresa assinar plano "Enterprise"
  → Sistema busca limites na tabela plan_limits
  → Aplica validação automaticamente
  → ✅ Funciona sem alterar código!
```

**3. Exemplo Prático: Plano Enterprise**

```sql
-- Criar novo plano
INSERT INTO subscription_plans (name, price, ...) 
VALUES ('Enterprise', 999.00, ...);

-- Configurar limites (após criar o plano)
INSERT INTO plan_limits (plan_id, limit_type, limit_value)
VALUES 
  ('uuid-do-plano-enterprise', 'collaborators', 50),
  ('uuid-do-plano-enterprise', 'services', 100),
  ('uuid-do-plano-enterprise', 'clients', 1000);
```

**4. Validação Automática**

A Edge Function `invite-collaborator` já buscará automaticamente:

```typescript
// Pseudocódigo da validação
async function validateCollaboratorLimit(companyId: string) {
  // 1. Buscar plano ativo da empresa
  const subscription = await getActiveSubscription(companyId);
  
  // 2. Buscar limite de colaboradores do plano
  const limit = await supabase
    .from('plan_limits')
    .select('limit_value')
    .eq('plan_id', subscription.plan_id)
    .eq('limit_type', 'collaborators')
    .single();
  
  // 3. Se não tem limite configurado → Ilimitado (permite)
  if (!limit || limit.limit_value === null || limit.limit_value === 0) {
    return { allowed: true };
  }
  
  // 4. Contar colaboradores ativos
  const count = await countActiveCollaborators(companyId);
  
  // 5. Validar
  if (count >= limit.limit_value) {
    return { 
      allowed: false, 
      message: `Limite de ${limit.limit_value} colaboradores atingido!` 
    };
  }
  
  return { allowed: true };
}
```

#### Vantagens da Opção 3 para Futuro:

✅ **Novos Tipos de Limites**: Fácil adicionar "limite de agendamentos", "limite de produtos", etc.
✅ **Novos Planos**: Qualquer plano novo pode ter limites configurados sem alterar código
✅ **Flexibilidade**: Cada plano pode ter limites diferentes ou ilimitado
✅ **Escalável**: Suporta quantos tipos de limites você quiser

#### Exemplo de Expansão Futura:

```sql
-- Adicionar novo tipo de limite (sem alterar estrutura)
INSERT INTO plan_limits (plan_id, limit_type, limit_value)
VALUES 
  ('uuid-plano', 'appointments_per_month', 500),
  ('uuid-plano', 'products', 200),
  ('uuid-plano', 'storage_gb', 10);
```

A validação continuará funcionando porque busca dinamicamente por `limit_type`.

---

## 📊 Resumo das Respostas

| Dúvida | Resposta |
|--------|----------|
| **Onde ficará o cadastro?** | Opção A: Integrado em `/admin-dashboard/plans/:planId/features`<br>Opção B: Página dedicada `/admin-dashboard/plans/:planId/limits` |
| **Quem pode inserir/alterar?** | **Apenas Global Admin** (protegido por RLS + Frontend) |
| **Novos planos funcionarão?** | **SIM!** Sistema totalmente flexível. Basta configurar limites após criar o plano. |

---

## 🎨 Mockup da Interface (Opção A - Integrada)

```
┌─────────────────────────────────────────────────────────────┐
│  ← Voltar    Gerenciar Funcionalidades: Premium             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📋 FUNCIONALIDADES DO PLANO                                │
│  [Lista existente de funcionalidades]                        │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ⚙️ LIMITES DO PLANO                                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Tipo de Limite      │ Valor Atual    │ Ações         │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 👥 Colaboradores    │ 5              │ [✏️ Editar]   │  │
│  │ 📦 Serviços         │ Ilimitado      │ [➕ Adicionar] │  │
│  │ 👤 Clientes         │ Ilimitado      │ [➕ Adicionar] │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  [➕ Adicionar Novo Limite]                                  │
│                                                              │
│  ℹ️ Configure limites para controlar o uso do plano.          │
│     Deixe em branco ou 0 para permitir ilimitado.           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo Completo de Uso

### Cenário: Criar Novo Plano "Enterprise"

1. **Global Admin acessa**: `/admin-dashboard/plans`
2. **Clica em "Novo Plano"**
3. **Preenche dados básicos**: Nome, Preço, Descrição
4. **Salva o plano**
5. **Clica em "Gerenciar Funcionalidades"** (ou "Limites")
6. **Adiciona limites**:
   - Colaboradores: 50
   - Serviços: 100
   - Clientes: 1000
7. **Salva**
8. **Sistema automaticamente aplica** quando empresas assinarem este plano

### Cenário: Empresa Assina Plano "Enterprise"

1. **Empresa assina** o plano "Enterprise"
2. **Sistema busca limites** na tabela `plan_limits` para este plano
3. **Aplica validações** automaticamente
4. **Bloqueia criação** de colaboradores além de 50
5. **Mostra mensagens** claras quando limite atingido

---

## ✅ Conclusão

A **Opção 3** atende perfeitamente suas necessidades:

- ✅ **Interface clara** para gerenciar limites (integrados ou dedicados)
- ✅ **Apenas Global Admin** pode configurar (totalmente seguro)
- ✅ **Totalmente flexível** para novos planos e tipos de limites
- ✅ **Escalável** para o futuro sem alterar código

**Pronto para implementar quando você decidir!** 🚀

---

## ❓ Próximas Decisões

Antes de implementar, preciso saber:

1. **Prefere Opção A (integrada)** ou **Opção B (página dedicada)** para a interface?
2. **Quais limites iniciais** você quer configurar para os planos atuais?
3. **Quer começar apenas com colaboradores** ou já configurar outros limites também?

Aguardando suas respostas para iniciar a implementação! 💪

