ALTER TABLE public.produtos 
  ADD COLUMN IF NOT EXISTS preco_custo numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS frete_custo numeric NOT NULL DEFAULT 0;