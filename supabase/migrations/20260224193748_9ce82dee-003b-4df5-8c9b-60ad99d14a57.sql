
INSERT INTO public.configuracoes (chave, valor) VALUES 
  ('icms_percentual', '17'),
  ('ipi_percentual', '0'),
  ('pis_percentual', '1.65'),
  ('cofins_percentual', '7.6')
ON CONFLICT DO NOTHING;
