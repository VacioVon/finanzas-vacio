-- ============================================================
-- FINANZAS VACÍO — Sprint 2.1: usuario_id en subcategorias
-- Permite que cada usuario agregue subcategorías propias a
-- cualquier categoría (del sistema o personalizadas) sin
-- afectar las subcategorías del sistema.
-- ============================================================

-- 1. Agregar columna usuario_id a subcategorias (nullable)
--    Las subcategorías del sistema quedan con NULL.
ALTER TABLE public.subcategorias
  ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Índice para consultas por usuario
CREATE INDEX IF NOT EXISTS idx_subcategorias_usuario
  ON public.subcategorias (usuario_id);

-- 3. Eliminar política anterior (más restrictiva)
DROP POLICY IF EXISTS "subcategorias: propietario modifica" ON public.subcategorias;
DROP POLICY IF EXISTS "subcategorias: usuario puede agregar a cualquier categoria" ON public.subcategorias;

-- 4. INSERT: usuario autenticado puede agregar subcategorías propias
--    a cualquier categoría visible (del sistema o suya).
--    Solo puede insertar con su propio usuario_id y es_default = FALSE.
CREATE POLICY "subcategorias: insertar propias"
  ON public.subcategorias FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND usuario_id = auth.uid()
    AND es_default = FALSE
    AND EXISTS (
      SELECT 1 FROM public.categorias c
      WHERE c.id = subcategorias.categoria_id
        AND (c.usuario_id = auth.uid() OR c.es_default = TRUE)
    )
  );

-- 5. UPDATE/DELETE: solo el dueño puede modificar sus subcategorías
CREATE POLICY "subcategorias: modificar propias"
  ON public.subcategorias FOR UPDATE
  USING (usuario_id = auth.uid());

CREATE POLICY "subcategorias: eliminar propias"
  ON public.subcategorias FOR DELETE
  USING (usuario_id = auth.uid());

-- Verificación
SELECT 'Migración subcategorias completada' AS estado;

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'subcategorias'
  AND table_schema = 'public'
ORDER BY ordinal_position;
