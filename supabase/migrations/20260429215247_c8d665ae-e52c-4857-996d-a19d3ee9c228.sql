-- RLS policies for the private 'garagem' storage bucket
-- SELECT: any authenticated user can view files
CREATE POLICY "Garagem: authenticated can view"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'garagem');

-- INSERT: only admin or estoque can upload
CREATE POLICY "Garagem: admin/estoque can upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'garagem'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'estoque'::public.app_role)
  )
);

-- UPDATE: only admin or estoque can update
CREATE POLICY "Garagem: admin/estoque can update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'garagem'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'estoque'::public.app_role)
  )
)
WITH CHECK (
  bucket_id = 'garagem'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'estoque'::public.app_role)
  )
);

-- DELETE: only admin can delete
CREATE POLICY "Garagem: admin can delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'garagem'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);