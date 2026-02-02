# 🔍 Diagnóstico: Problema ao Vincular Planos aos Menus

## ⚠️ Problema Reportado
Ao clicar em "Vincular Plano" e salvar, os planos não estão sendo gravados.

## 🔧 Correções Implementadas

### 1. **Logs de Debug Adicionados**
Agora o console mostrará:
- Menu sendo vinculado
- Planos selecionados
- Status de cada operação (delete, insert)
- Erros detalhados se houver

### 2. **Atualização Imediata do Estado**
O estado local é atualizado imediatamente após salvar, antes mesmo de recarregar do servidor.

### 3. **Reset de Estado ao Cancelar**
Ao cancelar, o estado é limpo corretamente.

### 4. **Melhor Tratamento de Erros**
Mensagens de erro mais detalhadas para identificar o problema.

---

## 🧪 Como Testar

1. **Abra o Console do Navegador** (F12 → Console)
2. **Clique no botão de menu (📋) ao lado de um menu**
3. **Selecione os planos**
4. **Clique em "Salvar"**
5. **Observe os logs no console:**
   ```
   Salvando planos para menu: [id]
   Planos selecionados: [array de ids]
   Vinculações antigas deletadas com sucesso
   Inserindo novas vinculações: [array de objetos]
   Vinculações inseridas com sucesso: [dados retornados]
   ```

---

## 🐛 Possíveis Causas

### 1. **Problema de RLS (Row Level Security)**
**Sintoma:** Erro 403 ou "new row violates row-level security policy"

**Solução:** Verificar se você é Admin Global:
- Verifique no console se aparece: `isGlobalAdmin=true`
- Se não, você precisa ter permissão de Admin Global

### 2. **Problema de Dados**
**Sintoma:** Erro ao inserir (valores inválidos)

**Solução:** Verificar se:
- `menu_id` é um UUID válido
- `plan_id` é um UUID válido
- Ambos existem no banco

### 3. **Problema de Estado**
**Sintoma:** Salva mas não aparece na tela

**Solução:** Já corrigido - agora atualiza o estado imediatamente

---

## 📋 Checklist de Verificação

Após clicar em "Salvar", verifique:

- [ ] Aparece mensagem de sucesso?
- [ ] Os badges de planos aparecem na lista?
- [ ] Há erros no console?
- [ ] O modal fecha automaticamente?

---

## 🔍 Se Ainda Não Funcionar

1. **Abra o Console (F12)**
2. **Tente vincular novamente**
3. **Copie TODOS os logs que aparecerem**
4. **Envie os logs para análise**

Os logs agora mostram:
- ✅ O que está sendo enviado
- ✅ O que está sendo retornado
- ❌ Qualquer erro que ocorrer

---

## 💡 Dica

Se você ver no console:
```
Erro ao inserir vinculações: {code: '42501', message: 'new row violates row-level security policy'}
```

Isso significa que você não tem permissão. Verifique se você é Admin Global no sistema.

