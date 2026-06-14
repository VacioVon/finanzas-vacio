-- ============================================================
-- FINANZAS VACÍO — Sprint 3.x: Comisión y tercero en cuotas
--
-- PROPÓSITO: Enriquecer cuotas_credito con:
--   1. comision — cargo adicional (impuesto, fee) asociado a la
--      financiación. Puramente informacional. No altera saldo.
--      Permite analizar costo financiero real por compra/tarjeta.
--
--   2. para_tercero + tercero_nombre — igual que en movimientos,
--      para distinguir cuotas propias de cuotas de terceros en
--      el módulo de seguimiento (especialmente reconstrucción
--      de estados de cuenta históricos sin movimiento asociado).
-- ============================================================

ALTER TABLE public.cuotas_credito
  ADD COLUMN IF NOT EXISTS comision       NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS para_tercero   BOOLEAN       NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tercero_nombre TEXT;

COMMENT ON COLUMN public.cuotas_credito.comision
  IS 'Cargo adicional asociado al financiamiento (impuesto, fee, comisión banco). Informacional — no altera saldo ni monto_cuota.';
COMMENT ON COLUMN public.cuotas_credito.para_tercero
  IS 'TRUE si la compra fue realizada para otra persona. Permite filtrar cuotas propias vs terceros.';
COMMENT ON COLUMN public.cuotas_credito.tercero_nombre
  IS 'Nombre de la persona para quien se realizó la compra.';

SELECT 'Campos comision, para_tercero y tercero_nombre agregados a cuotas_credito' AS estado;
