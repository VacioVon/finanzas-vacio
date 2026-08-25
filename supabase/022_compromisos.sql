-- ============================================================
-- FINANZAS VACÍO — Compromisos (evolución de suscripciones)
-- ============================================================
-- La tabla `suscripciones` se evoluciona in-place.
-- Nombre UI: "Compromisos". Nombre DB: suscripciones (compatibilidad).

-- 1. Nuevas columnas en suscripciones
ALTER TABLE public.suscripciones
  ADD COLUMN IF NOT EXISTS tipo       TEXT NOT NULL DEFAULT 'servicio'
    CHECK (tipo IN ('servicio', 'gasto_fijo')),
  ADD COLUMN IF NOT EXISTS monto_tipo TEXT NOT NULL DEFAULT 'fijo'
    CHECK (monto_tipo IN ('fijo', 'estimado')),
  ADD COLUMN IF NOT EXISTS fecha_fin  DATE;

-- 2. Expandir constraint de frecuencia
ALTER TABLE public.suscripciones
  DROP CONSTRAINT IF EXISTS suscripciones_frecuencia_check;

ALTER TABLE public.suscripciones
  ADD CONSTRAINT suscripciones_frecuencia_check
    CHECK (frecuencia IN (
      'semanal', 'quincenal', 'mensual',
      'bimestral', 'trimestral', 'semestral', 'anual'
    ));

-- 3. FK compromiso_id en movimientos (igual que deuda_id)
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS compromiso_id UUID
    REFERENCES public.suscripciones(id) ON DELETE SET NULL;

-- 4. Índice para consultas de historial por compromiso
CREATE INDEX IF NOT EXISTS idx_movimientos_compromiso_id
  ON public.movimientos(compromiso_id)
  WHERE compromiso_id IS NOT NULL;

-- 5. Documentación
COMMENT ON TABLE  public.suscripciones IS
  'Compromisos financieros recurrentes (obligaciones existentes). '
  'Nombre UI: Compromisos. tipo: servicio | gasto_fijo. '
  'monto_tipo: fijo (exacto) | estimado (referencia aproximada).';

COMMENT ON COLUMN public.suscripciones.tipo IS
  'servicio = Netflix, Spotify, gym, seguros. gasto_fijo = luz, agua, dividendo.';

COMMENT ON COLUMN public.suscripciones.monto_tipo IS
  'fijo = monto exacto conocido. estimado = valor de referencia, puede variar.';

COMMENT ON COLUMN public.suscripciones.fecha_fin IS
  'Fecha en que expira el compromiso. NULL = indefinido.';

COMMENT ON COLUMN public.movimientos.compromiso_id IS
  'FK al compromiso que originó este movimiento (suscripciones.id).';

SELECT 'Migration 022 aplicada: Compromisos' AS estado;
