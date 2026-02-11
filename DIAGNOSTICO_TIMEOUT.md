# 🔍 Diagnóstico: Timeout de Conexão com API LiotPRO

## 📊 Situação Atual

**Token:** ✅ Correto (`Bearer qRd4LimWs4pl0tGQvIAtzgG5XSvKRR`)  
**Payload:** ✅ Correto (inclui `userId` e `queueId`)  
**DNS:** ✅ Funcionando (resolve para `177.155.113.248`)  
**Conexão HTTPS:** ❌ Timeout após 10 segundos

## 🔴 Problema Identificado

O erro `Connect Timeout Error` indica que a conexão TCP não está sendo estabelecida com o servidor `api.liotpro.com.br:443` dentro do tempo limite.

## 🔍 Possíveis Causas

### 1. **Firewall/Antivírus Bloqueando**
- Windows Firewall pode estar bloqueando conexões HTTPS
- Antivírus pode estar interceptando conexões
- **Solução:** Adicionar exceção para Node.js ou desabilitar temporariamente

### 2. **Proxy Corporativo**
- Se estiver em rede corporativa, pode precisar de proxy
- **Solução:** Configurar proxy no Node.js ou sistema

### 3. **Whitelist de IP na LiotPRO**
- A API pode exigir que seu IP esteja na whitelist
- **Solução:** Verificar no painel da LiotPRO se há configuração de IPs permitidos

### 4. **Problema Temporário de Rede**
- Servidor pode estar sobrecarregado ou em manutenção
- **Solução:** Tentar novamente em alguns minutos

### 5. **Timeout Muito Curto**
- O timeout padrão do sistema pode ser muito curto
- **Solução:** Já aumentamos para 30 segundos no código

## 🧪 Testes Recomendados

### Teste 1: Usar curl via PowerShell
```powershell
.\scripts\test-whatsapp-curl.ps1
```
Isso testa se o problema é específico do Node.js ou geral da rede.

### Teste 2: Teste Manual com Postman/Browser
1. Abra Postman ou Insomnia
2. Faça uma requisição POST para: `https://api.liotpro.com.br/api/messages/send`
3. Headers:
   - `Authorization: Bearer qRd4LimWs4pl0tGQvIAtzgG5XSvKRR`
   - `Content-Type: application/json`
4. Body:
```json
{
  "number": "+5546999151842",
  "body": "Teste manual",
  "userId": "184",
  "queueId": "73",
  "status": "pending"
}
```

### Teste 3: Verificar Firewall
```powershell
# Verificar regras do Windows Firewall
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Node*"}
```

### Teste 4: Verificar Proxy
```powershell
# Verificar configurações de proxy
netsh winhttp show proxy
```

## 📞 Próximos Passos

1. **Execute o teste com curl** para isolar se é problema do Node.js
2. **Verifique no painel da LiotPRO** se há configuração de whitelist de IP
3. **Teste manualmente** com Postman para confirmar se a API está acessível
4. **Entre em contato com suporte LiotPRO** se todos os testes falharem

## 💡 Observação Importante

Se o teste com curl funcionar mas o Node.js não, pode ser necessário:
- Configurar proxy no Node.js
- Adicionar exceção no firewall para Node.js
- Verificar se há antivírus bloqueando conexões do Node.js

