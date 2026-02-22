# 🏗️ Proposta Arquitetural: Limite de Colaboradores por Plano

## 📋 Contexto do Problema

Atualmente, clientes podem cadastrar **quantidade ilimitada de colaboradores**, independente do plano contratado. Isso permite que clientes contratem o plano mais barato e cadastrem muitos colaboradores, prejudicando a estratégia de monetização e diferenciação de planos.

---

## 🎯 Objetivos da Solução

1. **Limitar colaboradores** por plano de forma clara e transparente
2. **Forçar upgrade** quando o limite for atingido
3. **Melhorar ticket médio** incentivando planos superiores
4. **Manter UX positiva** com avisos e CTAs claros

---

## 🏛️ Análise Arquitetural

### Situação Atual

- ✅ Tabela `subscription_plans` existe (planos de assinatura)
- ✅ Tabela `company_subscriptions` vincula empresa → plano
- ✅ Tabela `collaborators` armazena colaboradores
- ✅ Edge Function `invite-collaborator` cria colaboradores
- ❌ **Não existe campo de limite** na tabela `subscription_plans`
- ❌ **Não existe validação** de limite ao criar colaborador

---

## 💡 Soluções Propostas

### **OPÇÃO 1: Campo Direto na Tabela `subscription_plans` (RECOMENDADA)**

#### Arquitetura

**1.1. Estrutura de Dados**

```sql
-- Adicionar coluna na tabela subscription_plans
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS max_collaborators INTEGER DEFAULT NULL;

-- Comentário
COMMENT ON COLUMN public.subscription_plans.max_collaborators IS 
'Limite máximo de colaboradores ativos permitidos no plano. NULL = ilimitado.';
```

**1.2. Validação na Edge Function**

- **Local**: `supabase/functions/invite-collaborator/index.ts`
- **Quando**: Antes de criar o colaborador
- **Lógica**:
  1. Buscar plano ativo da empresa (`company_subscriptions`)
  2. Buscar `max_collaborators` do plano
  3. Contar colaboradores ativos da empresa (`collaborators` WHERE `is_active = true`)
  4. Se `count >= max_collaborators` → **BLOQUEAR** e retornar erro
  5. Se `count < max_collaborators` → **PERMITIR** criação

**1.3. Validação no Frontend (Opcional - UX)**

- **Local**: `src/pages/CollaboratorFormPage.tsx`
- **Quando**: Ao abrir o formulário de cadastro
- **Lógica**: Verificar limite e mostrar aviso se próximo do limite

#### Vantagens ✅
- **Simples**: Uma coluna, validação direta
- **Performática**: Query rápida (COUNT)
- **Flexível**: NULL = ilimitado, permite diferentes limites por plano
- **Escalável**: Fácil adicionar outros limites (ex: `max_services`, `max_clients`)

#### Desvantagens ⚠️
- Requer migração de dados (definir limites para planos existentes)
- Precisa atualizar planos existentes manualmente

---

### **OPÇÃO 2: Sistema de Features com Limites**

#### Arquitetura

**2.1. Estrutura de Dados**

Usar a tabela `features` existente com campo `limit`:

```sql
-- Adicionar coluna limit na tabela features (se não existir)
ALTER TABLE public.features
ADD COLUMN IF NOT EXISTS limit_value INTEGER DEFAULT NULL;

-- Criar feature "Colaboradores" se não existir
INSERT INTO public.features (name, slug, limit_value)
VALUES ('Colaboradores', 'collaborators', NULL)
ON CONFLICT (slug) DO UPDATE SET limit_value = EXCLUDED.limit_value;
```

**2.2. Validação**

- Buscar feature "collaborators" do plano ativo
- Verificar `limit_value`
- Contar colaboradores ativos
- Comparar e bloquear se necessário

#### Vantagens ✅
- **Reutiliza infraestrutura existente** (sistema de features)
- **Consistente** com outros limites (WhatsApp, etc)
- **Flexível** para múltiplos tipos de limites

#### Desvantagens ⚠️
- Mais complexo (requer JOIN com `plan_features` e `features`)
- Menos direto que Opção 1
- Pode ser confuso se feature não tiver limite definido

---

### **OPÇÃO 3: Tabela Dedicada de Limites**

#### Arquitetura

**3.1. Estrutura de Dados**

```sql
CREATE TABLE public.plan_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  limit_type TEXT NOT NULL, -- 'collaborators', 'services', 'clients', etc
  limit_value INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, limit_type)
);
```

#### Vantagens ✅
- **Muito flexível**: Suporta múltiplos tipos de limites
- **Escalável**: Fácil adicionar novos limites
- **Normalizado**: Separação de responsabilidades

#### Desvantagens ⚠️
- **Mais complexo**: Requer nova tabela e JOINs
- **Overhead**: Pode ser excessivo se só precisar de um limite
- **Manutenção**: Mais uma tabela para gerenciar

---

## 🎨 Experiência do Usuário (UX)

### Cenário 1: Tentativa de Cadastrar Colaborador Além do Limite

**Comportamento:**
1. Usuário tenta cadastrar colaborador
2. Sistema valida limite antes de criar
3. Se exceder → **Bloquear** e mostrar mensagem clara:

```
❌ Limite de colaboradores atingido!

Seu plano atual permite até X colaboradores ativos.
Você já possui X colaboradores cadastrados.

💡 Faça upgrade do seu plano para cadastrar mais colaboradores.
[Ver Planos] [Fechar]
```

4. Botão "Ver Planos" → redireciona para `/planos` com highlight do próximo plano

### Cenário 2: Aviso Preventivo (Quando Próximo do Limite)

**Comportamento:**
- Quando estiver em **80% do limite** → Mostrar banner de aviso
- Quando estiver em **100% do limite** → Bloquear completamente

**Exemplo de Banner:**
```
⚠️ Você está próximo do limite de colaboradores!

Seu plano permite X colaboradores. Você já tem Y ativos.
[Fazer Upgrade] [Fechar]
```

### Cenário 3: Exibição do Limite na Página de Colaboradores

**Comportamento:**
- Mostrar contador: "X de Y colaboradores" (ex: "3 de 5 colaboradores")
- Barra de progresso visual
- Badge de status (Verde: OK, Amarelo: Próximo, Vermelho: Limite)

---

## 📊 Estratégia de Negócio

### Recomendações de Limites por Plano

| Plano | Limite Sugerido | Justificativa |
|-------|----------------|---------------|
| **Premium** (Básico) | **1-2 colaboradores** | Para profissionais autônomos |
| **Platinum** (Intermediário) | **3-5 colaboradores** | Para pequenas equipes |
| **Full** (Avançado) | **10+ colaboradores** | Para empresas maiores |
| **Enterprise** (Futuro) | **Ilimitado** | Para grandes empresas |

### Estratégia de Upgrade

1. **Bloqueio Total**: Não permitir criar além do limite
2. **CTA Claro**: Botão "Fazer Upgrade" sempre visível quando próximo/atingido
3. **Incentivo**: Mostrar benefícios do próximo plano
4. **Transição Suave**: Permitir upgrade sem perder dados

---

## 🔧 Implementação Técnica Recomendada

### **ESCOLHA: OPÇÃO 1 (Campo Direto)**

**Motivos:**
- ✅ **KISS**: Solução mais simples e direta
- ✅ **Performance**: Query única, sem JOINs complexos
- ✅ **Manutenibilidade**: Fácil entender e modificar
- ✅ **Escalável**: Pode adicionar outros campos depois se necessário

### Plano de Implementação

#### **Fase 1: Estrutura de Dados**
1. Adicionar coluna `max_collaborators` em `subscription_plans`
2. Criar migração SQL
3. Definir limites iniciais para planos existentes

#### **Fase 2: Validação Backend**
1. Modificar Edge Function `invite-collaborator`
2. Adicionar validação antes de criar colaborador
3. Retornar erro claro quando limite atingido

#### **Fase 3: Validação Frontend (Opcional)**
1. Hook `useCollaboratorLimit` para verificar limite
2. Banner de aviso quando próximo do limite
3. Bloqueio do botão "Novo Colaborador" quando limite atingido

#### **Fase 4: UX e Interface**
1. Contador de colaboradores na página de colaboradores
2. Barra de progresso visual
3. Modal de upgrade quando limite atingido
4. Link direto para página de planos

---

## 📝 Exemplo de Código (Pseudocódigo)

### Validação na Edge Function

```typescript
// 1. Buscar plano ativo da empresa
const { data: subscription } = await supabaseAdmin
  .from('company_subscriptions')
  .select('plan_id, subscription_plans(max_collaborators)')
  .eq('company_id', companyId)
  .eq('status', 'active')
  .single();

const maxCollaborators = subscription?.subscription_plans?.max_collaborators;

// 2. Se tem limite definido, validar
if (maxCollaborators !== null) {
  // 3. Contar colaboradores ativos
  const { count } = await supabaseAdmin
    .from('collaborators')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('is_active', true);

  // 4. Validar limite
  if (count >= maxCollaborators) {
    return new Response(JSON.stringify({
      error: `Limite de colaboradores atingido! Seu plano permite até ${maxCollaborators} colaboradores ativos. Você já possui ${count}. Faça upgrade do seu plano para cadastrar mais colaboradores.`,
      limit_reached: true,
      current_count: count,
      max_allowed: maxCollaborators,
      upgrade_url: '/planos'
    }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 5. Se passou na validação, continuar criação do colaborador...
```

---

## 🎯 Decisões Arquiteturais

### 1. **Onde Validar?**
- ✅ **Backend (Edge Function)**: Validação obrigatória e segura
- ✅ **Frontend (Opcional)**: Validação para melhor UX (mas não confiável)

### 2. **Como Contar?**
- ✅ **Apenas colaboradores ativos** (`is_active = true`)
- ✅ **Colaboradores inativos não contam** para o limite

### 3. **Comportamento ao Atingir Limite**
- ✅ **Bloquear criação** completamente
- ✅ **Mostrar mensagem clara** com CTA para upgrade
- ✅ **Permitir edição** de colaboradores existentes

### 4. **Comportamento ao Fazer Upgrade**
- ✅ **Limite aumenta automaticamente** (baseado no novo plano)
- ✅ **Não precisa recriar** colaboradores
- ✅ **Apenas contar novamente** com novo limite

---

## 📈 Impacto no Negócio

### Benefícios Esperados

1. **Aumento de Ticket Médio**
   - Clientes precisarão fazer upgrade para mais colaboradores
   - Incentiva planos superiores

2. **Diferenciação de Planos**
   - Planos básicos = menos colaboradores
   - Planos premium = mais colaboradores
   - Cria valor percebido

3. **Previsibilidade de Receita**
   - Clientes com mais colaboradores pagam mais
   - Alinhamento entre uso e pagamento

### Riscos e Mitigações

**Risco**: Clientes podem cancelar ao atingir limite
**Mitigação**: 
- Oferecer período de graça (ex: 7 dias) após atingir limite
- Mostrar valor do upgrade claramente
- Permitir upgrade fácil e rápido

---

## 🔄 Próximos Passos (Após Aprovação)

1. **Definir limites** para cada plano atual
2. **Criar migração SQL** para adicionar campo
3. **Implementar validação** na Edge Function
4. **Adicionar UX** no frontend (avisos, contadores)
5. **Testar cenários** (limite atingido, upgrade, etc)
6. **Documentar** para usuários finais

---

## ❓ Perguntas para Discussão

1. **Quais os limites ideais** para cada plano? (Premium, Platinum, Full)
2. **Devo contar colaboradores inativos** no limite ou apenas ativos?
3. **Devo permitir período de graça** após atingir limite?
4. **Como tratar empresas** que já têm mais colaboradores que o limite do plano atual?
5. **Devo aplicar limite retroativamente** ou apenas para novos cadastros?

---

## 📌 Resumo Executivo

**Solução Recomendada**: **OPÇÃO 1** - Campo `max_collaborators` na tabela `subscription_plans`

**Implementação**:
- ✅ Adicionar campo no banco
- ✅ Validar na Edge Function antes de criar
- ✅ Mostrar avisos e CTAs no frontend
- ✅ Permitir upgrade fácil

**Resultado Esperado**:
- 📈 Aumento de conversão para planos superiores
- 💰 Aumento do ticket médio
- 🎯 Melhor alinhamento entre uso e pagamento

---

**Aguardando sua aprovação e respostas às perguntas para iniciar a implementação!** 🚀

