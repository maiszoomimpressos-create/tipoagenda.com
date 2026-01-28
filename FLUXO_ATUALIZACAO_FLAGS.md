# 🔄 Fluxo de Atualização de Flags Após Pagamento

## 📍 **Momento Exato da Atualização**

O flag `whatsapp_messaging_enabled` é atualizado **AUTOMATICAMENTE e IMEDIATAMENTE** após o pagamento ser aprovado pelo Mercado Pago, no momento em que a assinatura é ativada.

---

## 🔀 Fluxo Completo Passo a Passo

### **1. Usuário Seleciona Plano e Inicia Pagamento**
```
Frontend: SubscriptionPlansPage.tsx
  ↓
Usuário clica em "Assinar" no plano
  ↓
Edge Function: apply-coupon-and-subscribe
  ↓
Cria preferência de pagamento no Mercado Pago
  ↓
Redireciona usuário para checkout do Mercado Pago
```

### **2. Usuário Efetua Pagamento no Mercado Pago**
```
Mercado Pago processa o pagamento
  ↓
Pagamento aprovado (status: "approved")
  ↓
Mercado Pago envia webhook para sua aplicação
```

### **3. Webhook Recebe Notificação de Pagamento Aprovado**
```
Edge Function: mercadopago-webhook/index.ts
  ↓
Recebe notificação do Mercado Pago
  ↓
Verifica se payment.status === 'approved'
```

### **4. Ativação da Assinatura** ⚡
```
Edge Function: mercadopago-webhook/index.ts
  ↓
Atualiza/Cria assinatura com status = 'active'
  ↓
Linha 162-169: UPDATE company_subscriptions SET status = 'active'
OU
Linha 231-241: INSERT nova assinatura com status = 'active'
```

### **5. SINCRONIZAÇÃO DOS FLAGS** ✅ **AQUI É ONDE ACONTECE!**
```
Imediatamente após ativar a assinatura:
  ↓
Linha 174-187: Chama sync_company_flags_from_plan()
  ↓
Função SQL: sync_company_flags_from_plan(company_id, plan_id)
  ↓
Busca funcionalidades do plano que têm company_flag_name
  ↓
Se encontrar "whatsapp_messaging_enabled":
  ↓
UPDATE companies 
SET whatsapp_messaging_enabled = true 
WHERE id = company_id
```

### **6. Resultado Final**
```
✅ Flag atualizado na tabela companies
✅ Menu de WhatsApp habilitado para a empresa
✅ Sincronização completa em segundos após pagamento
```

---

## ⏱️ **Timeline de Execução**

```
T+0s    → Usuário efetua pagamento no Mercado Pago
T+1-2s  → Mercado Pago processa pagamento
T+2-3s  → Webhook recebe notificação
T+3-4s  → Assinatura é ativada (status = 'active')
T+4-5s  → ⚡ FLAG É ATUALIZADO AQUI ⚡
T+5-6s  → Usuário retorna para aplicação
T+6s+   → Menu de WhatsApp já está habilitado!
```

---

## 📂 **Onde Está Implementado**

### **Edge Function: mercadopago-webhook**
**Arquivo:** `supabase/functions/mercadopago-webhook/index.ts`

**3 pontos de sincronização:**

1. **Linha 174-187** - Quando ativa assinatura pendente:
```typescript
// Sincronizar flags da empresa baseado nas funcionalidades do plano
try {
    const { error: syncError } = await supabaseAdmin.rpc('sync_company_flags_from_plan', {
        p_company_id: companyId,
        p_plan_id: planId
    });
    // ...
}
```

2. **Linha 215-228** - Quando estende assinatura ativa existente:
```typescript
// Sincronizar flags da empresa baseado nas funcionalidades do plano
try {
    const { error: syncError } = await supabaseAdmin.rpc('sync_company_flags_from_plan', {
        p_company_id: companyId,
        p_plan_id: planId
    });
    // ...
}
```

3. **Linha 247-260** - Quando cria nova assinatura ativa:
```typescript
// Sincronizar flags da empresa baseado nas funcionalidades do plano
try {
    const { error: syncError } = await supabaseAdmin.rpc('sync_company_flags_from_plan', {
        p_company_id: companyId,
        p_plan_id: planId
    });
    // ...
}
```

### **Função SQL de Sincronização**
**Arquivo:** `supabase/migrations/20250127_sync_company_flags_from_plan.sql`

**Função:** `sync_company_flags_from_plan(p_company_id UUID, p_plan_id UUID)`

**O que faz:**
1. Busca todas as funcionalidades do plano que têm `company_flag_name` definido
2. Para cada flag encontrado, atualiza `companies.flag_name = true`
3. Desabilita flags que não estão mais no plano

---

## 🔍 **Como Verificar se Funcionou**

### **1. Verificar Logs da Edge Function**
No Supabase Dashboard → Edge Functions → mercadopago-webhook → Logs:
```
Flags sincronizados para empresa {company_id} com plano {plan_id}
```

### **2. Verificar no Banco de Dados**
```sql
-- Verificar flag da empresa
SELECT id, name, whatsapp_messaging_enabled 
FROM companies 
WHERE id = 'uuid-da-empresa';

-- Verificar assinatura ativa
SELECT cs.*, sp.name as plan_name
FROM company_subscriptions cs
JOIN subscription_plans sp ON cs.plan_id = sp.id
WHERE cs.company_id = 'uuid-da-empresa'
  AND cs.status = 'active'
ORDER BY cs.start_date DESC
LIMIT 1;

-- Verificar funcionalidades do plano
SELECT f.name, f.company_flag_name
FROM plan_features pf
JOIN features f ON pf.feature_id = f.id
WHERE pf.plan_id = 'uuid-do-plano'
  AND f.company_flag_name IS NOT NULL;
```

### **3. Verificar na Interface**
- Acesse a página de mensagens WhatsApp
- Se o flag estiver habilitado, o menu deve aparecer
- Se não aparecer, verifique se o flag está `true` no banco

---

## ⚠️ **Cenários Especiais**

### **Cenário 1: Pagamento Pendente**
- Assinatura é criada com `status = 'pending'`
- Flag **NÃO é atualizado** ainda
- Quando pagamento for aprovado → webhook ativa → flag é atualizado

### **Cenário 2: Cupom de Desconto (Preço = 0)**
- Edge Function: `apply-coupon-and-subscribe`
- Assinatura é ativada imediatamente (sem pagamento)
- Flag é atualizado na linha 80-94 da função `handleSubscription`

### **Cenário 3: Renovação de Assinatura**
- Webhook recebe pagamento de renovação
- Assinatura existente é estendida (UPDATE)
- Flag é atualizado novamente (linha 215-228)

### **Cenário 4: Mudança de Plano**
- Usuário muda de plano (upgrade/downgrade)
- Nova assinatura é criada ou existente é atualizada
- Flag é atualizado baseado no novo plano

---

## 🐛 **Troubleshooting**

### **Problema: Flag não foi atualizado após pagamento**

**Verificações:**
1. ✅ Assinatura foi criada/ativada? (`company_subscriptions.status = 'active'`)
2. ✅ Plano tem a funcionalidade com flag? (`features.company_flag_name = 'whatsapp_messaging_enabled'`)
3. ✅ Funcionalidade está associada ao plano? (`plan_features` tem registro)
4. ✅ Logs da Edge Function mostram erro?
5. ✅ Função SQL foi criada? (`sync_company_flags_from_plan` existe)

**Solução Manual (se necessário):**
```sql
-- Sincronizar manualmente para uma empresa
SELECT sync_company_flags_from_plan(
    'uuid-da-empresa'::UUID,
    'uuid-do-plano'::UUID
);
```

### **Problema: Flag foi atualizado mas menu não aparece**

**Verificações:**
1. ✅ Frontend está verificando o flag corretamente?
2. ✅ Cache do navegador? (Fazer hard refresh: Ctrl+Shift+R)
3. ✅ Sessão do usuário está atualizada?

---

## ✅ **Resumo**

- **Quando:** Imediatamente após pagamento ser aprovado e assinatura ativada
- **Onde:** Edge Function `mercadopago-webhook` → Função SQL `sync_company_flags_from_plan`
- **Tempo:** 4-5 segundos após pagamento
- **Automático:** Sim, não requer intervenção manual
- **Confiável:** Sim, com tratamento de erros (não quebra o fluxo se falhar)

