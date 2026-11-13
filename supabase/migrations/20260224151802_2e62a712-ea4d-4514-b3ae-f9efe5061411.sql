CREATE TABLE public.configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  valor text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin acesso total configuracoes"
  ON public.configuracoes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Vendedor le configuracoes"
  ON public.configuracoes FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'vendedor'::app_role));

-- Seed default settings
INSERT INTO public.configuracoes (chave, valor) VALUES
  ('empresa_nome', ''),
  ('empresa_cnpj', ''),
  ('empresa_endereco', ''),
  ('empresa_telefone', ''),
  ('empresa_email', ''),
  ('markup_padrao', '30'),
  ('moeda', 'BRL')
ON CONFLICT (chave) DO NOTHING;