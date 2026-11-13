
-- ===========================================
-- FIX: Adicionar políticas PERMISSIVE em TODAS as tabelas
-- Sem ao menos 1 PERMISSIVE, ninguém consegue acessar nada
-- ===========================================

-- ===== PRODUTOS =====
-- Dropar a policy "Vendedores leem produtos" que foi criada errada como RESTRICTIVE
DROP POLICY IF EXISTS "Vendedores leem produtos" ON public.produtos;

-- Permissive: admins full access
CREATE POLICY "Admins full access produtos"
ON public.produtos AS PERMISSIVE FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Permissive: vendedores leem produtos
CREATE POLICY "Vendedores leem produtos"
ON public.produtos AS PERMISSIVE FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'vendedor'::app_role));

-- ===== LOTES =====
CREATE POLICY "Admins full access lotes"
ON public.lotes AS PERMISSIVE FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== NFE_IMPORTADAS =====
CREATE POLICY "Admins full access nfe"
ON public.nfe_importadas AS PERMISSIVE FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert nfe"
ON public.nfe_importadas AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== PROFILES =====
CREATE POLICY "Proprio perfil select"
ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Proprio perfil insert"
ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Proprio perfil update"
ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin ve todos perfis"
ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== USER_ROLES =====
CREATE POLICY "Usuario ve proprio role"
ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admin gerencia roles"
ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
