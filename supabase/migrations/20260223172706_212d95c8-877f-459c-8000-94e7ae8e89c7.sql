
-- Remove duplicate SELECT policy
DROP POLICY IF EXISTS "Admins leem nfe" ON public.nfe_importadas;

-- Remove duplicate INSERT policy
DROP POLICY IF EXISTS "Admins insert nfe" ON public.nfe_importadas;
