-- Fix: actualizar_movimiento_saldos llamaba a procesar_movimiento con 6 params
-- (sin p_movimiento_id), causando ambigüedad de sobrecarga con la versión 7-param.
-- Ahora pasa NULL explícitamente para resolver sin ambigüedad.

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
  -- Revertir el impacto original
  PERFORM public.revertir_movimiento(
    p_tipo_anterior,
    p_cuenta_anterior,
    p_cuenta_destino_anterior,
    p_objetivo_anterior,
    p_deuda_anterior,
    p_monto_anterior
  );

  -- Aplicar el nuevo impacto — pasar NULL explícito para evitar ambigüedad de sobrecarga
  PERFORM public.procesar_movimiento(
    p_tipo              => p_tipo_nuevo,
    p_cuenta_id         => p_cuenta_nueva,
    p_cuenta_destino_id => p_cuenta_destino_nueva,
    p_objetivo_id       => p_objetivo_nuevo,
    p_deuda_id          => p_deuda_nueva,
    p_monto             => p_monto_nuevo,
    p_movimiento_id     => NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Fix actualizar_movimiento_saldos aplicado' AS estado;
