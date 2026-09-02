-- ============================================================
-- FINANZAS VACÍO — Mejoras modelo financiero
-- Sprint: financial-001
-- SEGURO: solo additive (ADD COLUMN, CREATE OR REPLACE)
-- NO ejecutar hasta verificar saldos CMR Falabella en prueba
-- ============================================================

-- ─── 1. DEUDAS: agregar tipo_deuda ───────────────────────────
ALTER TABLE public.deudas
  ADD COLUMN IF NOT EXISTS tipo_deuda TEXT
    CHECK (tipo_deuda IN (
      'credito_consumo',
      'prestamo_personal',
      'credito_comercial',
      'deuda_persona',
      'tarjeta_credito',
      'otra'
    ));

-- ─── 2. MOVIMIENTOS: nuevas columnas ─────────────────────────
-- fondos_tercero: ingreso recibido en nombre de otra persona
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS fondos_tercero BOOLEAN NOT NULL DEFAULT FALSE;

-- movimiento_origen_id: permite vincular cobros/ingresos de terceros
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS movimiento_origen_id UUID
    REFERENCES public.movimientos(id) ON DELETE SET NULL;

-- capital / interes_pago: desglose de pagos de deuda
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS capital NUMERIC(12,2);

ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS interes_pago NUMERIC(12,2);

-- ─── 3. MOVIMIENTOS: extender CHECK tipo ─────────────────────
-- Agrega 'pago_tarjeta' sin modificar datos existentes
ALTER TABLE public.movimientos
  DROP CONSTRAINT IF EXISTS movimientos_tipo_check;

ALTER TABLE public.movimientos
  ADD CONSTRAINT movimientos_tipo_check CHECK (
    tipo IN ('ingreso','gasto','ahorro','pago_deuda','transferencia','pago_tarjeta')
  );

-- ─── 4. RPC: procesar_movimiento con pago_tarjeta ────────────
CREATE OR REPLACE FUNCTION public.procesar_movimiento(
  p_tipo               TEXT,
  p_cuenta_id          UUID,
  p_cuenta_destino_id  UUID,
  p_objetivo_id        UUID,
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
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;
    IF p_objetivo_id IS NOT NULL THEN
      UPDATE public.objetivos_ahorro
      SET monto_actual = monto_actual + p_monto, updated_at = NOW()
      WHERE id = p_objetivo_id;
    END IF;

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

  -- pago_tarjeta: cuenta bancaria -> tarjeta de credito
  -- p_cuenta_id     = cuenta origen (banco/efectivo que paga)
  -- p_cuenta_destino_id = tarjeta de credito (recupera cupo)
  ELSIF p_tipo = 'pago_tarjeta'
        AND p_cuenta_id IS NOT NULL
        AND p_cuenta_destino_id IS NOT NULL THEN
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
    WHERE id = p_cuenta_destino_id;
    IF p_deuda_id IS NOT NULL THEN
      UPDATE public.deudas
      SET monto_pendiente = GREATEST(0, monto_pendiente - p_monto),
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

-- ─── 5. RPC: revertir_movimiento con pago_tarjeta ────────────
-- Espejo exacto de procesar_movimiento (usado por eliminar/actualizar)
CREATE OR REPLACE FUNCTION public.revertir_movimiento(
  p_tipo               TEXT,
  p_cuenta_id          UUID,
  p_cuenta_destino_id  UUID,
  p_objetivo_id        UUID,
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
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;
    IF p_objetivo_id IS NOT NULL THEN
      UPDATE public.objetivos_ahorro
      SET monto_actual = GREATEST(0, monto_actual - p_monto), updated_at = NOW()
      WHERE id = p_objetivo_id;
    END IF;

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

  ELSIF p_tipo = 'pago_tarjeta'
        AND p_cuenta_id IS NOT NULL
        AND p_cuenta_destino_id IS NOT NULL THEN
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
    WHERE id = p_cuenta_destino_id;
    IF p_deuda_id IS NOT NULL THEN
      UPDATE public.deudas
      SET monto_pendiente = monto_pendiente + p_monto,
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

-- ─── 6. RPC: pagar_cuota actualiza saldo de la tarjeta ───────
-- Al marcar una cuota como pagada, la tarjeta recupera ese cupo
CREATE OR REPLACE FUNCTION public.pagar_cuota(
  p_cuota_id UUID
)
RETURNS public.cuotas_credito AS $$
DECLARE
  v_cuota public.cuotas_credito;
BEGIN
  UPDATE public.cuotas_credito
  SET
    cuotas_pagadas = cuotas_pagadas + 1,
    estado = CASE
               WHEN cuotas_pagadas + 1 >= cuotas_total THEN 'completada'
               ELSE 'activa'
             END,
    updated_at = NOW()
  WHERE id         = p_cuota_id
    AND usuario_id = auth.uid()
    AND estado     = 'activa'
    AND cuotas_pagadas < cuotas_total
  RETURNING * INTO v_cuota;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuota no encontrada, ya completada, o sin permisos: %', p_cuota_id;
  END IF;

  -- Recuperar cupo en la tarjeta (saldo_actual sube por monto_cuota)
  UPDATE public.cuentas
  SET saldo_actual = saldo_actual + v_cuota.monto_cuota, updated_at = NOW()
  WHERE id = v_cuota.cuenta_id;

  RETURN v_cuota;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 7. RPC: deshacer_pago_cuota también revierte el saldo ───
CREATE OR REPLACE FUNCTION public.deshacer_pago_cuota(
  p_cuota_id UUID
)
RETURNS public.cuotas_credito AS $$
DECLARE
  v_cuota public.cuotas_credito;
BEGIN
  UPDATE public.cuotas_credito
  SET
    cuotas_pagadas = GREATEST(0, cuotas_pagadas - 1),
    estado = 'activa',
    updated_at = NOW()
  WHERE id         = p_cuota_id
    AND usuario_id = auth.uid()
    AND cuotas_pagadas > 0
  RETURNING * INTO v_cuota;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuota no encontrada o sin pagos que deshacer: %', p_cuota_id;
  END IF;

  -- Revertir: la tarjeta vuelve a tener ese cupo comprometido
  UPDATE public.cuentas
  SET saldo_actual = saldo_actual - v_cuota.monto_cuota, updated_at = NOW()
  WHERE id = v_cuota.cuenta_id;

  RETURN v_cuota;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Verificación ─────────────────────────────────────────────
SELECT 'Migración 023: financial improvements aplicada' AS estado;

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'movimientos'
  AND column_name IN ('fondos_tercero','movimiento_origen_id','capital','interes_pago')
ORDER BY column_name;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'deudas'
  AND column_name = 'tipo_deuda';
