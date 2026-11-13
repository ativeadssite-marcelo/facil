-- Fix 1: Restrict lotes SELECT to admins only
-- Removes cost/supplier data exposure to regular employees
DROP POLICY IF EXISTS "Autenticados leem lotes" ON public.lotes;

CREATE POLICY "Admins leem lotes"
  ON public.lotes
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Remove hardcoded test admin account from migration
-- Delete user_roles, profile and auth user for admin@teste.com
DELETE FROM public.user_roles
  WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@teste.com');

DELETE FROM public.profiles
  WHERE id IN (SELECT id FROM auth.users WHERE email = 'admin@teste.com');

DELETE FROM auth.users WHERE email = 'admin@teste.com';