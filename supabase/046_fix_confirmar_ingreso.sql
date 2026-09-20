-- Fix confirmar_ingreso_esperado:
-- 1. columna era "descripcion" pero la tabla movimientos usa "nota"
-- 2. llamada posicional a procesar_movimiento era ambigua entre overloads
--    (6-param vs 7-param con DEFAULT NULL) → "function not unique"

CREATE OR REPLACE FUNCTION public.confirmar_ingreso_esperado(
  p_user_id      UUID,
  p_instancia_id UUID,
  p_monto_real   NUMERIC,
  p_fecha_real   DATE DEFAULT CURRENT_DATE,
  p_nota         TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inst    RECORD;
  v_mov_id  UUID;
BEGIN
  SELECT ie.*, ir.cuenta_id AS v_cuenta_id, ir.nombre AS v_nombre
  INTO   v_inst
  FROM   ingresos_esperados   ie
  JOIN   ingresos_recurrentes ir ON ir.id = ie.ingreso_recurrente_id
  WHERE  ie.id         = p_instancia_id
    AND  ie.usuario_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'instancia_no_encontrada');
  END IF;

  IF v_inst.estado = 'confirmado' THEN
    RETURN jsonb_build_object('ok', TRUE, 'ya_confirmado', TRUE, 'movimiento_id', v_inst.movimiento_id);
  END IF;

  INSERT INTO movimientos (
    usuario_id, tipo, fecha, cuenta_id, monto,
    nota, para_tercero, created_at, updated_at
  )
  VALUES (
    p_user_id, 'ingreso', p_fecha_real, v_inst.v_cuenta_id, p_monto_real,
    COALESCE(p_nota, v_inst.v_nombre), FALSE, NOW(), NOW()
  )
  RETURNING id INTO v_mov_id;

  -- Named params para evitar ambigüedad entre overloads de 6 y 7 parámetros
  PERFORM public.procesar_movimiento(
    p_tipo              => 'ingreso',
    p_cuenta_id         => v_inst.v_cuenta_id,
    p_cuenta_destino_id => NULL,
    p_objetivo_id       => NULL,
    p_deuda_id          => NULL,
    p_monto             => p_monto_real,
    p_movimiento_id     => v_mov_id
  );

  UPDATE ingresos_esperados
  SET    estado        = 'confirmado',
         movimiento_id = v_mov_id,
         updated_at    = NOW()
  WHERE  id = p_instancia_id;

  BEGIN
    PERFORM process_rpg_event(p_user_id, 'INGRESO_REGISTRADO', v_mov_id, 'movimiento', '{}');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'ok',            TRUE,
    'movimiento_id', v_mov_id,
    'monto',         p_monto_real
  );
END;
$$;
