-- Sprint 4: Metadata de tarjetas de crédito
-- Agrega campos de ciclo de facturación y pago mínimo a la tabla cuentas.
-- Solo aplican cuando tipo = 'credito', el resto de cuentas los ignora.

ALTER TABLE cuentas
  ADD COLUMN IF NOT EXISTS dia_facturacion  SMALLINT CHECK (dia_facturacion  BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS dia_vencimiento  SMALLINT CHECK (dia_vencimiento  BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS pago_minimo_pct  NUMERIC(5,2) DEFAULT 0 CHECK (pago_minimo_pct BETWEEN 0 AND 100);

COMMENT ON COLUMN cuentas.dia_facturacion IS 'Día del mes en que cierra el ciclo de la tarjeta (ej: 20)';
COMMENT ON COLUMN cuentas.dia_vencimiento  IS 'Día del mes en que vence el pago (ej: 5 del mes siguiente al cierre)';
COMMENT ON COLUMN cuentas.pago_minimo_pct  IS 'Porcentaje del saldo que se debe pagar como mínimo (ej: 5.00 = 5%)';
