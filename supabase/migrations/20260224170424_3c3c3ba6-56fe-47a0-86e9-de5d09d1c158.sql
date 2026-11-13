
-- RLS para caixa
CREATE POLICY "Caixa le clientes" ON public.clientes FOR SELECT
  USING (has_role(auth.uid(), 'caixa'::app_role));

CREATE POLICY "Caixa le produtos" ON public.produtos FOR SELECT
  USING (has_role(auth.uid(), 'caixa'::app_role));

CREATE POLICY "Caixa le orcamentos" ON public.orcamentos FOR SELECT
  USING (has_role(auth.uid(), 'caixa'::app_role));

CREATE POLICY "Caixa cria orcamentos" ON public.orcamentos FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'caixa'::app_role));

CREATE POLICY "Caixa le vendas" ON public.vendas FOR SELECT
  USING (has_role(auth.uid(), 'caixa'::app_role));

CREATE POLICY "Caixa cria vendas" ON public.vendas FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'caixa'::app_role));

CREATE POLICY "Caixa le itens_orcamento" ON public.itens_orcamento FOR SELECT
  USING (has_role(auth.uid(), 'caixa'::app_role));

CREATE POLICY "Caixa insere itens_orcamento" ON public.itens_orcamento FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'caixa'::app_role));

CREATE POLICY "Caixa le itens_venda" ON public.itens_venda FOR SELECT
  USING (has_role(auth.uid(), 'caixa'::app_role));

CREATE POLICY "Caixa insere itens_venda" ON public.itens_venda FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'caixa'::app_role));

CREATE POLICY "Caixa le configuracoes" ON public.configuracoes FOR SELECT
  USING (has_role(auth.uid(), 'caixa'::app_role));

-- RLS para estoque
CREATE POLICY "Estoque le produtos" ON public.produtos FOR SELECT
  USING (has_role(auth.uid(), 'estoque'::app_role));

CREATE POLICY "Estoque edita produtos" ON public.produtos FOR UPDATE
  USING (has_role(auth.uid(), 'estoque'::app_role))
  WITH CHECK (has_role(auth.uid(), 'estoque'::app_role));

CREATE POLICY "Estoque acesso lotes" ON public.lotes FOR ALL
  USING (has_role(auth.uid(), 'estoque'::app_role))
  WITH CHECK (has_role(auth.uid(), 'estoque'::app_role));

CREATE POLICY "Estoque le nfe" ON public.nfe_importadas FOR SELECT
  USING (has_role(auth.uid(), 'estoque'::app_role));

CREATE POLICY "Estoque insere nfe" ON public.nfe_importadas FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'estoque'::app_role));

CREATE POLICY "Estoque le configuracoes" ON public.configuracoes FOR SELECT
  USING (has_role(auth.uid(), 'estoque'::app_role));
