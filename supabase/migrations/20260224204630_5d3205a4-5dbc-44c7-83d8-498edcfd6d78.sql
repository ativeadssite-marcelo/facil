
-- Add InfinitePay and MercadoPago config keys
INSERT INTO public.configuracoes (chave, valor) VALUES
  ('infinitepay_habilitado', 'false'),
  ('mercadopago_habilitado', 'false')
ON CONFLICT DO NOTHING;
