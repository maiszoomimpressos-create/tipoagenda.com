-- =====================================================
-- CONFIGURAR PROVEDOR DE WHATSAPP
-- =====================================================
-- Execute este script para inserir/configurar seu provedor
-- =====================================================

-- IMPORTANTE: Substitua os valores abaixo pelos dados do SEU provedor

INSERT INTO messaging_providers (
  name,                           -- Nome do provedor (ex: "Evolution API", "Twilio", etc.)
  channel,                        -- Sempre 'WHATSAPP'
  base_url,                       -- URL base da API do provedor (ex: "https://api.evolutionapi.com/v1")
  http_method,                    -- Método HTTP: 'POST', 'GET' ou 'PUT'
  auth_key,                       -- Nome do header de autenticação (ex: "Authorization", "X-API-Key")
  auth_token,                     -- Token/chave de autenticação (ex: "Bearer SEU_TOKEN", "SUA_API_KEY")
  payload_template,               -- Template JSON do payload que o provedor espera
  is_active                       -- true para ativar, false para desativar
) VALUES (
  'WHATSAPP_ALTERNATIVO_PADRAO',  -- ⚠️ ALTERE: Nome do seu provedor
  'WHATSAPP',
  'https://api.seuprovedor.com/send',  -- ⚠️ ALTERE: URL da API do seu provedor
  'POST',                         -- ⚠️ ALTERE se necessário: POST, GET ou PUT
  'Authorization',                -- ⚠️ ALTERE se necessário: Nome do header de auth
  'Bearer SEU_TOKEN_AQUI',        -- ⚠️ ALTERE: Seu token/chave de autenticação
  '{"to": "{phone}", "message": "{text}"}'::jsonb,  -- ⚠️ ALTERE: Template do payload
  true                            -- true = ativo, false = inativo
)
ON CONFLICT (name) DO UPDATE SET
  base_url = EXCLUDED.base_url,
  http_method = EXCLUDED.http_method,
  auth_key = EXCLUDED.auth_key,
  auth_token = EXCLUDED.auth_token,
  payload_template = EXCLUDED.payload_template,
  is_active = EXCLUDED.is_active;

-- =====================================================
-- EXEMPLOS DE CONFIGURAÇÃO PARA PROVEDORES COMUNS
-- =====================================================

-- EXEMPLO 1: Evolution API
/*
INSERT INTO messaging_providers (
  name, channel, base_url, http_method, auth_key, auth_token, payload_template, is_active
) VALUES (
  'Evolution API',
  'WHATSAPP',
  'https://api.evolutionapi.com/v1/message/sendText',
  'POST',
  'apikey',
  'SUA_API_KEY_AQUI',
  '{"number": "{phone}", "text": "{text}"}'::jsonb,
  true
);
*/

-- EXEMPLO 2: Twilio
/*
INSERT INTO messaging_providers (
  name, channel, base_url, http_method, auth_key, auth_token, payload_template, is_active
) VALUES (
  'Twilio',
  'WHATSAPP',
  'https://api.twilio.com/2010-04-01/Accounts/SEU_ACCOUNT_SID/Messages.json',
  'POST',
  'Authorization',
  'Basic BASE64_ENCODED_CREDENTIALS',
  '{"To": "whatsapp:+{phone}", "From": "whatsapp:+SEU_NUMERO", "Body": "{text}"}'::jsonb,
  true
);
*/

-- EXEMPLO 3: API Genérica (formato comum)
/*
INSERT INTO messaging_providers (
  name, channel, base_url, http_method, auth_key, auth_token, payload_template, is_active
) VALUES (
  'Meu Provedor',
  'WHATSAPP',
  'https://api.meuprovedor.com/v1/send',
  'POST',
  'Authorization',
  'Bearer MEU_TOKEN',
  '{"phone": "{phone}", "message": "{text}"}'::jsonb,
  true
);
*/

-- =====================================================
-- COMO FUNCIONA:
-- =====================================================
-- 1. O sistema substitui {phone} pelo telefone do cliente
-- 2. O sistema substitui {text} pelo texto da mensagem
-- 3. A Edge Function faz uma requisição HTTP para base_url usando http_method
-- 4. Adiciona o header auth_key com o valor auth_token
-- 5. Envia o payload_template preenchido no body da requisição
-- =====================================================

