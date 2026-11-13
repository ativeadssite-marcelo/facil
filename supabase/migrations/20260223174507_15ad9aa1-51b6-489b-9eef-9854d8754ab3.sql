
INSERT INTO public.user_roles (user_id, role)
VALUES ('fdecf054-9755-478b-9c9d-57d114c50b84', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
