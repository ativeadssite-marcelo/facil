
-- Tabela de vendas
CREATE TABLE public.vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  numero text NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome text NOT NULL DEFAULT '',
  total numeric NOT NULL DEFAULT 0,
  forma_pagamento text NOT NULL DEFAULT 'Dinheiro',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de itens da venda
CREATE TABLE public.itens_venda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id uuid REFERENCES public.vendas(id) ON DELETE CASCADE NOT NULL,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL,
  produto_nome text NOT NULL DEFAULT '',
  produto_codigo text NOT NULL DEFAULT '',
  quantidade integer NOT NULL DEFAULT 1,
  preco_unitario numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0
);

-- Sequência para numeração de vendas
CREATE SEQUENCE public.venda_numero_seq START WITH 1;

-- RLS
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;

-- Policies vendas
CREATE POLICY "Admin acesso total vendas" ON public.vendas FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Vendedor le vendas" ON public.vendas FOR SELECT
  USING (has_role(auth.uid(), 'vendedor'::app_role));

CREATE POLICY "Vendedor cria vendas" ON public.vendas FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'vendedor'::app_role));

-- Policies itens_venda
CREATE POLICY "Admin acesso total itens_venda" ON public.itens_venda FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Vendedor le itens_venda" ON public.itens_venda FOR SELECT
  USING (has_role(auth.uid(), 'vendedor'::app_role));

CREATE POLICY "Vendedor insere itens_venda" ON public.itens_venda FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'vendedor'::app_role));
