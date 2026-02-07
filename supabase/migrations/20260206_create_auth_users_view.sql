-- View para expor dados básicos de usuários de auth.users para uso em joins e telas administrativas
-- Mantém o acesso centralizado e evita dependência direta do schema auth no frontend.

create or replace view public.auth_users
as
select
  u.id,
  u.email,
  u.raw_user_meta_data,
  u.created_at
from auth.users u;

-- Garantir que a view execute com os privilégios do criador,
-- evitando necessidade de conceder acesso direto a auth.users.
alter view public.auth_users set (security_invoker = true);

-- Permitir leitura da view para clientes autenticados e anônimos (RLS continua valendo nas tabelas chamadas pelo app).
grant select on public.auth_users to anon, authenticated;



