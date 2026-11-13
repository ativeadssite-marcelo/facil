
-- Adiciona política PERMISSIVE de SELECT para vendedores
-- (a RESTRICTIVE já filtra quem pode; agora precisamos de uma PERMISSIVE que permita)
CREATE POLICY "Vendedores leem produtos"
ON public.produtos
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'vendedor'::app_role)
);
