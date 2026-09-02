-- ============================================================
-- QUEMEN LOS BARCOS — Limpieza de datos de prueba
--
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- SOLO después de revisar el audit_datos_usuario.sql
--
-- QUÉ HACE:
--   Elimina todos los datos transaccionales/financieros
--   del usuario, respetando el orden de foreign keys.
--
-- QUÉ NO HACE:
--   ✗ No elimina el usuario de auth
--   ✗ No elimina el perfil (profiles)
--   ✗ No elimina categorías base (es_default = TRUE)
--   ✗ No modifica ninguna tabla ni esquema
--   ✗ No toca datos de otros usuarios
--
-- INSTRUCCIONES:
--   1. Ejecutar audit_datos_usuario.sql y revisar los resultados
--   2. Confirmar que el usuario_id es el correcto
--   3. Decidir si borrar cuentas (ver Opción A / Opción B abajo)
--   4. Ejecutar este script
--   5. Verificar que los conteos quedaron en 0
-- ============================================================

-- ─── CONFIGURACIÓN ──────────────────────────────────────────
-- Si tienes un solo usuario, esto lo detecta automáticamente.
-- Si tienes varios, reemplaza por el UUID de tu usuario:
-- \set uid 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

DO $$
DECLARE
  v_uid UUID := (SELECT id FROM public.profiles LIMIT 1);
  -- ^^^ Cambia LIMIT 1 por: WHERE id = 'TU-UUID' si tienes más de un usuario

  -- ─── CONTEOS ANTES ───────────────────────────────────────
  n_movimientos        INT;
  n_cuotas             INT;
  n_aportes            INT;
  n_presupuestos       INT;
  n_suscripciones      INT;
  n_deudas             INT;
  n_objetivos          INT;
  n_eventos            INT;
  n_salud              INT;
  n_cuentas            INT;
  n_cats_propias       INT;
  n_subcats_propias    INT;

BEGIN

  RAISE NOTICE '============================================';
  RAISE NOTICE 'LIMPIEZA INICIADA — Usuario: %', v_uid;
  RAISE NOTICE '============================================';

  -- Conteos antes
  SELECT COUNT(*) INTO n_movimientos   FROM public.movimientos       WHERE usuario_id = v_uid;
  SELECT COUNT(*) INTO n_cuotas        FROM public.cuotas_credito    WHERE usuario_id = v_uid;
  SELECT COUNT(*) INTO n_aportes       FROM public.aportes_objetivos WHERE usuario_id = v_uid;
  SELECT COUNT(*) INTO n_presupuestos  FROM public.presupuestos      WHERE usuario_id = v_uid;
  SELECT COUNT(*) INTO n_suscripciones FROM public.suscripciones     WHERE usuario_id = v_uid;
  SELECT COUNT(*) INTO n_deudas        FROM public.deudas            WHERE usuario_id = v_uid;
  SELECT COUNT(*) INTO n_objetivos     FROM public.objetivos_ahorro  WHERE usuario_id = v_uid;
  SELECT COUNT(*) INTO n_eventos       FROM public.eventos_calendario WHERE usuario_id = v_uid;
  SELECT COUNT(*) INTO n_salud         FROM public.salud_financiera  WHERE usuario_id = v_uid;
  SELECT COUNT(*) INTO n_cuentas       FROM public.cuentas           WHERE usuario_id = v_uid;
  SELECT COUNT(*) INTO n_cats_propias  FROM public.categorias        WHERE usuario_id = v_uid AND es_default = FALSE;
  SELECT COUNT(*) INTO n_subcats_propias FROM public.subcategorias   WHERE usuario_id = v_uid;

  RAISE NOTICE 'ANTES:';
  RAISE NOTICE '  movimientos:       %', n_movimientos;
  RAISE NOTICE '  cuotas_credito:    %', n_cuotas;
  RAISE NOTICE '  aportes_objetivos: %', n_aportes;
  RAISE NOTICE '  presupuestos:      %', n_presupuestos;
  RAISE NOTICE '  suscripciones:     %', n_suscripciones;
  RAISE NOTICE '  deudas:            %', n_deudas;
  RAISE NOTICE '  objetivos_ahorro:  %', n_objetivos;
  RAISE NOTICE '  eventos_calendario:%', n_eventos;
  RAISE NOTICE '  salud_financiera:  %', n_salud;
  RAISE NOTICE '  cuentas:           % (ver opciones abajo)', n_cuentas;
  RAISE NOTICE '  cats propias:      % (ver opciones abajo)', n_cats_propias;

  -- ─── ELIMINACIÓN EN ORDEN FK ─────────────────────────────

  -- 1. Aportes a objetivos (hijo de objetivos_ahorro)
  DELETE FROM public.aportes_objetivos  WHERE usuario_id = v_uid;
  RAISE NOTICE 'OK aportes_objetivos eliminados';

  -- 2. Cuotas de crédito (hijo de cuentas)
  DELETE FROM public.cuotas_credito     WHERE usuario_id = v_uid;
  RAISE NOTICE 'OK cuotas_credito eliminadas';

  -- 3. Movimientos (hijo de cuentas, deudas, objetivos, categorias)
  DELETE FROM public.movimientos        WHERE usuario_id = v_uid;
  RAISE NOTICE 'OK movimientos eliminados';

  -- 4. Suscripciones (hijo de cuentas, categorias)
  DELETE FROM public.suscripciones      WHERE usuario_id = v_uid;
  RAISE NOTICE 'OK suscripciones eliminadas';

  -- 5. Presupuestos (hijo de categorias)
  DELETE FROM public.presupuestos       WHERE usuario_id = v_uid;
  RAISE NOTICE 'OK presupuestos eliminados';

  -- 6. Objetivos de ahorro (ya sin aportes)
  DELETE FROM public.objetivos_ahorro   WHERE usuario_id = v_uid;
  RAISE NOTICE 'OK objetivos_ahorro eliminados';

  -- 7. Deudas (ya sin movimientos)
  DELETE FROM public.deudas             WHERE usuario_id = v_uid;
  RAISE NOTICE 'OK deudas eliminadas';

  -- 8. Eventos del calendario
  DELETE FROM public.eventos_calendario WHERE usuario_id = v_uid;
  RAISE NOTICE 'OK eventos_calendario eliminados';

  -- 9. Salud financiera
  DELETE FROM public.salud_financiera   WHERE usuario_id = v_uid;
  RAISE NOTICE 'OK salud_financiera eliminada';

  -- ─── OPCIÓN A: Conservar cuentas y tarjetas ──────────────
  -- Las cuentas/tarjetas se quedan tal como están.
  -- Sus saldos quedan en los valores iniciales (saldo_inicial).
  -- RECOMENDADO si quieres reutilizar la misma configuración.

  -- Resetear saldos a su valor inicial (limpiar efecto de movimientos)
  UPDATE public.cuentas
     SET saldo_actual = saldo_inicial, updated_at = NOW()
   WHERE usuario_id = v_uid;
  RAISE NOTICE 'OK cuentas: saldo_actual reseteado a saldo_inicial';

  -- ─── OPCIÓN B: Borrar también cuentas ────────────────────
  -- Descomenta las siguientes líneas si prefieres borrar todo:
  --
  -- DELETE FROM public.cuentas WHERE usuario_id = v_uid;
  -- RAISE NOTICE 'OK cuentas eliminadas';

  -- ─── OPCIÓN C: Borrar categorías propias ─────────────────
  -- Las categorías creadas por ti (no las del sistema).
  -- Descomenta si las quieres borrar también:
  --
  -- DELETE FROM public.subcategorias WHERE usuario_id = v_uid;
  -- DELETE FROM public.categorias WHERE usuario_id = v_uid AND es_default = FALSE;
  -- RAISE NOTICE 'OK categorias propias eliminadas';

  -- ─── VERIFICACIÓN FINAL ──────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE 'VERIFICACIÓN FINAL:';
  RAISE NOTICE '  movimientos:       %', (SELECT COUNT(*) FROM public.movimientos       WHERE usuario_id = v_uid);
  RAISE NOTICE '  cuotas_credito:    %', (SELECT COUNT(*) FROM public.cuotas_credito    WHERE usuario_id = v_uid);
  RAISE NOTICE '  aportes_objetivos: %', (SELECT COUNT(*) FROM public.aportes_objetivos WHERE usuario_id = v_uid);
  RAISE NOTICE '  presupuestos:      %', (SELECT COUNT(*) FROM public.presupuestos      WHERE usuario_id = v_uid);
  RAISE NOTICE '  suscripciones:     %', (SELECT COUNT(*) FROM public.suscripciones     WHERE usuario_id = v_uid);
  RAISE NOTICE '  deudas:            %', (SELECT COUNT(*) FROM public.deudas            WHERE usuario_id = v_uid);
  RAISE NOTICE '  objetivos_ahorro:  %', (SELECT COUNT(*) FROM public.objetivos_ahorro  WHERE usuario_id = v_uid);
  RAISE NOTICE '  eventos_calendario:%', (SELECT COUNT(*) FROM public.eventos_calendario WHERE usuario_id = v_uid);
  RAISE NOTICE '  cuentas:           %', (SELECT COUNT(*) FROM public.cuentas           WHERE usuario_id = v_uid);
  RAISE NOTICE '  saldo_actual reset:';

  FOR v_uid IN
    SELECT usuario_id FROM public.cuentas WHERE usuario_id = v_uid
  LOOP
    -- solo para iterar si quedan cuentas
  END LOOP;

  -- Mostrar cuentas con saldo reseteado
  RAISE NOTICE '';
  RAISE NOTICE '  Cuentas y saldos actuales:';

  -- (Aquí no podemos hacer RAISE NOTICE en loop fácilmente, ver SELECT abajo)

  RAISE NOTICE '============================================';
  RAISE NOTICE 'LIMPIEZA COMPLETADA';
  RAISE NOTICE '============================================';

END;
$$;

-- Ver cuentas que quedaron (con saldo reseteado)
SELECT nombre, tipo, saldo_inicial, saldo_actual
FROM public.cuentas
WHERE usuario_id = (SELECT id FROM public.profiles LIMIT 1)
ORDER BY created_at;

-- ─── ARCHIVOS EN STORAGE ────────────────────────────────────
-- Los comprobantes en Storage NO se borran automáticamente
-- porque las políticas RLS del bucket los protegen por carpeta.
-- Para borrarlos: Supabase Dashboard → Storage → comprobantes
-- → Seleccionar la carpeta con tu user_id → Delete.
--
-- O ejecutar esto (requiere service_role, no anon key):
-- DELETE FROM storage.objects
-- WHERE bucket_id = 'comprobantes'
--   AND (storage.foldername(name))[1] = 'TU_UUID_AQUI';
