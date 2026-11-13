
-- Tabela clientes
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf_cnpj text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  endereco text NOT NULL DEFAULT '',
  observacoes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Admins: acesso total
CREATE POLICY "Admin acesso total clientes"
  ON public.clientes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Vendedores: apenas leitura
CREATE POLICY "Vendedor le clientes"
  ON public.clientes FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'vendedor'::app_role));

-- Trigger updated_at
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Adicionar markup na tabela produtos
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS markup_percentual numeric NOT NULL DEFAULT 0;
