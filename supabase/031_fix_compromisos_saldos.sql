-- ============================================================
-- CORRECCIÓN: Pagos de compromisos sin descuento de saldo
--
-- Bug: registrarPagoCompromiso() insertaba movimientos en la tabla
-- pero nunca llamaba a procesar_movimiento(), dejando los saldos
-- de las cuentas sin actualizar.
--
-- Este script aplica retroactivamente el descuento para cada
-- movimiento tipo 'gasto' vinculado a un compromiso.
--
-- IMPORTANTE: Ejecutar SOLO UNA VEZ. Si ya se aplicó o los
-- saldos fueron corregidos manualmente, NO ejecutar.
-- ============================================================

-- 1. Ver el impacto antes de aplicar (ejecutar primero, revisar)
SELECT
  m.id,
  m.fecha,
  m.nota,
  m.monto,
  c.nombre   AS cuenta,
  c.saldo_actual AS saldo_actual_cuenta,
  s.nombre   AS compromiso
FROM public.movimientos m
JOIN public.cuentas c      ON c.id = m.cuenta_id
JOIN public.suscripciones s ON s.id = m.compromiso_id
WHERE m.compromiso_id IS NOT NULL
  AND m.tipo = 'gasto'
ORDER BY m.fecha ASC;

-- 2. Aplicar descuentos retroactivos (descomentar para ejecutar)
-- DO $$
-- DECLARE
--   m RECORD;
-- BEGIN
--   FOR m IN
--     SELECT id, cuenta_id, monto
--     FROM public.movimientos
--     WHERE compromiso_id IS NOT NULL
--       AND tipo = 'gasto'
--     ORDER BY fecha ASC
--   LOOP
--     PERFORM public.procesar_movimiento(
--       'gasto',     -- p_tipo
--       m.cuenta_id, -- p_cuenta_id
--       NULL,        -- p_cuenta_destino_id
--       NULL,        -- p_objetivo_id
--       NULL,        -- p_deuda_id
--       m.monto      -- p_monto
--     );
--   END LOOP;
--   RAISE NOTICE 'Saldos corregidos para movimientos vinculados a compromisos.';
-- END $$;

-- 3. Verificar resultado (ejecutar después del paso 2)
-- SELECT id, nombre, saldo_actual FROM public.cuentas ORDER BY nombre;
