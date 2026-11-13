
-- Atribuir role admin ao usuário garagemhub.contato@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('a5f54687-8257-4014-bbb3-5d5a7b370a88', 'admin')
ON CONFLICT DO NOTHING;
