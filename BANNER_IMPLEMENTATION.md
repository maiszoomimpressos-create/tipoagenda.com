# Implementação: Sistema de Banners

## Visão Geral

Sistema completo para gerenciamento de banners vinculados a empresas, garantindo que cada empresa tenha **apenas 1 banner** através de constraints de banco de dados e validações de negócio.

## Estrutura de Arquivos

```
supabase/migrations/create_banners_table.sql  # Schema SQL com constraints
src/services/bannerService.ts                 # Lógica de negócio
src/components/BannerFormModal.tsx            # Componente de formulário
src/pages/BannerManagementPage.tsx            # Página de gerenciamento
```

## 1. Schema do Banco de Dados

**Arquivo:** `supabase/migrations/create_banners_table.sql`

### Características Principais:

- **Tabela `banners`** com foreign key para `companies(id)`
- **Constraint única:** `banners_company_id_unique` garante 1 banner por empresa
- **Índices** para performance em consultas por status e ordenação
- **Trigger** para atualização automática de `updated_at`
- **Cascade delete:** ao excluir empresa, banner é excluído automaticamente

### Constraint Principal:

```sql
CREATE UNIQUE INDEX banners_company_id_unique 
ON banners (company_id);
```

Esta constraint é a **garantia fundamental** de que apenas 1 banner por empresa será permitido no banco de dados.

## 2. Lógica de Negócio

**Arquivo:** `src/services/bannerService.ts`

### Funções Principais:

- `checkCompanyHasBanner(companyId)` - Verifica se empresa já possui banner
- `getBannerByCompanyId(companyId)` - Busca banner de uma empresa
- `createBanner(bannerData)` - Cria novo banner (com validação prévia)
- `updateBanner(bannerId, updateData)` - Atualiza banner existente
- `upsertBannerForCompany(companyId, bannerData)` - Atualiza ou cria banner
- `deleteBanner(bannerId)` - Exclui banner
- `getAllBanners()` - Lista todos os banners (admin)

### Validação em Duas Camadas:

1. **Camada de Serviço:** Valida antes de inserir (feedback mais claro)
2. **Camada de Banco:** Constraint única garante integridade mesmo se validação falhar

## 3. Componente de Formulário

**Arquivo:** `src/components/BannerFormModal.tsx`

### Funcionalidades:

- **Detecção automática:** Verifica se empresa já possui banner ao abrir
- **Modo Edição:** Se existe banner, preenche formulário e permite edição
- **Modo Criação:** Se não existe, permite criar novo
- **Validação:** Schema Zod valida dados antes de submeter
- **Feedback visual:** Alerta informa quando está editando banner existente

### Fluxo de Validação:

```
1. Modal abre → Verifica banner existente
2. Se existe → Modo edição (preenche formulário)
3. Se não existe → Modo criação (formulário vazio)
4. Ao submeter → Valida dados → Cria ou atualiza
```

## 4. Página de Gerenciamento

**Arquivo:** `src/pages/BannerManagementPage.tsx`

### Funcionalidades:

- Lista todos os banners com informações da empresa
- Botão para criar novo banner (com validação)
- Botões para editar/excluir banners
- Status visual (ativo/inativo)
- Confirmação antes de excluir

## Como Usar

### 1. Executar Migração SQL

Execute o arquivo SQL no Supabase:

```sql
-- Execute: supabase/migrations/create_banners_table.sql
```

### 2. Criar Bucket no Supabase Storage

Para permitir upload de imagens, é necessário criar um bucket no Supabase Storage:

1. Acesse o painel do Supabase
2. Vá em **Storage** → **Buckets**
3. Clique em **New bucket**
4. Nome do bucket: `banners`
5. Configure as políticas de acesso conforme necessário (público para leitura, autenticado para escrita)

**Nota:** O bucket deve ser nomeado exatamente `banners` para funcionar com o código atual.

### 2. Usar o Serviço

```typescript
import { createBanner, getBannerByCompanyId } from '@/services/bannerService';

// Criar banner
const banner = await createBanner({
  company_id: 'company-uuid',
  title: 'Promoção de Verão',
  image_url: 'https://exemplo.com/banner.jpg',
  link_url: 'https://exemplo.com/promocao',
  is_active: true,
});

// Buscar banner de uma empresa
const existingBanner = await getBannerByCompanyId('company-uuid');
```

### 3. Usar o Componente

```typescript
import { BannerFormModal } from '@/components/BannerFormModal';

<BannerFormModal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  companyId="company-uuid"
  companyName="Nome da Empresa"
  onSuccess={() => console.log('Banner salvo!')}
/>
```

## Garantias de Integridade

### Nível 1: Constraint de Banco de Dados
- **UNIQUE INDEX** em `company_id` impede inserção de múltiplos banners
- Erro `23505` será lançado se tentar inserir duplicado

### Nível 2: Validação de Serviço
- Função `checkCompanyHasBanner()` verifica antes de inserir
- Mensagem de erro clara para o usuário

### Nível 3: Interface do Usuário
- Modal detecta banner existente automaticamente
- Modo edição/criação é determinado dinamicamente
- Feedback visual claro sobre o estado atual

## Exemplo de Uso no Painel Admin

A página `BannerManagementPage` demonstra como implementar o gerenciamento completo:

1. Lista todos os banners
2. Permite criar novo (com validação)
3. Permite editar existente
4. Permite excluir (com confirmação)

## Notas Importantes

- ⚠️ A constraint única é a **garantia final** de integridade
- ✅ Validações de serviço melhoram UX com feedback antecipado
- 🔄 Use `upsertBannerForCompany()` para lógica "atualizar ou criar"
- 🗑️ Exclusão de empresa remove banner automaticamente (CASCADE)

