
-- Add UPDATE and DELETE policies for nfe_importadas (admin only)
CREATE POLICY "Admins update nfe"
ON public.nfe_importadas AS PERMISSIVE FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete nfe"
ON public.nfe_importadas AS PERMISSIVE FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
