@echo off
REM Script Batch para testar o envio de WhatsApp
REM Uso: scripts\test-whatsapp-provider-completo.bat [telefone] [mensagem]
REM Exemplo: scripts\test-whatsapp-provider-completo.bat +5546999151842 "Teste de mensagem"

set TELEFONE=%1
set MENSAGEM=%2

if "%TELEFONE%"=="" set TELEFONE=+5511999999999
if "%MENSAGEM%"=="" set MENSAGEM=Teste de mensagem do sistema

if "%SUPABASE_SERVICE_ROLE_KEY%"=="" (
    echo.
    echo ❌ Erro: Variável SUPABASE_SERVICE_ROLE_KEY não definida
    echo.
    echo Por favor, defina a variável antes de executar:
    echo   set SUPABASE_SERVICE_ROLE_KEY=sua-chave-aqui
    echo.
    echo Ou execute no PowerShell:
    echo   $env:SUPABASE_SERVICE_ROLE_KEY = "sua-chave-aqui"
    echo   node scripts\test-whatsapp-provider.js %TELEFONE% "%MENSAGEM%"
    echo.
    exit /b 1
)

echo.
echo 🧪 TESTE DE ENVIO WHATSAPP
echo Telefone: %TELEFONE%
echo Mensagem: %MENSAGEM%
echo.

node scripts/test-whatsapp-provider.js %TELEFONE% "%MENSAGEM%"

