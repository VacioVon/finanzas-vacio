-- ============================================================
-- FINANZAS VACÍO — Bucket para avatares de perfil
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  2097152,   -- 2 MB máximo
  ARRAY['image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Política: el usuario puede subir su propio avatar
DROP POLICY IF EXISTS "avatars: subir" ON storage.objects;
CREATE POLICY "avatars: subir"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Política: cualquiera puede ver los avatares (bucket público)
DROP POLICY IF EXISTS "avatars: ver" ON storage.objects;
CREATE POLICY "avatars: ver"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Política: el usuario puede actualizar su avatar
DROP POLICY IF EXISTS "avatars: actualizar" ON storage.objects;
CREATE POLICY "avatars: actualizar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Política: el usuario puede eliminar su avatar
DROP POLICY IF EXISTS "avatars: eliminar" ON storage.objects;
CREATE POLICY "avatars: eliminar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

SELECT 'Bucket avatars creado correctamente' AS estado;
