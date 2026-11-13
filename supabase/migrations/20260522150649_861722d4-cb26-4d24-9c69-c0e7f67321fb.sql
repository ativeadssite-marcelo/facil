
-- 1) Atualiza handle_new_user para também atribuir cargo padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
  v_role_text text;
BEGIN
  -- Cria perfil
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  -- Determina cargo: usa metadata "role" se válido, senão "vendedor"
  v_role_text := COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor');

  IF v_role_text NOT IN ('admin','vendedor','caixa','estoque') THEN
    v_role_text := 'vendedor';
  END IF;

  v_role := v_role_text::public.app_role;

  -- Atribui cargo (se ainda não existir)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 2) Garante unicidade para o ON CONFLICT funcionar
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_role_key
  ON public.user_roles (user_id, role);

-- 3) Recria trigger no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) Garante cargo "vendedor" para usuários existentes sem cargo
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'vendedor'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL;
