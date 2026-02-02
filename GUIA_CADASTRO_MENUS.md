# 📋 Guia de Cadastro de Menus - Passo a Passo

## 🎯 Objetivo
Este guia explica como preencher o formulário de cadastro de menus de forma clara e prática.

---

## 📝 Campos do Formulário

### 1. **Chave do Menu** ⭐ (Obrigatório)

**O que é?**
- Identificador único do menu no sistema
- Usado internamente pelo código
- **NÃO pode ser alterado depois de criado**
- Use apenas letras minúsculas, números e hífens

**Exemplos:**
```
✅ dashboard
✅ agendamentos
✅ servicos
✅ clientes
✅ colaboradores
✅ financeiro
✅ estoque
✅ relatorios
✅ fidelidade
✅ mensagens-whatsapp
✅ planos
✅ config
```

**❌ Erros comuns:**
```
❌ Dashboard (maiúscula)
❌ Agendamentos (maiúscula)
❌ menu_dashboard (underscore - use hífen)
❌ Menu Dashboard (espaços)
```

---

### 2. **Nome do Menu** ⭐ (Obrigatório)

**O que é?**
- Nome que aparece na tela para o usuário
- Pode ter maiúsculas, espaços e acentos
- É o texto visível no menu lateral

**Exemplos:**
```
✅ Dashboard
✅ Agendamentos
✅ Serviços
✅ Clientes
✅ Colaboradores
✅ Financeiro
✅ Estoque
✅ Relatórios
✅ Fidelidade
✅ Mensagens WhatsApp
✅ Planos
✅ Configurações
```

---

### 3. **Ícone (Font Awesome)** ⭐ (Obrigatório)

**O que é?**
- Classe CSS do Font Awesome para o ícone
- Formato: `fas fa-nome-do-icone`
- Você pode buscar ícones em: https://fontawesome.com/icons

**Exemplos:**
```
✅ fas fa-chart-line          (Dashboard)
✅ fas fa-calendar-alt        (Agendamentos)
✅ fas fa-briefcase           (Serviços)
✅ fas fa-users               (Clientes)
✅ fas fa-user-tie            (Colaboradores)
✅ fas fa-dollar-sign         (Financeiro)
✅ fas fa-boxes               (Estoque)
✅ fas fa-chart-bar           (Relatórios)
✅ fas fa-gift                (Fidelidade)
✅ fas fa-comments            (Mensagens WhatsApp)
✅ fas fa-gem                 (Planos)
✅ fas fa-cog                 (Configurações)
```

**Como encontrar ícones:**
1. Acesse https://fontawesome.com/icons
2. Digite o nome do que você quer (ex: "calendar", "money", "users")
3. Escolha um ícone
4. Copie a classe (ex: `fas fa-calendar-alt`)

---

### 4. **Rota** ⭐ (Obrigatório)

**O que é?**
- URL/path que o menu vai abrir quando clicado
- **SEMPRE deve começar com /** (barra)
- Pode ter parâmetros dinâmicos (ex: `:companyId`)

**Exemplos:**
```
✅ /dashboard
✅ /agendamentos/:companyId
✅ /servicos
✅ /clientes
✅ /colaboradores
✅ /financeiro
✅ /estoque
✅ /relatorios
✅ /fidelidade
✅ /mensagens-whatsapp
✅ /planos
✅ /config
```

**❌ Erros comuns:**
```
❌ dashboard (sem barra inicial)
❌ /agendamentos (sem :companyId se necessário)
```

**Dica:** Se a rota precisa de um ID da empresa, use: `/agendamentos/:companyId`

---

### 5. **Ordem de Exibição** (Opcional)

**O que é?**
- Número que define a ordem dos menus no sidebar
- **Menor número = aparece primeiro**
- Padrão: `0`

**Exemplos:**
```
0  → Dashboard (primeiro)
10 → Agendamentos
20 → Serviços
30 → Clientes
40 → Colaboradores
50 → Financeiro
60 → Estoque
70 → Relatórios
80 → Fidelidade
90 → Mensagens WhatsApp
100 → Planos
110 → Configurações (último)
```

**Dica:** Use intervalos de 10 (0, 10, 20, 30...) para facilitar inserir novos menus no meio depois.

---

### 6. **Menu Ativo?** (Toggle Switch)

**O que é?**
- Liga/Desliga se o menu está ativo no sistema
- **Ligado (azul)** = Menu aparece no sistema
- **Desligado (cinza)** = Menu fica oculto

**Quando usar:**
- ✅ **Ligado**: Menu que deve aparecer para os usuários
- ❌ **Desligado**: Menu temporariamente desabilitado (mas não deletado)

---

### 7. **Descrição** (Opcional)

**O que é?**
- Texto explicativo sobre o que o menu faz
- Ajuda outros administradores a entenderem o propósito
- Não aparece para os usuários finais

**Exemplos:**
```
"Página principal com resumo de métricas e KPIs da empresa"
"Gerenciamento de agendamentos e atendimentos"
"Cadastro e edição de serviços oferecidos"
"Lista de clientes cadastrados na empresa"
"Gerenciamento de colaboradores e suas comissões"
"Controle financeiro: receitas, despesas e movimentações"
"Controle de estoque de produtos"
"Relatórios e análises de performance"
"Sistema de fidelidade e pontos"
"Envio de mensagens automáticas via WhatsApp"
"Gerenciamento de planos de assinatura"
"Configurações gerais da empresa"
```

---

## 🎯 Exemplo Completo: Cadastrando o Menu "Dashboard"

```
Chave do Menu:        dashboard
Nome do Menu:         Dashboard
Ícone:                fas fa-chart-line
Rota:                 /dashboard
Ordem de Exibição:    0
Menu Ativo?:          ✅ Ligado
Descrição:            Página principal com resumo de métricas e KPIs
```

---

## 🎯 Exemplo Completo: Cadastrando o Menu "Agendamentos"

```
Chave do Menu:        agendamentos
Nome do Menu:         Agendamentos
Ícone:                fas fa-calendar-alt
Rota:                 /agendamentos/:companyId
Ordem de Exibição:    10
Menu Ativo?:          ✅ Ligado
Descrição:            Gerenciamento de agendamentos e atendimentos
```

---

## ⚠️ Importante: Depois de Criar o Menu

1. **Vincular a Planos:**
   - Após criar, clique no ícone de menu (📋) ao lado do menu criado
   - Selecione quais planos de assinatura terão acesso a esse menu
   - Ex: Selecione "Plano Básico" e "Plano Premium"

2. **Configurar Permissões (Proprietário):**
   - O proprietário da empresa precisa ir em "Permissões de Menu"
   - Lá ele define quais funções (Gerente, Colaborador) têm acesso a cada menu

---

## ✅ Checklist Antes de Salvar

- [ ] Chave do Menu: Apenas minúsculas, sem espaços
- [ ] Nome do Menu: Nome amigável que aparecerá na tela
- [ ] Ícone: Classe Font Awesome válida (fas fa-...)
- [ ] Rota: Começa com / e está correta
- [ ] Ordem: Número definido (0, 10, 20...)
- [ ] Ativo: Ligado se quiser que apareça
- [ ] Descrição: Preenchida (opcional mas recomendado)

---

## 🆘 Dúvidas Frequentes

**P: Posso mudar a chave do menu depois?**
R: Não, a chave é permanente. Se precisar mudar, delete e crie um novo.

**P: O que acontece se não vincular a nenhum plano?**
R: O menu não aparecerá para ninguém, mesmo que esteja ativo.

**P: Posso ter dois menus com a mesma rota?**
R: Sim, mas não é recomendado. Cada menu deve ter uma rota única.

**P: Como saber qual ícone usar?**
R: Acesse https://fontawesome.com/icons e busque por palavras-chave.

---

## 📚 Referência Rápida: Menus Padrão do Sistema

| Chave | Nome | Ícone | Rota | Ordem |
|-------|------|-------|------|-------|
| dashboard | Dashboard | fas fa-chart-line | /dashboard | 0 |
| agendamentos | Agendamentos | fas fa-calendar-alt | /agendamentos/:companyId | 10 |
| servicos | Serviços | fas fa-briefcase | /servicos | 20 |
| clientes | Clientes | fas fa-users | /clientes | 30 |
| colaboradores | Colaboradores | fas fa-user-tie | /colaboradores | 40 |
| financeiro | Financeiro | fas fa-dollar-sign | /financeiro | 50 |
| estoque | Estoque | fas fa-boxes | /estoque | 60 |
| relatorios | Relatórios | fas fa-chart-bar | /relatorios | 70 |
| fidelidade | Fidelidade | fas fa-gift | /fidelidade | 80 |
| mensagens-whatsapp | Mensagens WhatsApp | fas fa-comments | /mensagens-whatsapp | 90 |
| planos | Planos | fas fa-gem | /planos | 100 |
| config | Configurações | fas fa-cog | /config | 110 |

---

**Pronto! Agora você sabe como cadastrar menus. 🎉**

