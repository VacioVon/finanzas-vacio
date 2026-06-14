-- ============================================================
-- FINANZAS VACÍO — Sprint 3: Mejoras a tabla deudas
--
-- Agrega los dos campos que faltaban para cubrir todos los
-- casos reales: cuota fija mensual y fecha de término prevista.
-- También actualiza el RPC procesar_movimiento para marcar
-- automáticamente la deuda como 'pagada' al llegar a $0.
-- ============================================================

-- ─── 1. Columnas nuevas en deudas ────────────────────────────
ALTER TABLE public.deudas
  ADD COLUMN IF NOT EXISTS cuota_mensual    NUMERIC(12,2),   -- monto fijo por cuota (null = pago libre)
  ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;           -- último pago previsto (null = indefinido)

COMMENT ON COLUMN public.deudas.cuota_mensual    IS 'Monto fijo esperado por cuota. NULL para pagos libres (préstamos familiares, etc.)';
COMMENT ON COLUMN public.deudas.fecha_vencimiento IS 'Fecha estimada del último pago. NULL si no tiene plazo definido.';

-- ─── 2. Actualizar procesar_movimiento: auto-cierre de deuda ─
--    Cuando monto_pendiente llega a 0, estado → 'pagada'
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

  ELSIF p_tipo = 'pago_deuda' AND p_cuenta_id IS NOT NULL THEN
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;

    IF p_deuda_id IS NOT NULL THEN
      UPDATE public.deudas
      SET
        monto_pendiente = GREATEST(0, monto_pendiente - p_monto),
        cuotas_pagadas  = cuotas_pagadas + 1,
        -- Auto-cerrar cuando queda en 0
        estado          = CASE
                            WHEN GREATEST(0, monto_pendiente - p_monto) = 0 THEN 'pagada'
                            ELSE estado
                          END,
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

-- ─── 3. Actualizar revertir_movimiento: reabrir deuda si se revierte ─
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

  ELSIF p_tipo = 'pago_deuda' AND p_cuenta_id IS NOT NULL THEN
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;

    IF p_deuda_id IS NOT NULL THEN
      UPDATE public.deudas
      SET
        monto_pendiente = monto_pendiente + p_monto,
        cuotas_pagadas  = GREATEST(0, cuotas_pagadas - 1),
        -- Reabrir si estaba pagada
        estado          = CASE WHEN estado = 'pagada' THEN 'activa' ELSE estado END,
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
SELECT 'Sprint 3 — migración deudas aplicada' AS estado;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'deudas'
  AND column_name  IN ('cuota_mensual', 'fecha_vencimiento')
ORDER BY column_name;
