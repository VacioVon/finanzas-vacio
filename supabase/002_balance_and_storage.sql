-- ============================================================
-- FINANZAS VACÍO — Funciones de reversión + Storage
-- Ejecutar en Supabase SQL Editor DESPUÉS de 001_initial_schema.sql
-- ============================================================

-- ─── FUNCIÓN: Revertir impacto de un movimiento en saldos ────
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
  -- Invierte exactamente lo que hizo procesar_movimiento
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

  ELSIF p_tipo = 'transferencia'
        AND p_cuenta_id IS NOT NULL
        AND p_cuenta_destino_id IS NOT NULL THEN
    -- Invierte: devuelve dinero al origen, quita del destino
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
    WHERE id = p_cuenta_destino_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── FUNCIÓN: Eliminar movimiento con reversión de saldos ────
CREATE OR REPLACE FUNCTION public.eliminar_movimiento(
  p_movimiento_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_mov RECORD;
BEGIN
  -- Obtener datos del movimiento antes de eliminarlo
  SELECT * INTO v_mov
  FROM public.movimientos
  WHERE id = p_movimiento_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movimiento no encontrado: %', p_movimiento_id;
  END IF;

  -- Revertir impacto en saldos
  PERFORM public.revertir_movimiento(
    v_mov.tipo,
    v_mov.cuenta_id,
    v_mov.cuenta_destino_id,
    v_mov.objetivo_ahorro_id,
    v_mov.deuda_id,
    v_mov.monto
  );

  -- Eliminar el registro
  DELETE FROM public.movimientos WHERE id = p_movimiento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── FUNCIÓN: Actualizar movimiento con reversión + reaplicación ─
CREATE OR REPLACE FUNCTION public.actualizar_movimiento_saldos(
  p_tipo_anterior          TEXT,
  p_cuenta_anterior        UUID,
  p_cuenta_destino_anterior UUID,
  p_objetivo_anterior      UUID,
  p_deuda_anterior         UUID,
  p_monto_anterior         NUMERIC,
  p_tipo_nuevo             TEXT,
  p_cuenta_nueva           UUID,
  p_cuenta_destino_nueva   UUID,
  p_objetivo_nuevo         UUID,
  p_deuda_nueva            UUID,
  p_monto_nuevo            NUMERIC
)
RETURNS VOID AS $$
BEGIN
  -- 1. Revertir el impacto original
  PERFORM public.revertir_movimiento(
    p_tipo_anterior,
    p_cuenta_anterior,
    p_cuenta_destino_anterior,
    p_objetivo_anterior,
    p_deuda_anterior,
    p_monto_anterior
  );

  -- 2. Aplicar el nuevo impacto
  PERFORM public.procesar_movimiento(
    p_tipo_nuevo,
    p_cuenta_nueva,
    p_cuenta_destino_nueva,
    p_objetivo_nuevo,
    p_deuda_nueva,
    p_monto_nuevo
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── STORAGE: Bucket para comprobantes ───────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprobantes',
  'comprobantes',
  TRUE,
  5242880,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Política: el usuario puede subir sus comprobantes
DROP POLICY IF EXISTS "comprobantes: subir" ON storage.objects;
CREATE POLICY "comprobantes: subir"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'comprobantes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Política: el usuario puede ver sus comprobantes (bucket público, pero por si acaso)
DROP POLICY IF EXISTS "comprobantes: ver" ON storage.objects;
CREATE POLICY "comprobantes: ver"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'comprobantes');

-- Política: el usuario puede eliminar sus comprobantes
DROP POLICY IF EXISTS "comprobantes: eliminar" ON storage.objects;
CREATE POLICY "comprobantes: eliminar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'comprobantes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Verificación
SELECT 'Funciones y Storage creados correctamente' AS estado;
SELECT proname FROM pg_proc
WHERE proname IN ('revertir_movimiento','eliminar_movimiento','actualizar_movimiento_saldos')
ORDER BY proname;
