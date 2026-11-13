
ALTER TABLE public.produtos ALTER COLUMN codigo DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.set_produto_codigo_interno()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.codigo_interno IS NULL OR NEW.codigo_interno = '' THEN
    NEW.codigo_interno := 'INT-' || LPAD(nextval('public.produtos_codigo_interno_seq')::text, 5, '0');
  END IF;
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := NEW.codigo_interno;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_produto_codigo_interno ON public.produtos;
CREATE TRIGGER trg_set_produto_codigo_interno
BEFORE INSERT ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.set_produto_codigo_interno();

UPDATE public.produtos SET codigo = codigo_interno WHERE codigo IS DISTINCT FROM codigo_interno;
