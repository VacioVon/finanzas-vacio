-- ============================================================
-- DEUDA TARJETA DE CRÉDITO: recuperar cupo al pagar
--
-- Cuando una deuda tiene cuenta_id apuntando a una tarjeta de
-- crédito, al registrar un pago_deuda el saldo_actual de la
-- tarjeta sube (+monto) → se recupera el cupo disponible.
-- ============================================================

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
  -- Capturar saldo previo si se pasó el id del movimiento
  IF p_movimiento_id IS NOT NULL AND p_cuenta_id IS NOT NULL THEN
    SELECT saldo_actual INTO v_saldo_anterior
      FROM public.cuentas
     WHERE id = p_cuenta_id AND usuario_id = auth.uid();

    UPDATE public.movimientos
       SET saldo_anterior = v_saldo_anterior
     WHERE id = p_movimiento_id;
  END IF;

  -- Lógica de saldos
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
    -- Descontar de la cuenta origen (ej: Banco Estado)
    UPDATE public.cuentas
       SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
     WHERE id = p_cuenta_id AND usuario_id = auth.uid();

    IF p_deuda_id IS NOT NULL THEN
      -- Reducir monto pendiente de la deuda
      UPDATE public.deudas
         SET monto_pendiente = GREATEST(0, monto_pendiente - p_monto),
             cuotas_pagadas  = cuotas_pagadas + 1,
             estado          = CASE
                                 WHEN GREATEST(0, monto_pendiente - p_monto) = 0
                                 THEN 'pagada' ELSE estado
                               END,
             updated_at      = NOW()
       WHERE id = p_deuda_id AND usuario_id = auth.uid();

      -- Si la deuda está vinculada a una tarjeta de crédito,
      -- recuperar el cupo (saldo_actual sube = menos deuda con el banco)
      UPDATE public.cuentas c
         SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
        FROM public.deudas d
       WHERE d.id        = p_deuda_id
         AND d.cuenta_id = c.id
         AND d.usuario_id = auth.uid()
         AND c.tipo      = 'credito';
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
