-- ============================================================
-- FINANZAS VACÍO — Sprint 2.3: Historial de aportes a objetivos
--
-- PROBLEMA: asignar_fondos_objetivo solo actualizaba monto_actual
-- sin guardar cuándo ni cuánto se asignó, impidiendo estadísticas
-- mensuales de ahorro intencional.
--
-- SOLUCIÓN: Nueva tabla aportes_objetivos que registra cada evento
-- de asignación con fecha y nota. El RPC ahora hace ambas cosas
-- atómicamente: actualiza el objetivo + registra el aporte.
-- ============================================================

-- ─── 1. Tabla de historial ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.aportes_objetivos (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id   UUID         NOT NULL REFERENCES public.profiles(id)          ON DELETE CASCADE,
  objetivo_id  UUID         NOT NULL REFERENCES public.objetivos_ahorro(id)  ON DELETE CASCADE,
  monto        NUMERIC(15,2) NOT NULL,   -- positivo = aporte, negativo = retiro
  tipo         TEXT         NOT NULL DEFAULT 'aporte'
                            CHECK (tipo IN ('aporte', 'retiro', 'ajuste')),
  fecha        DATE         NOT NULL DEFAULT CURRENT_DATE,
  nota         TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── 2. RLS ──────────────────────────────────────────────────────
ALTER TABLE public.aportes_objetivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aportes_obj: usuario ve los suyos"
  ON public.aportes_objetivos FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "aportes_obj: usuario inserta los suyos"
  ON public.aportes_objetivos FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "aportes_obj: usuario elimina los suyos"
  ON public.aportes_objetivos FOR DELETE
  USING (usuario_id = auth.uid());

-- ─── 3. Índices ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_aportes_obj_usuario_fecha
  ON public.aportes_objetivos (usuario_id, fecha);

CREATE INDEX IF NOT EXISTS idx_aportes_obj_objetivo
  ON public.aportes_objetivos (objetivo_id);

-- ─── 4. RPC actualizada: ahora registra historial atómicamente ───
--
--   p_delta  > 0  →  tipo 'aporte'   (registra progreso)
--   p_delta  < 0  →  tipo 'retiro'   (descuenta progreso)
--   p_nota        →  comentario opcional del usuario
--   p_fecha       →  fecha del aporte (por defecto hoy)
--
CREATE OR REPLACE FUNCTION public.asignar_fondos_objetivo(
  p_objetivo_id  UUID,
  p_delta        NUMERIC,
  p_nota         TEXT    DEFAULT NULL,
  p_fecha        DATE    DEFAULT CURRENT_DATE
)
RETURNS public.objetivos_ahorro AS $$
DECLARE
  v_obj   public.objetivos_ahorro;
  v_tipo  TEXT;
  v_uid   UUID;
BEGIN
  v_uid  := auth.uid();
  v_tipo := CASE WHEN p_delta >= 0 THEN 'aporte' ELSE 'retiro' END;

  -- Actualizar objetivo de forma atómica
  UPDATE public.objetivos_ahorro
  SET
    monto_actual = GREATEST(0, monto_actual + p_delta),
    updated_at   = NOW()
  WHERE id        = p_objetivo_id
    AND usuario_id = v_uid
  RETURNING * INTO v_obj;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Objetivo no encontrado o sin permisos: %', p_objetivo_id;
  END IF;

  -- Registrar en historial (siempre, incluso retiros)
  INSERT INTO public.aportes_objetivos
    (usuario_id, objetivo_id, monto, tipo, fecha, nota)
  VALUES
    (v_uid, p_objetivo_id, p_delta, v_tipo, p_fecha, p_nota);

  RETURN v_obj;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificación
SELECT 'aportes_objetivos migración aplicada correctamente' AS estado;
SELECT
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'aportes_objetivos') AS tabla_existe,
  proname AS rpc
FROM pg_proc WHERE proname = 'asignar_fondos_objetivo';
