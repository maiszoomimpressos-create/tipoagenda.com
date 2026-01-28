# 📱 Configuração Específica: LiotPRO API

**Data:** 27/01/2025  
**Provedor:** LiotPRO

---

## 🎯 Configuração para API LiotPRO

A API LiotPRO requer `multipart/form-data` e campos específicos. O sistema agora suporta isso!

---

## 📋 Passo a Passo

### 1. Executar Migration

Primeiro, execute a migration para adicionar suporte a `multipart/form-data`:

```sql
-- Arquivo: supabase/migrations/20250127_add_content_type_to_messaging_providers.sql
```

### 2. Configurar Provedor na Interface

1. Acesse: **Admin Dashboard** → **Provedores WhatsApp**
2. Clique em **"Novo Provedor"**
3. Preencha os campos:

#### Campos Obrigatórios:

- **Nome do Provedor**: `LiotPRO`
- **URL Base da API**: `https://api.liotpro.com.br/api/messages/send`
- **Método HTTP**: `POST`
- **Nome do Header de Autenticação**: `Authorization`
- **Token/Chave de Autenticação**: `Bearer SEU_TOKEN_AQUI` (substitua pelo seu token)
- **Tipo de Conteúdo**: Selecione **"Form Data (multipart/form-data)"**
- **Template do Payload**: 
```json
{
  "number": "{phone}",
  "body": "{text}",
  "userId": "",
  "queueId": "",
  "status": "pending",
  "sendSignature": false,
  "closeTicket": false
}
```
- **Provedor ativo**: ✅ Marque esta opção

4. Clique em **"Criar"**

---

## 📝 Explicação dos Campos do Template

### Campos Obrigatórios:
- `number`: Telefone do destinatário (use `{phone}` - será substituído automaticamente)
- `body`: Texto da mensagem (use `{text}` - será substituído automaticamente)

### Campos Opcionais:
- `userId`: ID do usuário/atendente (deixe `""` se não usar)
- `queueId`: ID da fila (deixe `""` se não usar)
- `status`: Status do ticket (`"pending"` ou `"open"`)
- `sendSignature`: Assinar mensagem (`true` ou `false`)
- `closeTicket`: Encerrar ticket (`true` ou `false`)

**Nota:** Campos com valor `""` (string vazia) serão omitidos automaticamente no envio.

---

## 🔍 Exemplo Completo de Configuração

```
Nome: LiotPRO
URL Base: https://api.liotpro.com.br/api/messages/send
Método HTTP: POST
Header de Auth: Authorization
Token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
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

---

## ✅ Como Funciona

1. O sistema substitui `{phone}` pelo telefone do cliente
2. O sistema substitui `{text}` pelo texto da mensagem
3. O sistema cria um `FormData` com todos os campos do template
4. Campos vazios (`""`) são omitidos automaticamente
5. A requisição é enviada com `multipart/form-data`
6. O header `Authorization: Bearer TOKEN` é adicionado automaticamente

---

## 🧪 Testar Configuração

Após configurar:

1. Habilite o módulo em uma empresa (`whatsapp_messaging_enabled = true`)
2. Crie um template de mensagem
3. Crie uma regra de envio
4. Crie um agendamento de teste
5. Aguarde o cron executar (a cada 5 minutos)
6. Verifique os logs em `message_send_log`

---

## ⚠️ Limitações Atuais

- **Arquivos (medias)**: Não suportado automaticamente - apenas mensagens de texto
- **Campos dinâmicos**: Apenas `{phone}` e `{text}` são substituídos automaticamente
- **Outros placeholders**: Não são suportados (como `[CLIENTE]`, `[DATA]`, etc.)

---

## 🐛 Troubleshooting

### Erro: "Content-Type não suportado"
- Verifique se selecionou **"Form Data (multipart/form-data)"** no campo Tipo de Conteúdo

### Erro: "Campo obrigatório faltando"
- Verifique se `number` e `body` estão no template
- Certifique-se de usar `{phone}` e `{text}` (não `[PHONE]` ou `[TEXT]`)

### Mensagens não estão sendo enviadas
- Verifique se o token está correto (deve incluir `Bearer ` no início)
- Verifique se a URL está correta
- Verifique os logs da Edge Function no Supabase

---

**Pronto para usar com LiotPRO!** 🚀

