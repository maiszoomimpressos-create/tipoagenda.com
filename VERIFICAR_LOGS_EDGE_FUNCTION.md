# Verificar Logs da Edge Function

O cron job está executando com sucesso, mas as mensagens não estão sendo enviadas. Precisamos verificar os logs da Edge Function.

## Passos:

1. **Acesse o Supabase Dashboard**
   - Vá em "Edge Functions" → "whatsapp-message-scheduler"
   - Clique em "Logs"

2. **Procure por mensagens recentes** (últimas 2 horas)
   - Procure por: "Buscando logs PENDING"
   - Procure por: "Nenhuma mensagem PENDING para envio"
   - Procure por: "Total de logs a inserir"

3. **Se aparecer "Nenhuma mensagem PENDING para envio"**, significa que:
   - A Edge Function não está encontrando as mensagens PENDING
   - Pode ser problema de RLS ou timezone

4. **Execute o script `TESTAR_EDGE_FUNCTION_DIRETO.sql`** para verificar:
   - Quantas mensagens PENDING existem
   - Se há políticas RLS bloqueando
   - Se o scheduled_for está correto

## Teste Manual:

Execute o script PowerShell `scripts/test-whatsapp-scheduler.ps1` para testar manualmente e ver a resposta completa da Edge Function.


















