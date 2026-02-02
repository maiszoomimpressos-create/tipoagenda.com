# ✅ Como Funciona: Menus Automáticos por Plano

## 🎯 Resposta Direta

**SIM!** Após cadastrar os menus e vincular aos planos, quando um proprietário/empresa fizer login, os menus **já aparecerão automaticamente** baseado no plano da empresa.

---

## 🔄 Fluxo Automático

### 1. **Login do Proprietário/Empresa**
```
Usuário faz login → Sistema identifica a empresa primária
```

### 2. **Sistema Busca o Plano Ativo**
```sql
SELECT plan_id 
FROM company_subscriptions 
WHERE company_id = [empresa_id] 
  AND status = 'active'
ORDER BY start_date DESC 
LIMIT 1
```

### 3. **Sistema Busca Menus do Plano**
```sql
SELECT menus.* 
FROM menu_plans 
JOIN menus ON menu_plans.menu_id = menus.id
WHERE menu_plans.plan_id = [plano_id]
  AND menus.is_active = true
```

### 4. **Sistema Filtra por Permissões (Opcional)**
```sql
SELECT menu_id, has_access
FROM menu_role_permissions
WHERE company_id = [empresa_id]
  AND role_type_id = [role_do_usuario]
  AND menu_id IN ([menus_do_plano])
```

### 5. **Sistema Exibe os Menus**
- Apenas menus do plano ativo
- Apenas menus permitidos para a role do usuário
- Ordenados por `display_order`

---

## 📋 Checklist para Funcionar

Para que os menus apareçam automaticamente, você precisa:

### ✅ Passo 1: Admin Global Cadastrou os Menus
- [ ] Menus criados na tabela `menus`
- [ ] Menus estão `is_active = true`

### ✅ Passo 2: Admin Global Vinculou aos Planos
- [ ] Menus vinculados aos planos na tabela `menu_plans`
- [ ] Exemplo: Menu "Dashboard" → Plano Básico, Plano Premium

### ✅ Passo 3: Empresa Tem Plano Ativo
- [ ] Empresa tem assinatura ativa em `company_subscriptions`
- [ ] Status da assinatura = `'active'`

### ✅ Passo 4: Proprietário Configurou Permissões (Opcional)
- [ ] Proprietário foi em "Permissões de Menu"
- [ ] Configurou quais roles têm acesso a cada menu
- [ ] Se não configurar, **todos os menus do plano aparecem para todos** (default: permitido)

---

## 🎯 Exemplo Prático

### Cenário:
1. **Admin Global cadastrou:**
   - Menu "Dashboard" → vinculado a "Plano Básico" e "Plano Premium"
   - Menu "Relatórios Avançados" → vinculado apenas a "Plano Premium"

2. **Empresa "Salão Beleza" tem:**
   - Plano ativo: "Plano Básico"

3. **Proprietário faz login:**
   - ✅ Vê: "Dashboard" (está no Plano Básico)
   - ❌ NÃO vê: "Relatórios Avançados" (só está no Plano Premium)

4. **Se a empresa mudar para "Plano Premium":**
   - ✅ Vê: "Dashboard" (está no Premium também)
   - ✅ Vê: "Relatórios Avançados" (agora está no Premium)

---

## ⚠️ Importante: Permissões por Role

### Com Permissões Configuradas:
- Proprietário configura: "Dashboard" → Gerente ✅, Colaborador ❌
- Gerente faz login → Vê "Dashboard"
- Colaborador faz login → NÃO vê "Dashboard"

### Sem Permissões Configuradas:
- **Default: Todos os menus do plano aparecem para todos**
- Se não configurar permissões, todos os usuários da empresa verão todos os menus do plano

---

## 🔍 Como Verificar se Está Funcionando

### 1. **Verificar no Console (F12)**
```
useMenuItems: Buscando menus...
useMenuItems: Plano encontrado: [plano_id]
useMenuItems: Menus encontrados: [array de menus]
```

### 2. **Verificar Visualmente**
- Login como proprietário
- Verificar se os menus aparecem no sidebar
- Verificar se apenas menus do plano aparecem

### 3. **Verificar no Banco**
```sql
-- Ver menus do plano
SELECT m.label, sp.name as plano
FROM menu_plans mp
JOIN menus m ON mp.menu_id = m.id
JOIN subscription_plans sp ON mp.plan_id = sp.id
WHERE sp.id = '[plano_id]';
```

---

## 🚨 Possíveis Problemas

### ❌ Menus não aparecem

**Causa 1: Empresa não tem plano ativo**
- Solução: Ativar um plano para a empresa

**Causa 2: Menus não estão vinculados ao plano**
- Solução: Admin Global precisa vincular os menus aos planos

**Causa 3: Menus estão inativos**
- Solução: Admin Global precisa ativar os menus (`is_active = true`)

**Causa 4: Permissões bloqueando**
- Solução: Proprietário precisa configurar permissões em "Permissões de Menu"

---

## ✅ Resumo

**SIM, funciona automaticamente!** 

O sistema:
1. ✅ Detecta o plano da empresa automaticamente
2. ✅ Busca menus vinculados ao plano
3. ✅ Filtra por permissões (se configuradas)
4. ✅ Exibe no sidebar automaticamente

**Você só precisa:**
- Cadastrar os menus (Admin Global)
- Vincular aos planos (Admin Global)
- Ter plano ativo na empresa
- (Opcional) Configurar permissões por role (Proprietário)

---

## 🎯 Próximos Passos

1. **Teste fazendo login como proprietário**
2. **Verifique se os menus aparecem corretamente**
3. **Se não aparecer, verifique:**
   - Console do navegador (F12)
   - Se a empresa tem plano ativo
   - Se os menus estão vinculados ao plano

