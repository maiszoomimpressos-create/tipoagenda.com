# 📱 Como Configurar Provedor de WhatsApp

**Data:** 27/01/2025  
**Para:** Administradores Globais

---

## 🎯 Objetivo

Configurar o provedor de WhatsApp que será usado para envio automático de mensagens para todas as empresas do sistema.

---

## 📋 Pré-requisitos

1. ✅ Ser Administrador Global
2. ✅ Ter executado a migração SQL: `20250110_fix_messaging_providers_rls_for_global_admin.sql`
3. ✅ Ter credenciais de acesso ao provedor de WhatsApp escolhido

---

## 🚀 Passo a Passo

### Passo 1: Acessar a Interface

1. Faça login como **Administrador Global**
2. Acesse o **Admin Dashboard**
3. Procure o card **"Provedores WhatsApp"** (ícone verde de mensagem)
4. Clique em **"Gerenciar Provedores"**

---

### Passo 2: Criar Novo Provedor

1. Na página de gerenciamento, clique em **"Novo Provedor"**
2. Preencha os campos conforme seu provedor:

#### Campos Obrigatórios:

- **Nome do Provedor**
  - Exemplo: `Evolution API`, `Twilio`, `Z-API`
  - Use um nome descritivo que identifique o provedor

- **URL Base da API**
  - URL completa do endpoint que receberá as mensagens
  - Exemplo: `https://api.evolutionapi.com/v1/message/sendText`
  - ⚠️ **IMPORTANTE:** Deve ser a URL completa, não apenas o domínio

- **Método HTTP**
  - Geralmente `POST` (mais comum)
  - Pode ser `GET` ou `PUT` dependendo do provedor

- **Nome do Header de Autenticação**
  - Nome do header HTTP usado para autenticação
  - Exemplos comuns:
    - `Authorization` (mais comum)
    - `apikey`
    - `X-API-Key`
    - `api-key`

- **Token/Chave de Autenticação**
  - Sua chave/token de acesso ao provedor
  - Pode incluir prefixos como `Bearer ` se necessário
  - Exemplos:
    - `Bearer SEU_TOKEN_AQUI`
    - `SUA_API_KEY_AQUI`
    - `Basic BASE64_ENCODED_CREDENTIALS`

- **Template do Payload (JSON)**
  - Formato JSON que seu provedor espera receber
  - **Placeholders obrigatórios:**
    - `{phone}` - Será substituído pelo telefone do cliente
    - `{text}` - Será substituído pelo texto da mensagem
  - ⚠️ **DEVE SER UM JSON VÁLIDO**
  - Exemplos:
    ```json
    {"to": "{phone}", "message": "{text}"}
    ```
    ```json
    {"number": "{phone}", "text": "{text}"}
    ```
    ```json
    {
      "To": "whatsapp:+{phone}",
      "From": "whatsapp:+SEU_NUMERO",
      "Body": "{text}"
    }
    ```

- **Provedor ativo**
  - Marque esta opção se quiser que o provedor seja usado imediatamente
  - Se desmarcado, o provedor será criado mas não será usado até ser ativado

3. Clique em **"Criar"**

---

## 📚 Exemplos de Configuração

### Exemplo 1: Evolution API

```
Nome: Evolution API
URL Base: https://api.evolutionapi.com/v1/message/sendText
Método HTTP: POST
Header de Auth: apikey
Token: SUA_API_KEY_AQUI
Template:
{
  "number": "{phone}",
  "text": "{text}"
}
Provedor ativo: ✅ Sim
```

### Exemplo 2: Twilio

```
Nome: Twilio
URL Base: https://api.twilio.com/2010-04-01/Accounts/SEU_ACCOUNT_SID/Messages.json
Método HTTP: POST
Header de Auth: Authorization
Token: Basic BASE64_ENCODED_CREDENTIALS
Template:
{
  "To": "whatsapp:+{phone}",
  "From": "whatsapp:+SEU_NUMERO_TWILIO",
  "Body": "{text}"
}
Provedor ativo: ✅ Sim
```

### Exemplo 3: Z-API

```
Nome: Z-API
URL Base: https://api.z-api.io/instances/SUA_INSTANCIA/token/SEU_TOKEN/send-text
Método HTTP: POST
Header de Auth: Client-Token
Token: SEU_TOKEN_AQUI
Tipo de Conteúdo: JSON
Template:
{
  "phone": "{phone}",
  "message": "{text}"
}
Provedor ativo: ✅ Sim
```

### Exemplo 4: LiotPRO (multipart/form-data)

```
Nome: LiotPRO
URL Base: https://api.liotpro.com.br/api/messages/send
Método HTTP: POST
Header de Auth: Authorization
Token: Bearer SEU_TOKEN_AQUI
Tipo de Conteúdo: Form Data (multipart/form-data)
Template:
{
  "number": "{phone}",
  "body": "{text}",
  "userId": "",
  "queueId": "",
  "status": "pending",
  "sendSignature": false,
  "closeTicket": false
}
Provedor ativo: ✅ Sim
```

**Nota sobre LiotPRO:**
- Campos opcionais podem ser deixados como `""` (string vazia) ou omitidos
- O campo `medias` (arquivo) não é suportado automaticamente - apenas mensagens de texto
- `status` pode ser `"pending"` ou `"open"`

---

## 🔍 Como Descobrir os Dados do Seu Provedor

### 1. Documentação da API
- Consulte a documentação oficial do seu provedor
- Procure por:
  - Endpoint de envio de mensagens
  - Método HTTP usado (GET, POST, PUT)
  - Formato de autenticação
  - Estrutura do payload esperado

### 2. Teste Manual
- Use ferramentas como Postman ou Insomnia
- Faça uma requisição de teste manualmente
- Observe:
  - URL usada
  - Headers necessários
  - Formato do body/payload
  - Resposta da API

### 3. Exemplo de Requisição

```bash
# Exemplo com curl
curl -X POST https://api.provedor.com/v1/send \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5511999999999",
    "message": "Teste"
  }'
```

**Traduzindo para a configuração:**
- URL Base: `https://api.provedor.com/v1/send`
- Método HTTP: `POST`
- Header de Auth: `Authorization`
- Token: `Bearer SEU_TOKEN`
- Template: `{"to": "{phone}", "message": "{text}"}`

---

## ✅ Validações Importantes

### 1. Template JSON Válido
- O template **DEVE** ser um JSON válido
- Use `{phone}` e `{text}` como placeholders
- Teste o JSON antes de salvar (use um validador online)

### 2. URL Completa
- Não use apenas o domínio: `https://api.provedor.com` ❌
- Use o endpoint completo: `https://api.provedor.com/v1/send` ✅

### 3. Token Seguro
- ⚠️ **NUNCA** compartilhe seu token
- O token será armazenado no banco de dados
- Apenas administradores globais podem ver/editar

---

## 🔄 Editar Provedor Existente

1. Na lista de provedores, clique no ícone de **editar** (lápis)
2. Modifique os campos necessários
3. Clique em **"Atualizar"**

---

## 🗑️ Excluir Provedor

1. Na lista de provedores, clique no ícone de **excluir** (X vermelho)
2. Confirme a exclusão no diálogo
3. ⚠️ **ATENÇÃO:** Se este for o único provedor ativo, as empresas não conseguirão enviar mensagens até que outro seja configurado

---

## 🧪 Testar Configuração

Após configurar o provedor:

1. **Habilite o módulo em uma empresa:**
   - Vá em `/mensagens-whatsapp` (como gestor da empresa)
   - Marque "Habilitar Mensagens WhatsApp"

2. **Crie um template:**
   - Aba "Templates" → "Novo Template"
   - Escolha o tipo de mensagem
   - Digite o texto com placeholders: `[CLIENTE]`, `[EMPRESA]`, `[DATA_HORA]`

3. **Crie uma regra de envio:**
   - Aba "Regras de Envio" → "Nova Regra"
   - Configure quando enviar (ex: 1 dia antes do agendamento)

4. **Crie um agendamento de teste:**
   - Crie um agendamento para daqui a alguns minutos
   - Aguarde o cron job executar (a cada 5 minutos)
   - Verifique os logs em `message_send_log`

---

## 🆘 Problemas Comuns

### Erro: "O template do payload deve ser um JSON válido"
- **Solução:** Verifique se o JSON está correto (vírgulas, chaves, aspas)
- Use um validador JSON online

### Erro: "Erro ao salvar provedor"
- **Solução:** Verifique se executou a migração SQL de RLS
- Verifique se você é administrador global

### Mensagens não estão sendo enviadas
- **Verifique:**
  1. Provedor está ativo?
  2. Empresa tem `whatsapp_messaging_enabled = true`?
  3. Existe template e regra de envio configurados?
  4. Verifique os logs em `message_send_log`
  5. Verifique os logs da Edge Function no Supabase

---

## 📝 Notas Importantes

- ⚠️ **Apenas um provedor ativo por vez:** O sistema usa o primeiro provedor ativo encontrado
- ⚠️ **Token sensível:** Mantenha o token seguro, ele dá acesso total à sua conta do provedor
- ✅ **Múltiplos provedores:** Você pode ter vários provedores configurados, mas apenas um ativo
- ✅ **Edição segura:** Você pode editar o provedor sem afetar mensagens já agendadas

---

**Pronto para configurar!** 🚀

Se tiver dúvidas sobre o formato específico do seu provedor, consulte a documentação oficial ou entre em contato com o suporte do provedor.

