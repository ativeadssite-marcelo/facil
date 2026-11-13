INSERT INTO public.user_roles (user_id, role)
VALUES ('d5440e89-6ccc-4797-b1a1-3b9ee2737df9', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;