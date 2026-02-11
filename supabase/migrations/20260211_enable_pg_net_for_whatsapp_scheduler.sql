-- =====================================================
-- HABILITAR EXTENSÃO pg_net PARA O WHATSAPP SCHEDULER
-- =====================================================
-- Motivo:
-- - O cron de WhatsApp usa net.http_post(...)
-- - O erro "schema \"net\" does not exist" indica que a
--   extensão pg_net não está habilitada neste banco.
-- - Sem pg_net, o pg_cron NÃO consegue chamar a Edge
--   Function whatsapp-message-scheduler, então nenhuma
--   mensagem é enviada (logs ficam em PENDING).
-- =====================================================

-- Habilitar extensão pg_net (cria o schema net e as funções net.http_*)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Observação:
-- - Não é necessário recriar o job do pg_cron. Assim que
--   pg_net estiver habilitado, as próximas execuções do job
--   passarão a conseguir chamar a Edge Function normalmente.


