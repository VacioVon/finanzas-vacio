-- ============================================================
-- SALDO ANTERIOR EN MOVIMIENTOS
-- Guarda el saldo de la cuenta justo antes de cada movimiento
-- para trazabilidad histórica.
-- ============================================================

-- 1. Agregar columna
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS saldo_anterior NUMERIC DEFAULT NULL;

-- 2. Reemplazar procesar_movimiento con param opcional p_movimiento_id
--    (backward-compatible: DEFAULT NULL)
CREATE OR REPLACE FUNCTION public.procesar_movimiento(
  p_tipo               TEXT,
  p_cuenta_id          UUID,
  p_cuenta_destino_id  UUID,
  p_objetivo_id        UUID,
  p_deuda_id           UUID,
  p_monto              NUMERIC,
  p_movimiento_id      UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_saldo_anterior NUMERIC;
BEGIN
  -- Capturar saldo previo (solo si se pasó el id del movimiento)
  IF p_movimiento_id IS NOT NULL AND p_cuenta_id IS NOT NULL THEN
    SELECT saldo_actual INTO v_saldo_anterior
      FROM public.cuentas
     WHERE id = p_cuenta_id AND usuario_id = auth.uid();

    UPDATE public.movimientos
       SET saldo_anterior = v_saldo_anterior
     WHERE id = p_movimiento_id;
  END IF;

  -- Lógica original de actualización de saldos
  IF p_tipo = 'ingreso' AND p_cuenta_id IS NOT NULL THEN
    UPDATE public.cuentas
       SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
     WHERE id = p_cuenta_id AND usuario_id = auth.uid();

  ELSIF p_tipo = 'gasto' AND p_cuenta_id IS NOT NULL THEN
    UPDATE public.cuentas
       SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
     WHERE id = p_cuenta_id AND usuario_id = auth.uid();

  ELSIF p_tipo = 'ahorro' AND p_cuenta_id IS NOT NULL THEN
    UPDATE public.cuentas
       SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
     WHERE id = p_cuenta_id AND usuario_id = auth.uid();

  ELSIF p_tipo = 'pago_deuda' AND p_cuenta_id IS NOT NULL THEN
    UPDATE public.cuentas
       SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
     WHERE id = p_cuenta_id AND usuario_id = auth.uid();

    IF p_deuda_id IS NOT NULL THEN
      UPDATE public.deudas
         SET monto_pendiente = GREATEST(0, monto_pendiente - p_monto),
             cuotas_pagadas  = cuotas_pagadas + 1,
             estado          = CASE
                                 WHEN GREATEST(0, monto_pendiente - p_monto) = 0
                                 THEN 'pagada' ELSE estado
                               END,
             updated_at      = NOW()
       WHERE id = p_deuda_id AND usuario_id = auth.uid();
    END IF;

  ELSIF p_tipo = 'transferencia'
        AND p_cuenta_id IS NOT NULL
        AND p_cuenta_destino_id IS NOT NULL THEN
    UPDATE public.cuentas
       SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
     WHERE id = p_cuenta_id AND usuario_id = auth.uid();

    UPDATE public.cuentas
       SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
     WHERE id = p_cuenta_destino_id AND usuario_id = auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
