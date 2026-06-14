-- ============================================================
-- FINANZAS VACÍO — Sprint 2: RLS adicional
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Subcategorías propias: el usuario puede crear/editar/eliminar
-- subcategorías que pertenecen a sus categorías personalizadas
DROP POLICY IF EXISTS "subcategorias: propietario modifica" ON public.subcategorias;
CREATE POLICY "subcategorias: propietario modifica"
  ON public.subcategorias FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.categorias c
      WHERE c.id = subcategorias.categoria_id
        AND c.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.categorias c
      WHERE c.id = subcategorias.categoria_id
        AND c.usuario_id = auth.uid()
    )
  );

SELECT 'Sprint 2 SQL aplicado correctamente' AS estado;
