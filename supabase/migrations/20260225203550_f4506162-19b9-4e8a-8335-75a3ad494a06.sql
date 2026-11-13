ALTER TABLE public.itens_orcamento ADD COLUMN produto_marca text NOT NULL DEFAULT '';
ALTER TABLE public.itens_venda ADD COLUMN produto_marca text NOT NULL DEFAULT '';