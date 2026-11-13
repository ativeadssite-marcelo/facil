
-- Tabela de orçamentos
CREATE TABLE public.orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome text NOT NULL DEFAULT '',
  cliente_telefone text NOT NULL DEFAULT '',
  cliente_cpf_cnpj text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pendente',
  subtotal numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  observacoes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de itens do orçamento
CREATE TABLE public.itens_orcamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid REFERENCES public.orcamentos(id) ON DELETE CASCADE NOT NULL,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL,
  produto_nome text NOT NULL DEFAULT '',
  produto_codigo text NOT NULL DEFAULT '',
  quantidade integer NOT NULL DEFAULT 1,
  preco_unitario numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sequência para numeração automática
CREATE SEQUENCE public.orcamento_numero_seq START WITH 1;

-- RLS
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_orcamento ENABLE ROW LEVEL SECURITY;

-- Policies orcamentos
CREATE POLICY "Admin acesso total orcamentos" ON public.orcamentos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Vendedor le orcamentos" ON public.orcamentos FOR SELECT
  USING (has_role(auth.uid(), 'vendedor'::app_role));

CREATE POLICY "Vendedor cria orcamentos" ON public.orcamentos FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'vendedor'::app_role));

CREATE POLICY "Vendedor atualiza proprio orcamento" ON public.orcamentos FOR UPDATE
  USING (has_role(auth.uid(), 'vendedor'::app_role) AND created_by = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'vendedor'::app_role) AND created_by = auth.uid());

-- Policies itens_orcamento
CREATE POLICY "Admin acesso total itens_orcamento" ON public.itens_orcamento FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Vendedor le itens_orcamento" ON public.itens_orcamento FOR SELECT
  USING (has_role(auth.uid(), 'vendedor'::app_role));

CREATE POLICY "Vendedor insere itens_orcamento" ON public.itens_orcamento FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'vendedor'::app_role));

-- Trigger updated_at
CREATE TRIGGER set_updated_at_orcamentos
  BEFORE UPDATE ON public.orcamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
