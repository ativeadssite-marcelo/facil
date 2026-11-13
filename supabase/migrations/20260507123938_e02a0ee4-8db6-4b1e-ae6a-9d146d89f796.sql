-- Rotate the password that was leaked in a previous migration file (plaintext "Trocar@2026").
-- Sets a fresh random password so the leaked credential is no longer valid.
-- The user must reset their password via the "Forgot password" flow.
UPDATE auth.users
SET encrypted_password = crypt(encode(gen_random_bytes(24), 'hex'), gen_salt('bf')),
    updated_at = now()
WHERE email = 'garagemhub.contato@gmail.com';