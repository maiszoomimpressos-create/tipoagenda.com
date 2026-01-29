# Script PowerShell para testar o envio de WhatsApp
# Uso: .\scripts\test-whatsapp-provider-completo.ps1 [telefone] [mensagem]
# Exemplo: .\scripts\test-whatsapp-provider-completo.ps1 +5546999151842 "Teste de mensagem"

param(
    [string]$Telefone = "+5511999999999",
    [string]$Mensagem = "Teste de mensagem do sistema"
)

# Verificar se a SERVICE_ROLE_KEY está definida
if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "❌ Erro: Variável SUPABASE_SERVICE_ROLE_KEY não definida" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, defina a variável antes de executar:" -ForegroundColor Yellow
    Write-Host '  $env:SUPABASE_SERVICE_ROLE_KEY = "sua-chave-aqui"' -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ou execute este script passando a chave como parâmetro:" -ForegroundColor Yellow
    Write-Host '  .\scripts\test-whatsapp-provider-completo.ps1 -Telefone "+5546999151842" -Mensagem "Teste" -ServiceRoleKey "sua-chave"' -ForegroundColor Cyan
    exit 1
}

Write-Host "🧪 TESTE DE ENVIO WHATSAPP" -ForegroundColor Green
Write-Host "Telefone: $Telefone" -ForegroundColor Cyan
Write-Host "Mensagem: $Mensagem" -ForegroundColor Cyan
Write-Host ""

# Executar o script Node.js
node scripts/test-whatsapp-provider.js $Telefone $Mensagem

