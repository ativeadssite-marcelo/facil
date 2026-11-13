
ALTER TABLE public.produtos
  ADD COLUMN tipo_veiculo TEXT NOT NULL DEFAULT 'Carro';

ALTER TABLE public.clientes
  ADD COLUMN whatsapp TEXT NOT NULL DEFAULT '';
