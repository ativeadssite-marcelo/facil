-- Criar usuário admin diretamente (sem confirmação de email)
-- Senha: Teste@123
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  role,
  aud,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@teste.com',
  crypt('Teste@123', gen_salt('bf')),
  now(),
  '{"nome": "Admin Teste"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  ''
);

-- Criar perfil para o usuário admin (o trigger já deve ter feito isso)
INSERT INTO public.profiles (id, nome)
SELECT id, 'Admin Teste'
FROM auth.users WHERE email = 'admin@teste.com'
ON CONFLICT (id) DO NOTHING;

-- Atribuir role admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users WHERE email = 'admin@teste.com';
