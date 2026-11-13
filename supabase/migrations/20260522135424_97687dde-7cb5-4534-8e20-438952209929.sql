GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'vendedor' THEN 2
    WHEN 'caixa' THEN 3
    WHEN 'estoque' THEN 4
    ELSE 5
  END
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_current_user_role() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;