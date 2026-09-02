-- ============================================================
-- FINANZAS VACÍO — Sistema de Ingresos Recurrentes Flexibles
-- Migration 025
-- ============================================================

-- ─── 1. FUENTES DE INGRESO (agrupador) ───────────────────────
CREATE TABLE public.fuentes_ingreso (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  activa      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fuentes_ingreso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuentes_ingreso_own" ON public.fuentes_ingreso
  FOR ALL USING (auth.uid() = usuario_id);

-- ─── 2. INGRESOS RECURRENTES ──────────────────────────────────
CREATE TABLE public.ingresos_recurrentes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fuente_id       UUID REFERENCES public.fuentes_ingreso(id) ON DELETE SET NULL,
  nombre          TEXT NOT NULL,
  monto_esperado  NUMERIC(12,2) NOT NULL CHECK (monto_esperado > 0),
  cuenta_id       UUID REFERENCES public.cuentas(id) ON DELETE SET NULL,
  frecuencia      TEXT NOT NULL CHECK (frecuencia IN ('mensual','quincenal','semanal','bimestral')),
  dia_esperado    SMALLINT NOT NULL CHECK (dia_esperado BETWEEN 1 AND 31),
  tolerancia_dias SMALLINT NOT NULL DEFAULT 0 CHECK (tolerancia_dias >= 0),
  tipo_fecha      TEXT NOT NULL DEFAULT 'fijo' CHECK (tipo_fecha IN ('fijo','aproximado')),
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  nota            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ingresos_recurrentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingresos_recurrentes_own" ON public.ingresos_recurrentes
  FOR ALL USING (auth.uid() = usuario_id);

-- ─── 3. INSTANCIAS POR PERÍODO ────────────────────────────────
-- Cada instancia representa UN ingreso esperado en UN período específico.
-- Nunca se crea un movimiento automáticamente: el usuario confirma.
CREATE TABLE public.ingresos_esperados (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ingreso_recurrente_id UUID NOT NULL REFERENCES public.ingresos_recurrentes(id) ON DELETE CASCADE,
  periodo_ref           TEXT NOT NULL,                                  -- 'YYYY-MM'
  fecha_esperada        DATE NOT NULL,
  fecha_min             DATE NOT NULL,
  fecha_max             DATE NOT NULL,
  monto_esperado        NUMERIC(12,2) NOT NULL,
  estado                TEXT NOT NULL DEFAULT 'pendiente'
                          CHECK (estado IN ('pendiente','confirmado','pospuesto','no_recibido')),
  movimiento_id         UUID REFERENCES public.movimientos(id) ON DELETE SET NULL,
  nota                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ingreso_recurrente_id, periodo_ref)
);

ALTER TABLE public.ingresos_esperados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingresos_esperados_own" ON public.ingresos_esperados
  FOR ALL USING (auth.uid() = usuario_id);

-- ─── 4. FUNCIÓN: generar instancias de un mes ─────────────────
-- Idempotente: ON CONFLICT DO NOTHING. Seguro llamar múltiples veces.
CREATE OR REPLACE FUNCTION public.generar_instancias_ingreso(
  p_user_id UUID,
  p_mes     SMALLINT,  -- 1-12
  p_anio    SMALLINT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec          RECORD;
  v_dia        SMALLINT;
  v_fecha      DATE;
  v_max_dia    SMALLINT;
  v_periodo    TEXT;
  v_generados  INT := 0;
BEGIN
  v_periodo := LPAD(p_anio::TEXT, 4, '0') || '-' || LPAD(p_mes::TEXT, 2, '0');
  v_max_dia  := EXTRACT(DAY FROM (DATE_TRUNC('month', MAKE_DATE(p_anio, p_mes, 1)) + INTERVAL '1 month - 1 day'))::SMALLINT;

  FOR rec IN
    SELECT ir.*
    FROM   ingresos_recurrentes ir
    WHERE  ir.usuario_id = p_user_id
      AND  ir.activo = TRUE
  LOOP
    -- Ajustar dia al último día del mes si el mes es más corto
    v_dia   := LEAST(rec.dia_esperado, v_max_dia);
    v_fecha := MAKE_DATE(p_anio, p_mes, v_dia);

    INSERT INTO ingresos_esperados (
      usuario_id, ingreso_recurrente_id, periodo_ref,
      fecha_esperada, fecha_min, fecha_max, monto_esperado
    ) VALUES (
      p_user_id, rec.id, v_periodo,
      v_fecha,
      v_fecha - rec.tolerancia_dias,
      v_fecha + rec.tolerancia_dias,
      rec.monto_esperado
    )
    ON CONFLICT (ingreso_recurrente_id, periodo_ref) DO NOTHING;

    IF FOUND THEN v_generados := v_generados + 1; END IF;
  END LOOP;

  RETURN v_generados;
END;
$$;

-- ─── 5. FUNCIÓN: obtener pendientes del día ───────────────────
-- Devuelve instancias cuya ventana (fecha_min..fecha_max) incluye hoy
-- y aún no han sido confirmadas.
CREATE OR REPLACE FUNCTION public.obtener_ingresos_pendientes_hoy(
  p_user_id UUID
)
RETURNS TABLE (
  instancia_id          UUID,
  ingreso_recurrente_id UUID,
  nombre                TEXT,
  fuente_nombre         TEXT,
  monto_esperado        NUMERIC,
  cuenta_id             UUID,
  cuenta_nombre         TEXT,
  fecha_esperada        DATE,
  fecha_min             DATE,
  fecha_max             DATE,
  tolerancia_dias       SMALLINT,
  tipo_fecha            TEXT,
  periodo_ref           TEXT,
  estado                TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ie.id,
    ir.id,
    ir.nombre,
    fi.nombre,
    ie.monto_esperado,
    ir.cuenta_id,
    c.nombre,
    ie.fecha_esperada,
    ie.fecha_min,
    ie.fecha_max,
    ir.tolerancia_dias,
    ir.tipo_fecha,
    ie.periodo_ref,
    ie.estado
  FROM  ingresos_esperados ie
  JOIN  ingresos_recurrentes ir ON ir.id = ie.ingreso_recurrente_id
  LEFT JOIN fuentes_ingreso  fi ON fi.id = ir.fuente_id
  LEFT JOIN cuentas          c  ON c.id  = ir.cuenta_id
  WHERE ie.usuario_id = p_user_id
    AND ie.estado     = 'pendiente'
    AND CURRENT_DATE  BETWEEN ie.fecha_min AND ie.fecha_max
  ORDER BY ie.fecha_esperada;
END;
$$;

-- ─── 6. FUNCIÓN: confirmar ingreso esperado ───────────────────
-- Crea el movimiento real, actualiza saldo, dispara RPG event.
-- Nunca crea duplicados: verifica estado antes de actuar.
CREATE OR REPLACE FUNCTION public.confirmar_ingreso_esperado(
  p_user_id      UUID,
  p_instancia_id UUID,
  p_monto_real   NUMERIC,        -- puede diferir del esperado
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
  -- Leer instancia y verificar propiedad
  SELECT ie.*, ir.cuenta_id AS v_cuenta_id, ir.nombre AS v_nombre
  INTO   v_inst
  FROM   ingresos_esperados     ie
  JOIN   ingresos_recurrentes   ir ON ir.id = ie.ingreso_recurrente_id
  WHERE  ie.id          = p_instancia_id
    AND  ie.usuario_id  = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'instancia_no_encontrada');
  END IF;

  IF v_inst.estado = 'confirmado' THEN
    RETURN jsonb_build_object('ok', TRUE, 'ya_confirmado', TRUE, 'movimiento_id', v_inst.movimiento_id);
  END IF;

  -- Insertar movimiento real
  INSERT INTO movimientos (
    usuario_id, tipo, fecha, cuenta_id, monto,
    descripcion, para_tercero, created_at, updated_at
  )
  VALUES (
    p_user_id, 'ingreso', p_fecha_real, v_inst.v_cuenta_id, p_monto_real,
    COALESCE(p_nota, v_inst.v_nombre), FALSE, NOW(), NOW()
  )
  RETURNING id INTO v_mov_id;

  -- Actualizar saldo de cuenta
  PERFORM procesar_movimiento('ingreso', v_inst.v_cuenta_id, NULL, NULL, NULL, p_monto_real);

  -- Marcar instancia como confirmada
  UPDATE ingresos_esperados
  SET    estado        = 'confirmado',
         movimiento_id = v_mov_id,
         updated_at    = NOW()
  WHERE  id = p_instancia_id;

  -- Disparar evento RPG (sin bloquear si falla)
  BEGIN
    PERFORM process_rpg_event(p_user_id, 'INGRESO_REGISTRADO', v_mov_id, 'movimiento', '{}');
  EXCEPTION WHEN OTHERS THEN
    NULL; -- RPG falla silenciosamente para no bloquear el ingreso
  END;

  RETURN jsonb_build_object(
    'ok',           TRUE,
    'movimiento_id', v_mov_id,
    'monto',        p_monto_real
  );
END;
$$;

-- ─── 7. FUNCIÓN: posponer ingreso esperado ────────────────────
CREATE OR REPLACE FUNCTION public.posponer_ingreso_esperado(
  p_user_id           UUID,
  p_instancia_id      UUID,
  p_nueva_fecha       DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inst RECORD;
BEGIN
  SELECT ie.*, ir.tolerancia_dias
  INTO   v_inst
  FROM   ingresos_esperados   ie
  JOIN   ingresos_recurrentes ir ON ir.id = ie.ingreso_recurrente_id
  WHERE  ie.id         = p_instancia_id
    AND  ie.usuario_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'instancia_no_encontrada');
  END IF;

  UPDATE ingresos_esperados
  SET    fecha_esperada = p_nueva_fecha,
         fecha_min      = p_nueva_fecha - v_inst.tolerancia_dias,
         fecha_max      = p_nueva_fecha + v_inst.tolerancia_dias,
         estado         = 'pospuesto',
         updated_at     = NOW()
  WHERE  id = p_instancia_id;

  RETURN jsonb_build_object('ok', TRUE);
END;
$$;

-- ─── 8. FUNCIÓN: obtener estado completo del mes ──────────────
-- Para la página de gestión: proyectado vs recibido por fuente
CREATE OR REPLACE FUNCTION public.obtener_ingresos_mes(
  p_user_id UUID,
  p_mes     SMALLINT,
  p_anio    SMALLINT
)
RETURNS TABLE (
  instancia_id          UUID,
  ingreso_recurrente_id UUID,
  fuente_id             UUID,
  fuente_nombre         TEXT,
  nombre                TEXT,
  monto_esperado        NUMERIC,
  monto_confirmado      NUMERIC,
  cuenta_id             UUID,
  cuenta_nombre         TEXT,
  fecha_esperada        DATE,
  fecha_min             DATE,
  fecha_max             DATE,
  tipo_fecha            TEXT,
  tolerancia_dias       SMALLINT,
  estado                TEXT,
  movimiento_id         UUID,
  periodo_ref           TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_periodo TEXT;
BEGIN
  v_periodo := LPAD(p_anio::TEXT, 4, '0') || '-' || LPAD(p_mes::TEXT, 2, '0');

  -- Generar instancias del mes si no existen aún
  PERFORM generar_instancias_ingreso(p_user_id, p_mes, p_anio);

  RETURN QUERY
  SELECT
    ie.id,
    ir.id,
    ir.fuente_id,
    fi.nombre,
    ir.nombre,
    ie.monto_esperado,
    m.monto,
    ir.cuenta_id,
    c.nombre,
    ie.fecha_esperada,
    ie.fecha_min,
    ie.fecha_max,
    ir.tipo_fecha,
    ir.tolerancia_dias,
    ie.estado,
    ie.movimiento_id,
    ie.periodo_ref
  FROM  ingresos_esperados   ie
  JOIN  ingresos_recurrentes ir ON ir.id = ie.ingreso_recurrente_id
  LEFT JOIN fuentes_ingreso  fi ON fi.id = ir.fuente_id
  LEFT JOIN cuentas          c  ON c.id  = ir.cuenta_id
  LEFT JOIN movimientos      m  ON m.id  = ie.movimiento_id
  WHERE ie.usuario_id = p_user_id
    AND ie.periodo_ref = v_periodo
  ORDER BY fi.nombre NULLS LAST, ie.fecha_esperada;
END;
$$;

-- ─── 9. FUNCIÓN: listar recurrentes con resumen ───────────────
CREATE OR REPLACE FUNCTION public.obtener_ingresos_recurrentes(
  p_user_id UUID
)
RETURNS TABLE (
  id              UUID,
  fuente_id       UUID,
  fuente_nombre   TEXT,
  nombre          TEXT,
  monto_esperado  NUMERIC,
  cuenta_id       UUID,
  cuenta_nombre   TEXT,
  frecuencia      TEXT,
  dia_esperado    SMALLINT,
  tolerancia_dias SMALLINT,
  tipo_fecha      TEXT,
  activo          BOOLEAN,
  nota            TEXT,
  created_at      TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ir.id,
    ir.fuente_id,
    fi.nombre,
    ir.nombre,
    ir.monto_esperado,
    ir.cuenta_id,
    c.nombre,
    ir.frecuencia,
    ir.dia_esperado,
    ir.tolerancia_dias,
    ir.tipo_fecha,
    ir.activo,
    ir.nota,
    ir.created_at
  FROM  ingresos_recurrentes ir
  LEFT JOIN fuentes_ingreso  fi ON fi.id = ir.fuente_id
  LEFT JOIN cuentas          c  ON c.id  = ir.cuenta_id
  WHERE ir.usuario_id = p_user_id
  ORDER BY fi.nombre NULLS LAST, ir.dia_esperado;
END;
$$;
