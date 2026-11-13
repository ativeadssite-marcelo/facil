-- 1) Rotate admin password (random, unknown) — user must reset via "Forgot Password"
UPDATE auth.users
SET encrypted_password = crypt(encode(gen_random_bytes(24), 'hex'), gen_salt('bf')),
    updated_at = now()
WHERE email = 'garagemhub.contato@gmail.com';

-- 2) Lock down SECURITY DEFINER helpers not needed by signed-in users.
-- `has_role` is still required by RLS policies and remains callable.
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_current_user_role() FROM PUBLIC, anon, authenticated;