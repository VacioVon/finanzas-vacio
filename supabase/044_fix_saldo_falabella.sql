-- Fix: el ingreso fondos_tercero de $57.781 (deuda lavadora) no fue sumado al saldo
-- de Banco Falabella Débito porque el código saltaba procesar_movimiento para
-- fondos_tercero ingresos. El gasto SÍ se descontó, dejando el saldo $57.781 abajo.
-- Este script corrige el saldo_actual sumando los ingresos fondos_tercero que faltaron.

UPDATE public.cuentas
SET saldo_actual = saldo_actual + (
  SELECT COALESCE(SUM(m.monto), 0)
  FROM public.movimientos m
  WHERE m.cuenta_id   = '2ce778db-2a07-4c61-8b64-a3db3378606a'
    AND m.fondos_tercero = TRUE
    AND m.tipo          = 'ingreso'
)
WHERE id = '2ce778db-2a07-4c61-8b64-a3db3378606a';

SELECT
  'Banco Falabella Débito' AS cuenta,
  saldo_actual             AS saldo_corregido
FROM public.cuentas
WHERE id = '2ce778db-2a07-4c61-8b64-a3db3378606a';
