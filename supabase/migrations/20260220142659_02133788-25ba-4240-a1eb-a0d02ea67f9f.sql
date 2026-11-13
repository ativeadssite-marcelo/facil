
-- Fix: Restrict nfe_importadas SELECT to admins only
-- Removes CNPJ, invoice values and XML exposure to all authenticated users
DROP POLICY IF EXISTS "Autenticados leem nfe" ON public.nfe_importadas;

CREATE POLICY "Admins leem nfe"
  ON public.nfe_importadas
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
