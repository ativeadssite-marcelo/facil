
-- 1. Restrict commission/sensitive config keys to admin only
DROP POLICY IF EXISTS "Caixa le configuracoes" ON public.configuracoes;
DROP POLICY IF EXISTS "Estoque le configuracoes" ON public.configuracoes;
DROP POLICY IF EXISTS "Vendedor le configuracoes" ON public.configuracoes;

CREATE POLICY "Caixa le configuracoes nao sensiveis"
ON public.configuracoes FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'caixa'::app_role)
  AND chave NOT IN ('comissao_percentual')
);

CREATE POLICY "Estoque le configuracoes nao sensiveis"
ON public.configuracoes FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'estoque'::app_role)
  AND chave NOT IN ('comissao_percentual')
);

CREATE POLICY "Vendedor le configuracoes nao sensiveis"
ON public.configuracoes FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'vendedor'::app_role)
  AND chave NOT IN ('comissao_percentual')
);

-- 2. Revoke EXECUTE on SECURITY DEFINER functions from anon and authenticated
-- These are internal helpers (RLS / triggers / RPCs) that should not be publicly callable.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- decrement_stock is an RPC called by signed-in users (caixa/vendedor) — keep authenticated.
REVOKE EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) TO authenticated;

-- 3. Revoke SELECT from anon on all public tables (RLS already restricts, but
-- this removes them from the GraphQL anon schema so they aren't discoverable
-- before sign-in).
REVOKE SELECT ON public.clientes FROM anon;
REVOKE SELECT ON public.configuracoes FROM anon;
REVOKE SELECT ON public.itens_orcamento FROM anon;
REVOKE SELECT ON public.itens_venda FROM anon;
REVOKE SELECT ON public.lotes FROM anon;
REVOKE SELECT ON public.nfe_importadas FROM anon;
REVOKE SELECT ON public.orcamentos FROM anon;
REVOKE SELECT ON public.produtos FROM anon;
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.user_roles FROM anon;
REVOKE SELECT ON public.vendas FROM anon;
