-- ============================================================
-- FINANZAS VACÍO — Sprint 3.x: Campo comision en movimientos
--
-- PROPÓSITO: Registrar el cargo adicional (impuesto, fee) que
-- aparece en el estado de cuenta asociado a una compra con
-- tarjeta de crédito, independientemente del número de cuotas.
--
-- Ejemplo real: COMPRA MERCADOPAGO $23.984 (1 cuota)
--               IMPUESTO COMPRA CUOTAS $140
--
-- El $140 se registra en comision del movimiento. No altera
-- el monto contable (saldo de cuenta lo maneja la cuota real).
-- Permite analítica futura: total comisiones pagadas por mes/tarjeta.
-- ============================================================

ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS comision NUMERIC(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.movimientos.comision
  IS 'Cargo adicional (impuesto, fee, comisión banco) asociado a esta compra con tarjeta. Informacional — no afecta saldo contable.';

SELECT 'Campo comision agregado a movimientos' AS estado;
