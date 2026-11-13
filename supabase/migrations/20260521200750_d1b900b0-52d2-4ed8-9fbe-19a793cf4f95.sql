-- Política RESTRITIVA: bloqueia leitura de comissao_percentual para qualquer um que não seja admin
CREATE POLICY "Somente admin le comissao_percentual"
ON public.configuracoes
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  chave <> 'comissao_percentual'
  OR public.has_role(auth.uid(), 'admin'::app_role)
);