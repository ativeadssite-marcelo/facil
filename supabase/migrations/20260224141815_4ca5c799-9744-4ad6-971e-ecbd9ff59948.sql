
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Usuario ve proprio role" ON public.user_roles;
DROP POLICY IF EXISTS "Admin gerencia roles" ON public.user_roles;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Usuario ve proprio role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin gerencia roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
