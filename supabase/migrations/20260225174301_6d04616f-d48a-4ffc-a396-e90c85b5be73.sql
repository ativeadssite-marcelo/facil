-- 1. Atomic stock decrement function
CREATE OR REPLACE FUNCTION public.decrement_stock(pid UUID, qty INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
DECLARE new_stock INT;
BEGIN
  UPDATE produtos
  SET estoque_total = GREATEST(0, estoque_total - qty)
  WHERE id = pid
  RETURNING estoque_total INTO new_stock;
  RETURN new_stock;
END;
$$;

-- 2. Missing RLS policies for itens_orcamento (vendedor UPDATE/DELETE)
CREATE POLICY "Vendedor atualiza itens de proprio orcamento"
  ON public.itens_orcamento FOR UPDATE
  USING (
    has_role(auth.uid(), 'vendedor'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.orcamentos
      WHERE id = itens_orcamento.orcamento_id
      AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'vendedor'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.orcamentos
      WHERE id = itens_orcamento.orcamento_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Vendedor deleta itens de proprio orcamento"
  ON public.itens_orcamento FOR DELETE
  USING (
    has_role(auth.uid(), 'vendedor'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.orcamentos
      WHERE id = itens_orcamento.orcamento_id
      AND created_by = auth.uid()
    )
  );