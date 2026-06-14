-- ============================================================
-- FINANZAS VACÍO — Sprint 3.x: Flag "para tercero" en movimientos
--
-- PROPÓSITO: Marcar gastos realizados para otra persona que
-- luego reembolsará el dinero. Estos movimientos:
--   ✓ Afectan el saldo de la cuenta (la deuda existe)
--   ✗ NO se incluyen en análisis de gasto personal
--   ✗ NO impactan presupuestos
--   ✗ NO aparecen en el resumen mensual de gastos
--
-- FUTURO (Sprint 3.2): Módulo "Cuentas por Cobrar" que crea
-- un activo por cobrar y afecta correctamente el patrimonio neto.
-- ============================================================

ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS para_tercero   BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tercero_nombre TEXT;

COMMENT ON COLUMN public.movimientos.para_tercero   IS 'TRUE si el gasto fue realizado para otra persona que reembolsará el dinero';
COMMENT ON COLUMN public.movimientos.tercero_nombre IS 'Nombre de la persona para quien se realizó el gasto';

-- Índice para filtrar eficientemente en análisis
CREATE INDEX IF NOT EXISTS idx_movimientos_para_tercero
  ON public.movimientos (usuario_id, para_tercero)
  WHERE para_tercero = TRUE;

SELECT 'Flag para_tercero agregado a movimientos' AS estado;
