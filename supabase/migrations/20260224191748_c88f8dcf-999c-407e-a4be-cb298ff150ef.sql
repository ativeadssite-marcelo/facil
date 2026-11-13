
ALTER TABLE public.orcamentos
  ADD COLUMN frete_transportadora TEXT NOT NULL DEFAULT '',
  ADD COLUMN frete_valor NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.vendas
  ADD COLUMN frete_transportadora TEXT NOT NULL DEFAULT '',
  ADD COLUMN frete_valor NUMERIC NOT NULL DEFAULT 0;
