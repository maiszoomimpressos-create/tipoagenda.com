# 🔍 Verificações Necessárias - API LiotPRO

## ❓ Perguntas para Resolver o Erro `ERR_SESSION_EXPIRED`

### 1. Formato do Token
- [ ] A API LiotPRO aceita token com prefixo "Bearer "?
- [ ] Ou aceita apenas o token sem prefixo?
- [ ] Ou usa outro formato (ex: "Token ", "ApiKey ", etc.)?

### 2. Sessão/Login
- [ ] É necessário fazer login/iniciar sessão antes de usar o token?
- [ ] O token precisa ser gerado após fazer login?
- [ ] Há algum endpoint de autenticação que precisa ser chamado primeiro?

### 3. Validade do Token
- [ ] O token tem data de expiração?
- [ ] Quanto tempo o token é válido?
- [ ] Como renovar o token quando expirar?

### 4. Permissões
- [ ] O token tem permissão para enviar mensagens?
- [ ] Há diferentes níveis de permissão?
- [ ] Precisa de permissões específicas para WhatsApp?

### 5. Documentação
- [ ] Onde está a documentação oficial da API LiotPRO?
- [ ] Há exemplos de código/curl na documentação?
- [ ] Qual é o formato correto de autenticação?

---

## 🧪 Testes Sugeridos

### Teste 1: Token sem "Bearer "
Execute:
```sql
UPDATE public.messaging_providers
SET auth_token = 'DvO5QtR6BTQvvP8wf87vFwB1yq77K0'
WHERE channel = 'WHATSAPP' AND is_active = true;
```

Depois teste:
```powershell
node scripts/test-whatsapp-provider.js +5546999151842 "Teste"
```

### Teste 2: Verificar Documentação
- Acesse a documentação da API LiotPRO
- Procure por "autenticação" ou "authentication"
- Veja exemplos de requisições bem-sucedidas

### Teste 3: Teste Manual com Postman/curl
Tente fazer uma requisição manual:
```bash
curl -X POST https://api.liotpro.com.br/api/messages/send \
  -H "Authorization: DvO5QtR6BTQvvP8wf87vFwB1yq77K0" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "+5546999151842",
    "body": "Teste",
    "userId": "184",
    "queueId": "73",
    "status": "pending"
  }'
```

Ou com Bearer:
```bash
curl -X POST https://api.liotpro.com.br/api/messages/send \
  -H "Authorization: Bearer DvO5QtR6BTQvvP8wf87vFwB1yq77K0" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "+5546999151842",
    "body": "Teste",
    "userId": "184",
    "queueId": "73",
    "status": "pending"
  }'
```

---

## ✅ O Que Já Está Funcionando

- ✅ Código está enviando `userId` e `queueId` corretamente
- ✅ Payload está completo e formatado corretamente
- ✅ Headers estão sendo enviados corretamente
- ✅ Requisição está sendo construída corretamente

O problema é **apenas** com a autenticação da API externa.

