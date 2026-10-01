-- Ajuste cartola Banco Falabella Débito:
-- App tenía parte personal de WiFi y teléfono; banco cobró el total incluyendo
-- porción de mamá y Sebastián. Se agregan las diferencias como fondos_tercero
-- y un gasto menor para cuadrar el saldo exacto con la cartola ($204.323).

DO $$
DECLARE
  v_user_id  uuid := '1efded94-1423-417c-8c6b-56fd54c2364d';
  v_cuenta   uuid := '2ce778db-2a07-4c61-8b64-a3db3378606a';
  v_saldo    numeric;
  v_mov_id   uuid;
BEGIN

  -- 1. Porción WiFi mamá + Sebastián
  --    App registró $8.530 personal; banco pagó $25.592 total → diferencia $17.062
  SELECT saldo_actual INTO v_saldo FROM cuentas WHERE id = v_cuenta;
  INSERT INTO movimientos
    (usuario_id, tipo, fecha, monto, cuenta_id, nota, fondos_tercero, para_tercero, saldo_anterior)
  VALUES
    (v_user_id, 'gasto', '2026-09-04', 17062, v_cuenta,
     'Porción WiFi casa mamá y Sebastián (TOKU SPA)', true, false, v_saldo)
  RETURNING id INTO v_mov_id;

  PERFORM public.procesar_movimiento(
    p_tipo              => 'gasto',
    p_cuenta_id         => v_cuenta,
    p_cuenta_destino_id => NULL,
    p_objetivo_id       => NULL,
    p_deuda_id          => NULL,
    p_monto             => 17062,
    p_movimiento_id     => v_mov_id
  );

  -- 2. Porción plan teléfono mamá
  --    App registró $4.819 personal; banco pagó $14.457 total → diferencia $9.638
  SELECT saldo_actual INTO v_saldo FROM cuentas WHERE id = v_cuenta;
  INSERT INTO movimientos
    (usuario_id, tipo, fecha, monto, cuenta_id, nota, fondos_tercero, para_tercero, saldo_anterior)
  VALUES
    (v_user_id, 'gasto', '2026-09-04', 9638, v_cuenta,
     'Porción plan teléfono mamá (ENTEL)', true, false, v_saldo)
  RETURNING id INTO v_mov_id;

  PERFORM public.procesar_movimiento(
    p_tipo              => 'gasto',
    p_cuenta_id         => v_cuenta,
    p_cuenta_destino_id => NULL,
    p_objetivo_id       => NULL,
    p_deuda_id          => NULL,
    p_monto             => 9638,
    p_movimiento_id     => v_mov_id
  );

  -- 3. Ajuste final para cuadrar saldo exacto con cartola ($204.323)
  --    Diferencia restante: $205.863 - $204.323 = $1.540
  SELECT saldo_actual INTO v_saldo FROM cuentas WHERE id = v_cuenta;
  INSERT INTO movimientos
    (usuario_id, tipo, fecha, monto, cuenta_id, nota, fondos_tercero, para_tercero, saldo_anterior)
  VALUES
    (v_user_id, 'gasto', '2026-09-06', 1540, v_cuenta,
     'Ajuste diferencia cartola septiembre', false, false, v_saldo)
  RETURNING id INTO v_mov_id;

  PERFORM public.procesar_movimiento(
    p_tipo              => 'gasto',
    p_cuenta_id         => v_cuenta,
    p_cuenta_destino_id => NULL,
    p_objetivo_id       => NULL,
    p_deuda_id          => NULL,
    p_monto             => 1540,
    p_movimiento_id     => v_mov_id
  );

END $$;

SELECT nombre, saldo_actual AS saldo_final FROM cuentas WHERE id = '2ce778db-2a07-4c61-8b64-a3db3378606a';
