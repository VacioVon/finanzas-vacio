-- ============================================================
-- BACKFILL: saldo_anterior para movimientos históricos
--
-- Reconstruye el saldo previo de cada movimiento trabajando
-- en ORDEN INVERSO desde el saldo_actual conocido de cada cuenta.
--
-- Lógica: si el saldo actual es S y el último movimiento fue
-- un gasto de X, entonces antes de ese gasto había S + X.
-- ============================================================

DO $$
DECLARE
  acct     RECORD;
  mov      RECORD;
  v_running NUMERIC;
  v_saldo_ant NUMERIC;
BEGIN
  FOR acct IN
    SELECT id, saldo_actual FROM public.cuentas
  LOOP
    v_running := acct.saldo_actual;

    FOR mov IN
      SELECT id, tipo, monto, cuenta_id, cuenta_destino_id
      FROM public.movimientos
      WHERE cuenta_id = acct.id OR cuenta_destino_id = acct.id
      ORDER BY fecha DESC, created_at DESC
    LOOP
      IF mov.cuenta_destino_id = acct.id AND mov.cuenta_id <> acct.id THEN
        -- Cuenta es DESTINO de una transferencia: recibió +monto
        -- Ajustar v_running pero NO setear saldo_anterior
        -- (saldo_anterior queda en la cuenta origen)
        v_running := v_running - mov.monto;

      ELSE
        -- Cuenta es la cuenta principal del movimiento (cuenta_id = acct.id)
        IF mov.tipo = 'ingreso' THEN
          -- Saldo subió por este movimiento: antes era menos
          v_saldo_ant := v_running - mov.monto;
        ELSE
          -- gasto, ahorro, pago_deuda, transferencia-origen: saldo bajó
          v_saldo_ant := v_running + mov.monto;
        END IF;

        -- Solo actualizar si aún es NULL (no pisar los que ya tienen valor)
        UPDATE public.movimientos
           SET saldo_anterior = v_saldo_ant
         WHERE id = mov.id AND saldo_anterior IS NULL;

        v_running := v_saldo_ant;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Backfill saldo_anterior completado.';
END $$;

-- Verificar cuántos quedaron sin saldo_anterior
SELECT COUNT(*) FILTER (WHERE saldo_anterior IS NULL) AS sin_saldo,
       COUNT(*)                                        AS total
FROM public.movimientos;
