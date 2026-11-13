-- Garantir sequence
CREATE SEQUENCE IF NOT EXISTS public.produtos_codigo_interno_seq START 1;

-- Ajustar sequence para o maior valor já usado em INT-NNNNN
SELECT setval(
  'public.produtos_codigo_interno_seq',
  GREATEST(
    COALESCE((
      SELECT MAX(NULLIF(regexp_replace(codigo_interno, '\D', '', 'g'), '')::int)
      FROM public.produtos
      WHERE codigo_interno ~ '^INT-\d+$'
    ), 0),
    1
  )
);

-- Criar trigger BEFORE INSERT para gerar codigo_interno automaticamente
DROP TRIGGER IF EXISTS trg_set_produto_codigo_interno ON public.produtos;
CREATE TRIGGER trg_set_produto_codigo_interno
BEFORE INSERT ON public.produtos
FOR EACH ROW
EXECUTE FUNCTION public.set_produto_codigo_interno();