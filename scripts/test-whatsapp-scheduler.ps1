# Script PowerShell para testar a função whatsapp-message-scheduler
# Uso: .\scripts\test-whatsapp-scheduler.ps1

$SUPABASE_URL = "https://tegyiuktrmcqxkbjxqoc.supabase.co"
$FUNCTION_NAME = "whatsapp-message-scheduler"

# Você precisa definir a SERVICE_ROLE_KEY como variável de ambiente
# ou substituir aqui diretamente
if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "❌ Erro: Variável SUPABASE_SERVICE_ROLE_KEY não definida" -ForegroundColor Red
    Write-Host "Defina com: `$env:SUPABASE_SERVICE_ROLE_KEY='sua-chave-aqui'" -ForegroundColor Yellow
    exit 1
}

Write-Host "🚀 Executando função $FUNCTION_NAME..." -ForegroundColor Cyan
Write-Host ""

$headers = @{
    "Authorization" = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

$body = @{} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}" `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -ContentType "application/json"
    
    Write-Host "✅ Função executada com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resposta:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Erro na execução:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

