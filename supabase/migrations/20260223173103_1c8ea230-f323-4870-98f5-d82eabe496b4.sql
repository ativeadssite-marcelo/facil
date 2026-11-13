
-- === LOTES: remover duplicatas ===
DROP POLICY IF EXISTS "Admins gerenciam lotes" ON public.lotes;
DROP POLICY IF EXISTS "Admins leem lotes" ON public.lotes;

-- === PRODUTOS: remover duplicatas ===
DROP POLICY IF EXISTS "Admins gerenciam produtos" ON public.produtos;
DROP POLICY IF EXISTS "Roles autorizados leem produtos" ON public.produtos;

-- === PROFILES: remover duplicatas ===
DROP POLICY IF EXISTS "Usuários criam seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins veem todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários veem seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários atualizam seu próprio perfil" ON public.profiles;

-- === USER_ROLES: remover duplicatas ===
DROP POLICY IF EXISTS "Admins gerenciam roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins veem todos os roles" ON public.user_roles;
DROP POLICY IF EXISTS "Usuário vê seu próprio role" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins update roles" ON public.user_roles;
