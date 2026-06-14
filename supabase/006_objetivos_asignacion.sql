-- ============================================================
-- FINANZAS VACÍO — Sprint 2.2: Separar objetivos de movimientos
--
-- PROBLEMA: procesar_movimiento actualizaba objetivo.monto_actual
-- al crear un ahorro, lo que debitaba la cuenta Y actualizaba el
-- objetivo — tratando el objetivo como transferencia contable.
--
-- SOLUCIÓN: Los objetivos son etiquetas de propósito, no cuentas.
-- monto_actual se gestiona de forma independiente vía
-- asignar_fondos_objetivo(). Los movimientos tipo='ahorro' solo
-- afectan cuentas, nunca objetivos.
-- ============================================================

-- ─── 1. Nueva RPC: asignar fondos a objetivo (sin tocar cuentas) ─
CREATE OR REPLACE FUNCTION public.asignar_fondos_objetivo(
  p_objetivo_id  UUID,
  p_delta        NUMERIC   -- positivo = agregar, negativo = quitar
)
RETURNS public.objetivos_ahorro AS $$
DECLARE
  v_obj public.objetivos_ahorro;
BEGIN
  UPDATE public.objetivos_ahorro
  SET
    monto_actual = GREATEST(0, monto_actual + p_delta),
    updated_at   = NOW()
  WHERE id = p_objetivo_id
    AND usuario_id = auth.uid()    -- RLS adicional en la función
  RETURNING * INTO v_obj;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Objetivo no encontrado o sin permisos: %', p_objetivo_id;
  END IF;

  RETURN v_obj;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 2. Limpiar procesar_movimiento: tipo='ahorro' ya NO toca objetivos ─
--     (solo actualiza la cuenta origen, como un gasto de ahorro real)
CREATE OR REPLACE FUNCTION public.procesar_movimiento(
  p_tipo               TEXT,
  p_cuenta_id          UUID,
  p_cuenta_destino_id  UUID,
  p_objetivo_id        UUID,   -- ignorado intencionalmente para tipo='ahorro'
  p_deuda_id           UUID,
  p_monto              NUMERIC
)
RETURNS VOID AS $$
BEGIN
  IF p_tipo = 'ingreso' AND p_cuenta_id IS NOT NULL THEN
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;

  ELSIF p_tipo = 'gasto' AND p_cuenta_id IS NOT NULL THEN
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;

  ELSIF p_tipo = 'ahorro' AND p_cuenta_id IS NOT NULL THEN
    -- Solo debita la cuenta. El objetivo se gestiona de forma independiente
    -- vía asignar_fondos_objetivo(). No mezclamos contabilidad con propósito.
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;

  ELSIF p_tipo = 'pago_deuda' AND p_cuenta_id IS NOT NULL THEN
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;
    IF p_deuda_id IS NOT NULL THEN
      UPDATE public.deudas
      SET monto_pendiente = GREATEST(0, monto_pendiente - p_monto),
          cuotas_pagadas  = cuotas_pagadas + 1,
          updated_at      = NOW()
      WHERE id = p_deuda_id;
    END IF;

  ELSIF p_tipo = 'transferencia'
        AND p_cuenta_id IS NOT NULL
        AND p_cuenta_destino_id IS NOT NULL THEN
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
    WHERE id = p_cuenta_destino_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 3. Limpiar revertir_movimiento: tipo='ahorro' ya NO toca objetivos ─
CREATE OR REPLACE FUNCTION public.revertir_movimiento(
  p_tipo               TEXT,
  p_cuenta_id          UUID,
  p_cuenta_destino_id  UUID,
  p_objetivo_id        UUID,   -- ignorado para tipo='ahorro'
  p_deuda_id           UUID,
  p_monto              NUMERIC
)
RETURNS VOID AS $$
BEGIN
  IF p_tipo = 'ingreso' AND p_cuenta_id IS NOT NULL THEN
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;

  ELSIF p_tipo = 'gasto' AND p_cuenta_id IS NOT NULL THEN
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;

  ELSIF p_tipo = 'ahorro' AND p_cuenta_id IS NOT NULL THEN
    -- Solo restaura la cuenta. El objetivo no cambia automáticamente.
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;

  ELSIF p_tipo = 'pago_deuda' AND p_cuenta_id IS NOT NULL THEN
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;
    IF p_deuda_id IS NOT NULL THEN
      UPDATE public.deudas
      SET monto_pendiente = monto_pendiente + p_monto,
          cuotas_pagadas  = GREATEST(0, cuotas_pagadas - 1),
          updated_at      = NOW()
      WHERE id = p_deuda_id;
    END IF;

  ELSIF p_tipo = 'transferencia'
        AND p_cuenta_id IS NOT NULL
        AND p_cuenta_destino_id IS NOT NULL THEN
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
    WHERE id = p_cuenta_destino_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificación
SELECT 'Funciones de objetivos actualizadas correctamente' AS estado;
SELECT proname FROM pg_proc
WHERE proname IN ('asignar_fondos_objetivo','procesar_movimiento','revertir_movimiento')
ORDER BY proname;
