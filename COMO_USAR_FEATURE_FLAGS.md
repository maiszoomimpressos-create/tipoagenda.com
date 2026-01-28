# 📋 Como Usar o Sistema de Flags de Funcionalidades

**Data:** 27/01/2025  
**Status:** ✅ Implementação Completa

---

## 🎯 Objetivo

Este sistema permite que você defina quais funcionalidades de um plano controlam flags específicos na tabela `companies`. Quando uma empresa tem uma assinatura ativa com um plano que contém uma funcionalidade com flag definido, o sistema automaticamente atualiza o flag correspondente na tabela `companies`.

---

## 📊 Como Funciona

### 1. **Estrutura de Dados**

A tabela `features` agora possui um campo adicional:
- `company_flag_name` (TEXT, nullable): Nome do flag na tabela `companies` que esta funcionalidade controla

**Exemplo:**
```
Funcionalidade: "Envio de Mensagens WhatsApp"
  - name: "Envio de Mensagens WhatsApp"
  - slug: "whatsapp-messaging"
  - company_flag_name: "whatsapp_messaging_enabled" ← Define qual flag controla
```

### 2. **Fluxo Automático**

Quando uma assinatura é criada ou atualizada:
1. O sistema busca todas as funcionalidades do plano
2. Verifica quais têm `company_flag_name` definido
3. Atualiza automaticamente os flags correspondentes na tabela `companies`
4. Desabilita flags que não estão mais no plano

---

## 🖥️ Como Usar na Interface

### Passo 1: Criar/Editar Funcionalidade

1. Acesse **Admin Dashboard > Planos > Gerenciar Funcionalidades do Plano**
2. Clique em **"Adicionar Funcionalidade"**
3. Preencha:
   - **Nome da Funcionalidade**: Ex: "Envio de Mensagens WhatsApp"
   - **Descrição**: Descrição da funcionalidade
   - **Controla Flag da Empresa**: Selecione o flag (ex: `whatsapp_messaging_enabled`)
   - **Limite**: (opcional) Limite de uso

### Passo 2: Visualizar Funcionalidades com Flags

Na lista de funcionalidades do plano, você verá um **badge** indicando quando uma funcionalidade controla um flag:

```
┌─────────────────────────────────────────────┐
│ Envio de Mensagens WhatsApp                 │
│ [Badge: Controla: whatsapp_messaging_enabled] │
│ Descrição: Permite o envio de mensagens...  │
└─────────────────────────────────────────────┘
```

### Passo 3: Adicionar a Funcionalidade ao Plano

Ao adicionar uma funcionalidade que tem `company_flag_name` definido a um plano:
- Todas as empresas com esse plano terão o flag automaticamente habilitado
- Quando uma nova empresa assina esse plano, o flag é habilitado automaticamente

---

## 🔧 Flags Disponíveis

Atualmente, os seguintes flags estão disponíveis:

| Flag | Descrição |
|------|-----------|
| `whatsapp_messaging_enabled` | Habilita o módulo de envio de mensagens WhatsApp |

**Para adicionar novos flags:**
1. Adicione o campo na tabela `companies` (via migration)
2. Atualize a função `sync_company_flags_from_plan` em `supabase/migrations/20250127_sync_company_flags_from_plan.sql`
3. Adicione a opção no dropdown do modal de funcionalidades em `src/pages/PlanFeaturesManagementPage.tsx`

---

## 🚀 Exemplo Prático

### Cenário: Adicionar WhatsApp ao Plano Full

1. **Criar/Editar Funcionalidade:**
   - Nome: "Envio de Mensagens WhatsApp"
   - Flag: `whatsapp_messaging_enabled`

2. **Adicionar ao Plano Full:**
   - Vá em "Gerenciar Funcionalidades do Plano: Plano Full"
   - Adicione a funcionalidade "Envio de Mensagens WhatsApp"

3. **Resultado Automático:**
   - Todas as empresas com assinatura ativa do "Plano Full" terão `whatsapp_messaging_enabled = true`
   - Novas empresas que assinarem o "Plano Full" terão o flag habilitado automaticamente

### Cenário: Promoção - Adicionar WhatsApp a Múltiplos Planos

1. **Editar cada plano:**
   - Plano Básico: Adicionar "Envio de Mensagens WhatsApp"
   - Plano Premium: Adicionar "Envio de Mensagens WhatsApp"
   - Plano Full: Adicionar "Envio de Mensagens WhatsApp"

2. **Resultado:**
   - Todas as empresas com qualquer um desses planos terão o WhatsApp habilitado

---

## 🔄 Sincronização Automática

A sincronização acontece automaticamente quando:

1. **Nova assinatura é criada** (via `apply-coupon-and-subscribe` ou `mercadopago-webhook`)
2. **Assinatura é atualizada** (mudança de plano ou renovação)
3. **Assinatura é ativada** (após pagamento)

**Onde está implementado:**
- `supabase/functions/apply-coupon-and-subscribe/index.ts`
- `supabase/functions/mercadopago-webhook/index.ts`

**Função SQL:**
- `sync_company_flags_from_plan(company_id, plan_id)` em `supabase/migrations/20250127_sync_company_flags_from_plan.sql`

---

## 📝 Notas Importantes

1. **Flags são atualizados automaticamente**: Não é necessário fazer nada manualmente após adicionar a funcionalidade ao plano.

2. **Remoção de funcionalidade**: Se você remover uma funcionalidade com flag de um plano, o flag será desabilitado para empresas com esse plano.

3. **Múltiplos planos**: Se uma empresa tiver múltiplas assinaturas, o sistema usa a mais recente ativa.

4. **Erros não críticos**: Se a sincronização de flags falhar, o erro é logado mas não impede a criação/atualização da assinatura.

---

## 🛠️ Arquivos Modificados/Criados

### Migrations:
- `supabase/migrations/20250127_add_company_flag_to_features.sql` - Adiciona coluna `company_flag_name`
- `supabase/migrations/20250127_sync_company_flags_from_plan.sql` - Função de sincronização

### Frontend:
- `src/pages/PlanFeaturesManagementPage.tsx` - Interface atualizada com campo de flag e badge visual

### Backend (Edge Functions):
- `supabase/functions/apply-coupon-and-subscribe/index.ts` - Integração de sincronização
- `supabase/functions/mercadopago-webhook/index.ts` - Integração de sincronização

---

## ✅ Próximos Passos (Opcional)

1. **Adicionar mais flags**: Conforme novas funcionalidades forem criadas
2. **Trigger automático**: Descomentar o trigger em `20250127_sync_company_flags_from_plan.sql` se quiser sincronização via trigger (atualmente é via Edge Functions)
3. **Interface de gerenciamento de flags**: Criar uma página para visualizar/editar flags de todas as empresas

---

## 🐛 Troubleshooting

**Problema**: Flag não está sendo atualizado após adicionar funcionalidade ao plano
- **Solução**: Verifique se a assinatura da empresa está ativa (`status = 'active'`)
- Verifique os logs das Edge Functions para erros de sincronização

**Problema**: Flag não aparece no dropdown
- **Solução**: Adicione o flag manualmente no código em `PlanFeaturesManagementPage.tsx` (linha do Select)

**Problema**: Erro ao criar funcionalidade
- **Solução**: Certifique-se de que a migration `20250127_add_company_flag_to_features.sql` foi executada

