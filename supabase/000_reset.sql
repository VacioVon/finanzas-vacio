-- ============================================================
-- FINANZAS VACÍO — RESET COMPLETO
-- ⚠️  EJECUTAR SOLO ESTE SCRIPT PRIMERO
-- ⚠️  ELIMINA TODO: tablas, políticas, funciones, triggers
-- ============================================================

-- Eliminar tablas en orden (respetando dependencias FK)
DROP TABLE IF EXISTS public.salud_financiera       CASCADE;
DROP TABLE IF EXISTS public.eventos_calendario     CASCADE;
DROP TABLE IF EXISTS public.suscripciones          CASCADE;
DROP TABLE IF EXISTS public.movimientos            CASCADE;
DROP TABLE IF EXISTS public.deudas                 CASCADE;
DROP TABLE IF EXISTS public.presupuestos           CASCADE;
DROP TABLE IF EXISTS public.objetivos_ahorro       CASCADE;
DROP TABLE IF EXISTS public.subcategorias          CASCADE;
DROP TABLE IF EXISTS public.categorias             CASCADE;
DROP TABLE IF EXISTS public.cuentas                CASCADE;
DROP TABLE IF EXISTS public.profiles               CASCADE;

-- Eliminar funciones
DROP FUNCTION IF EXISTS public.handle_new_user()         CASCADE;
DROP FUNCTION IF EXISTS public.ajustar_saldo_cuenta(UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.procesar_movimiento(TEXT, UUID, UUID, UUID, UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at()          CASCADE;

-- Eliminar trigger en auth.users (si existe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Confirmar que está todo limpio
SELECT 'RESET COMPLETO. Ahora ejecuta 001_schema.sql' AS estado;
