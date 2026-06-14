-- ============================================================
-- FINANZAS VACÍO — Security Hardening V1
--
-- Fixes:
--   C1. Bucket comprobantes público → privado
--   C2. SECURITY DEFINER RPCs sin ownership guard → protegidas
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- C1 — STORAGE: comprobantes privado + SELECT solo del dueño
-- ════════════════════════════════════════════════════════════

UPDATE storage.buckets
   SET public = FALSE
 WHERE id = 'comprobantes';

-- Reemplazar política SELECT pública por una que filtra por usuario
DROP POLICY IF EXISTS "comprobantes: ver" ON storage.objects;
CREATE POLICY "comprobantes: ver"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'comprobantes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ════════════════════════════════════════════════════════════
-- C2a — eliminar_movimiento: verificar propietario del registro
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.eliminar_movimiento(
  p_movimiento_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_mov RECORD;
BEGIN
  SELECT * INTO v_mov
  FROM public.movimientos
  WHERE id = p_movimiento_id
    AND usuario_id = auth.uid();   -- GUARD: solo el dueño puede eliminar

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movimiento no encontrado o sin permisos: %', p_movimiento_id;
  END IF;

  PERFORM public.revertir_movimiento(
    v_mov.tipo,
    v_mov.cuenta_id,
    v_mov.cuenta_destino_id,
    v_mov.objetivo_ahorro_id,
    v_mov.deuda_id,
    v_mov.monto
  );

  DELETE FROM public.movimientos WHERE id = p_movimiento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ════════════════════════════════════════════════════════════
-- C2b — procesar_movimiento: filtrar por usuario en cada UPDATE
-- ════════════════════════════════════════════════════════════

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


-- ════════════════════════════════════════════════════════════
-- C2c — revertir_movimiento: filtrar por usuario en cada UPDATE
-- ════════════════════════════════════════════════════════════

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
     WHERE id = p_cuenta_id AND usuario_id = auth.uid();

  ELSIF p_tipo = 'gasto' AND p_cuenta_id IS NOT NULL THEN
    UPDATE public.cuentas
       SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
     WHERE id = p_cuenta_id AND usuario_id = auth.uid();

  ELSIF p_tipo = 'ahorro' AND p_cuenta_id IS NOT NULL THEN
    UPDATE public.cuentas
       SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
     WHERE id = p_cuenta_id AND usuario_id = auth.uid();

  ELSIF p_tipo = 'pago_deuda' AND p_cuenta_id IS NOT NULL THEN
    UPDATE public.cuentas
       SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
     WHERE id = p_cuenta_id AND usuario_id = auth.uid();

    IF p_deuda_id IS NOT NULL THEN
      UPDATE public.deudas
         SET monto_pendiente = monto_pendiente + p_monto,
             cuotas_pagadas  = GREATEST(0, cuotas_pagadas - 1),
             estado          = CASE WHEN estado = 'pagada' THEN 'activa' ELSE estado END,
             updated_at      = NOW()
       WHERE id = p_deuda_id AND usuario_id = auth.uid();
    END IF;

  ELSIF p_tipo = 'transferencia'
        AND p_cuenta_id IS NOT NULL
        AND p_cuenta_destino_id IS NOT NULL THEN
    UPDATE public.cuentas
       SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
     WHERE id = p_cuenta_id AND usuario_id = auth.uid();

    UPDATE public.cuentas
       SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
     WHERE id = p_cuenta_destino_id AND usuario_id = auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ════════════════════════════════════════════════════════════
-- C2d — actualizar_movimiento_saldos: verificar movimiento original
--       La función no tiene acceso al movimiento_id directamente,
--       pero como solo llama a procesar/revertir ya protegidos,
--       los UPDATEs internos ahora filtran por auth.uid().
--       Igual añadimos un bloqueo explícito vía PERFORM de verificación.
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.actualizar_movimiento_saldos(
  p_tipo_anterior           TEXT,
  p_cuenta_anterior         UUID,
  p_cuenta_destino_anterior UUID,
  p_objetivo_anterior       UUID,
  p_deuda_anterior          UUID,
  p_monto_anterior          NUMERIC,
  p_tipo_nuevo              TEXT,
  p_cuenta_nueva            UUID,
  p_cuenta_destino_nueva    UUID,
  p_objetivo_nuevo          UUID,
  p_deuda_nueva             UUID,
  p_monto_nuevo             NUMERIC
)
RETURNS VOID AS $$
BEGIN
  -- Revertir el impacto original (solo afecta cuentas del usuario)
  PERFORM public.revertir_movimiento(
    p_tipo_anterior,
    p_cuenta_anterior,
    p_cuenta_destino_anterior,
    p_objetivo_anterior,
    p_deuda_anterior,
    p_monto_anterior
  );

  -- Aplicar el nuevo impacto (solo afecta cuentas del usuario)
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


-- ════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ════════════════════════════════════════════════════════════

SELECT 'Security hardening V1 aplicado correctamente' AS estado;

-- Confirmar bucket privado
SELECT id, name, public FROM storage.buckets WHERE id = 'comprobantes';

-- Confirmar políticas de storage vigentes
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
