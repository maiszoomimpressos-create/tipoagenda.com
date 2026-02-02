# 📋 Referência Completa: Nomes e Rotas dos Menus

## ✅ Confirmação: Apenas AGENDAMENTOS precisa de `:companyId`

Você está correto! **Somente o menu "Agendamentos" precisa do `:companyId` na rota.**

---

## 📝 Tabela Completa de Menus

| # | Chave do Menu | Nome do Menu | Ícone | Rota | Precisa companyId? |
|---|---------------|--------------|-------|------|-------------------|
| 1 | `dashboard` | Dashboard | `fas fa-chart-line` | `/dashboard` | ❌ NÃO |
| 2 | `agendamentos` | Agendamentos | `fas fa-calendar-alt` | `/agendamentos/:companyId` | ✅ **SIM** |
| 3 | `servicos` | Serviços | `fas fa-briefcase` | `/servicos` | ❌ NÃO |
| 4 | `clientes` | Clientes | `fas fa-users` | `/clientes` | ❌ NÃO |
| 5 | `colaboradores` | Colaboradores | `fas fa-user-tie` | `/colaboradores` | ❌ NÃO |
| 6 | `financeiro` | Financeiro | `fas fa-dollar-sign` | `/financeiro` | ❌ NÃO |
| 7 | `estoque` | Estoque | `fas fa-boxes` | `/estoque` | ❌ NÃO |
| 8 | `relatorios` | Relatórios | `fas fa-chart-bar` | `/relatorios` | ❌ NÃO |
| 9 | `fidelidade` | Fidelidade | `fas fa-gift` | `/fidelidade` | ❌ NÃO |
| 10 | `mensagens-whatsapp` | Mensagens WhatsApp | `fas fa-comments` | `/mensagens-whatsapp` | ❌ NÃO |
| 11 | `planos` | Planos | `fas fa-gem` | `/planos` | ❌ NÃO |
| 12 | `config` | Configurações | `fas fa-cog` | `/config` | ❌ NÃO |

---

## 🎯 Exemplos de Cadastro (Copie e Cole)

### 1. Dashboard
```
Chave do Menu:        dashboard
Nome do Menu:         Dashboard
Ícone:                fas fa-chart-line
Rota:                 /dashboard
Ordem:                0
Ativo:                ✅
```

### 2. Agendamentos ⚠️ (ÚNICO que precisa :companyId)
```
Chave do Menu:        agendamentos
Nome do Menu:         Agendamentos
Ícone:                fas fa-calendar-alt
Rota:                 /agendamentos/:companyId
Ordem:                10
Ativo:                ✅
```

### 3. Serviços
```
Chave do Menu:        servicos
Nome do Menu:         Serviços
Ícone:                fas fa-briefcase
Rota:                 /servicos
Ordem:                20
Ativo:                ✅
```

### 4. Clientes
```
Chave do Menu:        clientes
Nome do Menu:         Clientes
Ícone:                fas fa-users
Rota:                 /clientes
Ordem:                30
Ativo:                ✅
```

### 5. Colaboradores
```
Chave do Menu:        colaboradores
Nome do Menu:         Colaboradores
Ícone:                fas fa-user-tie
Rota:                 /colaboradores
Ordem:                40
Ativo:                ✅
```

### 6. Financeiro
```
Chave do Menu:        financeiro
Nome do Menu:         Financeiro
Ícone:                fas fa-dollar-sign
Rota:                 /financeiro
Ordem:                50
Ativo:                ✅
```

### 7. Estoque
```
Chave do Menu:        estoque
Nome do Menu:         Estoque
Ícone:                fas fa-boxes
Rota:                 /estoque
Ordem:                60
Ativo:                ✅
```

### 8. Relatórios
```
Chave do Menu:        relatorios
Nome do Menu:         Relatórios
Ícone:                fas fa-chart-bar
Rota:                 /relatorios
Ordem:                70
Ativo:                ✅
```

### 9. Fidelidade
```
Chave do Menu:        fidelidade
Nome do Menu:         Fidelidade
Ícone:                fas fa-gift
Rota:                 /fidelidade
Ordem:                80
Ativo:                ✅
```

### 10. Mensagens WhatsApp
```
Chave do Menu:        mensagens-whatsapp
Nome do Menu:         Mensagens WhatsApp
Ícone:                fas fa-comments
Rota:                 /mensagens-whatsapp
Ordem:                90
Ativo:                ✅
```

### 11. Planos
```
Chave do Menu:        planos
Nome do Menu:         Planos
Ícone:                fas fa-gem
Rota:                 /planos
Ordem:                100
Ativo:                ✅
```

### 12. Configurações
```
Chave do Menu:        config
Nome do Menu:         Configurações
Ícone:                fas fa-cog
Rota:                 /config
Ordem:                110
Ativo:                ✅
```

---

## ⚠️ IMPORTANTE: Regra das Rotas

### ✅ Rotas SIMPLES (sem parâmetros)
A maioria dos menus usa rotas simples, sem `:companyId`:

- `/dashboard`
- `/servicos`
- `/clientes`
- `/colaboradores`
- `/financeiro`
- `/estoque`
- `/relatorios`
- `/fidelidade`
- `/mensagens-whatsapp`
- `/planos`
- `/config`

### ⚠️ Rotas com PARÂMETRO (apenas 1 menu)
**Somente Agendamentos** precisa do parâmetro `:companyId`:

- `/agendamentos/:companyId`

**Por quê?** Porque a página de agendamentos precisa saber qual empresa está sendo visualizada.

---

## ✅ Checklist Rápido

Antes de salvar cada menu, verifique:

- [ ] **Chave**: Apenas minúsculas, sem espaços
- [ ] **Nome**: Como aparece na tela (pode ter maiúsculas)
- [ ] **Ícone**: Classe Font Awesome completa (fas fa-...)
- [ ] **Rota**: 
  - Se for "agendamentos" → `/agendamentos/:companyId`
  - Todos os outros → `/nome-do-menu` (sem :companyId)
- [ ] **Ordem**: Número sequencial (0, 10, 20, 30...)
- [ ] **Ativo**: Ligado ✅

---

## 🎯 Resumo Visual

```
✅ SEM :companyId (11 menus):
   dashboard, servicos, clientes, colaboradores, 
   financeiro, estoque, relatorios, fidelidade, 
   mensagens-whatsapp, planos, config

⚠️ COM :companyId (1 menu):
   agendamentos → /agendamentos/:companyId
```

---

## 💡 Dica Final

**Sempre comece a rota com `/` e use exatamente os nomes da tabela acima.**

Se tiver dúvida, copie e cole os exemplos completos! 🎯

