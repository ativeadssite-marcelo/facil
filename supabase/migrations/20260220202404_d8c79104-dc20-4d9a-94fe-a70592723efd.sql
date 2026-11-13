
-- Remove a política permissiva que permite leitura a qualquer autenticado
DROP POLICY IF EXISTS "Autenticados leem produtos" ON public.produtos;

-- Cria política restritiva: apenas admin ou vendedor podem ler produtos
CREATE POLICY "Roles autorizados leem produtos"
ON public.produtos
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'vendedor'::app_role)
);
