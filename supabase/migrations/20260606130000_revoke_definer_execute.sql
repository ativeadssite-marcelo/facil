-- Restrict EXECUTE on SECURITY DEFINER trigger-only functions so signed-in
-- users cannot call them directly. Triggers continue to invoke them as the table owner.
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- get_user_role duplicates get_current_user_role/has_role and is unused; restrict it.
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon, authenticated;
