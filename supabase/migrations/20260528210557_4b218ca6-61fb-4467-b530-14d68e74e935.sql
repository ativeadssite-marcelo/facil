ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS codigo_fabrica text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS codigo_interno text NOT NULL DEFAULT '';

ALTER TABLE public.itens_orcamento
  ADD COLUMN IF NOT EXISTS produto_codigo_fabrica text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS produto_codigo_interno text NOT NULL DEFAULT '';

ALTER TABLE public.itens_venda
  ADD COLUMN IF NOT EXISTS produto_codigo_fabrica text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS produto_codigo_interno text NOT NULL DEFAULT '';

CREATE SEQUENCE IF NOT EXISTS public.produtos_codigo_interno_seq START 1;

CREATE OR REPLACE FUNCTION public.set_produto_codigo_interno()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo_interno IS NULL OR NEW.codigo_interno = '' THEN
    NEW.codigo_interno := 'INT-' || LPAD(nextval('public.produtos_codigo_interno_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_produto_codigo_interno ON public.produtos;
CREATE TRIGGER trg_set_produto_codigo_interno
BEFORE INSERT ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.set_produto_codigo_interno();

-- Backfill existentes
UPDATE public.produtos
SET codigo_interno = 'INT-' || LPAD(nextval('public.produtos_codigo_interno_seq')::text, 5, '0')
WHERE codigo_interno IS NULL OR codigo_interno = '';

CREATE UNIQUE INDEX IF NOT EXISTS produtos_codigo_interno_uniq ON public.produtos(codigo_interno) WHERE codigo_interno <> '';