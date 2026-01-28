# 🔴 Resolver Erros CORS e 502 (Bad Gateway) no Supabase

## Problema Identificado

Os erros mostram:
- **CORS**: `Access to fetch at 'https://tegyiuktrmcqxkbjxqoc.supabase.co/...' from origin 'https://www.tipoagenda.com' has been blocked by CORS policy`
- **502 Bad Gateway**: `POST https://tegyiuktrmcqxkbjxqoc.supabase.co/rest/v1/rpc/get_user_context net::ERR_FAILED 502 (Bad Gateway)`

## Causas Possíveis

1. **Problema temporário no Supabase** (mais comum)
2. **Função RPC `get_user_context` não existe ou tem problemas**
3. **Configuração de CORS no Supabase Dashboard**

## Soluções

### 1. Verificar Status do Supabase

1. Acesse: https://status.supabase.com
2. Verifique se há incidentes reportados
3. Se houver, aguarde a resolução

### 2. Verificar/Configurar CORS no Supabase

1. Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/settings/api
2. Na seção **"CORS"** ou **"Allowed Origins"**, verifique se `https://www.tipoagenda.com` está na lista
3. Se não estiver, adicione:
   - `https://www.tipoagenda.com`
   - `https://tipoagenda.com` (sem www)
4. Clique em **"Save"**

### 3. Verificar se a Função RPC `get_user_context` Existe

1. Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/database/functions
2. Procure por `get_user_context`
3. Se não existir, você precisa criá-la (ver abaixo)

### 4. Aplicar a Migration de Checkout (Mesmo com Erros)

A migration `20250109_fix_checkout_rls.sql` está correta e deve ser aplicada:

1. Acesse: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/sql/new
2. Abra o arquivo `supabase/migrations/20250109_fix_checkout_rls.sql`
3. Copie todo o conteúdo
4. Cole no editor SQL
5. Clique em **"Run"**

**Nota**: Mesmo que haja erros de CORS/502 na aplicação, a migration pode ser aplicada normalmente via SQL Editor.

### 5. Verificar se a Função `get_user_context` Existe (Se Necessário)

Se a função não existir, você precisa criá-la. Execute este SQL no Supabase:

```sql
CREATE OR REPLACE FUNCTION public.get_user_context(p_user_id UUID)
RETURNS TABLE (
  company_id UUID,
  company_name TEXT,
  role_type_description TEXT,
  is_primary BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uc.company_id,
    c.name AS company_name,
    rt.description AS role_type_description,
    uc.is_primary
  FROM public.user_companies uc
  JOIN public.companies c ON c.id = uc.company_id
  JOIN public.role_types rt ON rt.id = uc.role_type
  WHERE uc.user_id = p_user_id
  ORDER BY uc.is_primary DESC, c.name;
END;
$$;
```

## Teste Após Aplicar Correções

1. Recarregue a página (Ctrl+F5 ou Cmd+Shift+R)
2. Verifique se os erros de CORS/502 desapareceram
3. Tente finalizar um agendamento novamente

## Se o Problema Persistir

1. **Aguarde alguns minutos** - Problemas temporários do Supabase geralmente se resolvem sozinhos
2. **Verifique o console do navegador** para erros mais específicos
3. **Verifique os logs do Supabase**: https://supabase.com/dashboard/project/tegyiuktrmcqxkbjxqoc/logs/edge-logs

## Resumo

- ✅ A migration `20250109_fix_checkout_rls.sql` está correta
- ⚠️ Os erros de CORS/502 são problemas de infraestrutura do Supabase
- 🔧 Configure CORS no Supabase Dashboard
- 🔧 Verifique se a função `get_user_context` existe
- 🔧 Aplique a migration mesmo com os erros (via SQL Editor)

