-- Defense-in-depth: Add RESTRICTIVE policies on user_roles
-- PostgreSQL syntax: AS RESTRICTIVE must come before ON clause in some versions
-- Use the correct syntax with policy_name + RESTRICTIVE keyword placement

ALTER POLICY "Admins gerenciam roles" ON public.user_roles
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Create separate explicit RESTRICTIVE policies using correct syntax
-- In PostgreSQL, RESTRICTIVE is specified as: CREATE POLICY name ON table AS RESTRICTIVE ...
CREATE POLICY "Only admins insert roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins update roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins delete roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));