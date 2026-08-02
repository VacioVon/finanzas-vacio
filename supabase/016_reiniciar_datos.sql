-- ============================================================
-- FINANZAS VACÍO — RPC: Reiniciar todos los datos del usuario
--
-- Elimina TODOS los datos financieros del usuario autenticado.
-- Conserva: cuenta de auth, perfil, categorías propias.
-- ============================================================

CREATE OR REPLACE FUNCTION public.reiniciar_datos_usuario()
RETURNS void AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Orden importa: primero los hijos, luego los padres
  DELETE FROM public.aportes_objetivos  WHERE usuario_id = v_uid;
  DELETE FROM public.cuotas_credito     WHERE usuario_id = v_uid;
  DELETE FROM public.movimientos        WHERE usuario_id = v_uid;
  DELETE FROM public.suscripciones      WHERE usuario_id = v_uid;
  DELETE FROM public.presupuestos       WHERE usuario_id = v_uid;
  DELETE FROM public.objetivos_ahorro   WHERE usuario_id = v_uid;
  DELETE FROM public.deudas             WHERE usuario_id = v_uid;
  DELETE FROM public.cuentas            WHERE usuario_id = v_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'RPC reiniciar_datos_usuario creada' AS estado;
