-- ============================================================
-- RPG SISTEMA — HITO 06.4 (IDEMPOTENTE)
-- Motor de Progreso: tablas + RLS + funciones
-- Curva congelada: Nivel 20 = 18.150 XP
-- ============================================================

-- ─── TABLAS ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rpg_perfiles (
  usuario_id          UUID        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  nivel               SMALLINT    NOT NULL DEFAULT 1 CHECK (nivel BETWEEN 1 AND 20),
  rango               TEXT        NOT NULL DEFAULT 'Discípulo Marcial',
  xp_total            INT         NOT NULL DEFAULT 0 CHECK (xp_total >= 0),
  stat_finanzas       SMALLINT    NOT NULL DEFAULT 0 CHECK (stat_finanzas    BETWEEN 0 AND 100),
  stat_disciplina     SMALLINT    NOT NULL DEFAULT 0 CHECK (stat_disciplina  BETWEEN 0 AND 100),
  stat_vitalidad      SMALLINT    NOT NULL DEFAULT 0 CHECK (stat_vitalidad   BETWEEN 0 AND 100),
  stat_conocimiento   SMALLINT    NOT NULL DEFAULT 0 CHECK (stat_conocimiento BETWEEN 0 AND 100),
  stat_trabajo        SMALLINT    NOT NULL DEFAULT 0 CHECK (stat_trabajo     BETWEEN 0 AND 100),
  vida                SMALLINT    NOT NULL DEFAULT 80 CHECK (vida BETWEEN 0 AND 100),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rpg_eventos (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo_evento         TEXT        NOT NULL,
  referencia_id       UUID,
  referencia_tipo     TEXT,
  xp_otorgada         SMALLINT    NOT NULL DEFAULT 0,
  delta_finanzas      SMALLINT    NOT NULL DEFAULT 0,
  delta_disciplina    SMALLINT    NOT NULL DEFAULT 0,
  delta_vitalidad     SMALLINT    NOT NULL DEFAULT 0,
  delta_conocimiento  SMALLINT    NOT NULL DEFAULT 0,
  delta_trabajo       SMALLINT    NOT NULL DEFAULT 0,
  delta_vida          SMALLINT    NOT NULL DEFAULT 0,
  resultado           JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- idempotencia: un referencia_id no genera dos veces el mismo evento
  UNIQUE (referencia_id, tipo_evento)
);

CREATE TABLE IF NOT EXISTS public.rpg_logros_usuario (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  logro_tipo      TEXT        NOT NULL,
  referencia_id   UUID,
  obtenido_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, logro_tipo)
);

CREATE TABLE IF NOT EXISTS public.rpg_rachas (
  usuario_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo_racha      TEXT        NOT NULL,
  inicio_racha    DATE,
  ultimo_evento   DATE,
  contador        INT         NOT NULL DEFAULT 0,
  mejor_racha     INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (usuario_id, tipo_racha)
);

-- ─── ÍNDICES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rpg_eventos_usuario     ON public.rpg_eventos (usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rpg_eventos_tipo        ON public.rpg_eventos (tipo_evento);
CREATE INDEX IF NOT EXISTS idx_rpg_logros_usuario      ON public.rpg_logros_usuario (usuario_id);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE public.rpg_perfiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rpg_eventos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rpg_logros_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rpg_rachas         ENABLE ROW LEVEL SECURITY;

-- rpg_perfiles: solo lectura para el propio usuario; escritura solo vía funciones
DROP POLICY IF EXISTS "rpg_perfiles: lectura propia" ON public.rpg_perfiles;
CREATE POLICY "rpg_perfiles: lectura propia"
  ON public.rpg_perfiles FOR SELECT
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "rpg_perfiles: insertar propia" ON public.rpg_perfiles;
CREATE POLICY "rpg_perfiles: insertar propia"
  ON public.rpg_perfiles FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- rpg_eventos: solo lectura (escritura solo desde funciones SECURITY DEFINER)
DROP POLICY IF EXISTS "rpg_eventos: lectura propia" ON public.rpg_eventos;
CREATE POLICY "rpg_eventos: lectura propia"
  ON public.rpg_eventos FOR SELECT
  USING (auth.uid() = usuario_id);

-- rpg_logros: solo lectura
DROP POLICY IF EXISTS "rpg_logros: lectura propia" ON public.rpg_logros_usuario;
CREATE POLICY "rpg_logros: lectura propia"
  ON public.rpg_logros_usuario FOR SELECT
  USING (auth.uid() = usuario_id);

-- rpg_rachas: solo lectura
DROP POLICY IF EXISTS "rpg_rachas: lectura propia" ON public.rpg_rachas;
CREATE POLICY "rpg_rachas: lectura propia"
  ON public.rpg_rachas FOR SELECT
  USING (auth.uid() = usuario_id);

-- ─── FUNCIONES AUXILIARES ─────────────────────────────────────

-- Calcula el nivel a partir del XP total (curva congelada)
CREATE OR REPLACE FUNCTION rpg_calcular_nivel(p_xp INT)
RETURNS SMALLINT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  -- Curva congelada HITO 06.4.1: índice 1-based, valor = XP mínimo para ese nivel
  xp_curva INT[] := ARRAY[0, 100, 250, 450, 700, 1050, 1500, 2100, 2850, 3700,
                           4650, 5750, 6950, 8250, 9650, 11150, 12750, 14450, 16250, 18150];
  nivel    SMALLINT := 1;
  i        INT;
BEGIN
  FOR i IN 1..20 LOOP
    IF p_xp >= xp_curva[i] THEN
      nivel := i;
    END IF;
  END LOOP;
  RETURN nivel;
END;
$$;

-- Devuelve el nombre del rango para un nivel dado
CREATE OR REPLACE FUNCTION rpg_rango_para_nivel(p_nivel SMALLINT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  rangos TEXT[] := ARRAY[
    'Discípulo Marcial',
    'Discípulo Marcial Intermedio',
    'Discípulo Marcial Avanzado',
    'Discípulo Superior',
    'Experto Marcial',
    'Experto Marcial Intermedio',
    'Experto Marcial Avanzado',
    'Maestro Marcial',
    'Maestro Marcial Intermedio',
    'Maestro Marcial Avanzado',
    'Gran Maestro Marcial',
    'Gran Maestro Marcial Intermedio',
    'Gran Maestro Marcial Avanzado',
    'Soberano Marcial',
    'Soberano Marcial Intermedio',
    'Soberano Marcial Avanzado',
    'Emperador Marcial',
    'Emperador Marcial Intermedio',
    'Emperador Marcial Avanzado',
    'Emperador Marcial Supremo'
  ];
BEGIN
  IF p_nivel < 1 OR p_nivel > 20 THEN RETURN 'Discípulo Marcial'; END IF;
  RETURN rangos[p_nivel];
END;
$$;

-- Clamp seguro 0-100 para estadísticas
CREATE OR REPLACE FUNCTION rpg_clamp_stat(p_actual SMALLINT, p_delta SMALLINT)
RETURNS SMALLINT
LANGUAGE sql IMMUTABLE AS $$
  SELECT GREATEST(0, LEAST(100, p_actual + p_delta))::SMALLINT;
$$;

-- ─── FUNCIÓN PRINCIPAL: process_rpg_event ────────────────────
-- SECURITY DEFINER: corre con permisos del propietario de la función,
-- no del usuario que llama. Esto permite escribir en rpg_perfiles y rpg_eventos
-- aunque el usuario no tenga permisos directos de escritura.

CREATE OR REPLACE FUNCTION process_rpg_event(
  p_usuario_id      UUID,
  p_tipo_evento     TEXT,
  p_referencia_id   UUID    DEFAULT NULL,
  p_referencia_tipo TEXT    DEFAULT NULL,
  p_metadatos       JSONB   DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Perfil actual
  v_perfil            rpg_perfiles%ROWTYPE;

  -- Recompensa base del evento
  v_xp                SMALLINT := 0;
  v_d_fin             SMALLINT := 0;
  v_d_dis             SMALLINT := 0;
  v_d_vit             SMALLINT := 0;
  v_d_con             SMALLINT := 0;
  v_d_tra             SMALLINT := 0;
  v_d_vida            SMALLINT := 0;

  -- Nuevos valores calculados
  v_xp_nuevo          INT;
  v_nivel_nuevo       SMALLINT;
  v_nivel_anterior    SMALLINT;
  v_subio_nivel       BOOLEAN := FALSE;

  -- Validaciones extra
  v_objetivo_monto    NUMERIC;
  v_deuda_edad_meses  INT;
  v_presupuesto_cats  INT;
  v_presupuesto_total NUMERIC;
  v_compromisos_activos INT;
  v_cobros_mes        INT;
  v_trabajo_hoy       INT;
  v_validacion_ok     BOOLEAN := TRUE;
  v_skip_reason       TEXT;

  -- Para hitos de objetivo
  v_porcentaje        NUMERIC;
  v_hito_tipo         TEXT;

  -- Logros
  v_es_primer_logro   BOOLEAN;

  v_resultado         JSONB;
BEGIN
  -- ── 0. Crear perfil si no existe ────────────────────────────
  INSERT INTO rpg_perfiles (usuario_id)
  VALUES (p_usuario_id)
  ON CONFLICT (usuario_id) DO NOTHING;

  -- ── 1. Idempotencia ─────────────────────────────────────────
  IF p_referencia_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM rpg_eventos
      WHERE referencia_id = p_referencia_id
        AND tipo_evento   = p_tipo_evento
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'skip', true,
        'motivo', 'evento_duplicado'
      );
    END IF;
  END IF;

  -- ── 2. Leer perfil actual ────────────────────────────────────
  SELECT * INTO v_perfil FROM rpg_perfiles WHERE usuario_id = p_usuario_id;
  v_nivel_anterior := v_perfil.nivel;

  -- ── 3. Tabla de recompensas ──────────────────────────────────
  -- Formato: (xp, d_fin, d_dis, d_vit, d_con, d_tra, d_vida)
  SELECT
    r.xp::SMALLINT,
    r.d_fin::SMALLINT,
    r.d_dis::SMALLINT,
    r.d_vit::SMALLINT,
    r.d_con::SMALLINT,
    r.d_tra::SMALLINT,
    r.d_vida::SMALLINT
  INTO
    v_xp, v_d_fin, v_d_dis, v_d_vit, v_d_con, v_d_tra, v_d_vida
  FROM (VALUES
    -- PRESUPUESTOS
    ('PRESUPUESTO_CREADO',       2,  0,  1,  0,  1,  0,  0),
    ('PRESUPUESTO_CUMPLIDO_100', 28, 0,  3,  1,  0,  0,  5),
    ('PRESUPUESTO_CUMPLIDO_90',  14, 0,  2,  0,  0,  0,  2),
    ('PRESUPUESTO_CUMPLIDO_75',  6,  0,  1,  0,  0,  0,  1),
    ('PRESUPUESTO_EXCEDIDO',     0,  0, -1,  0,  0,  0, -4),
    ('PRESUPUESTO_RACHA_3M',     60, 0,  5,  2,  0,  0,  5),
    ('PRESUPUESTO_RACHA_6M',    130, 0, 10,  3,  0,  0, 10),
    ('PRESUPUESTO_RACHA_12M',   270, 0, 18,  7,  0,  0, 18),
    -- OBJETIVOS
    ('OBJETIVO_CREADO',          2,  1,  0,  0,  0,  0,  0),
    ('OBJETIVO_HITO_25',         8,  2,  1,  0,  0,  0,  2),
    ('OBJETIVO_HITO_50',         13, 3,  1,  0,  0,  0,  3),
    ('OBJETIVO_HITO_75',         18, 4,  2,  0,  0,  0,  4),
    ('OBJETIVO_COMPLETADO',      85, 5,  3,  2,  0,  3,  8),
    ('OBJETIVO_ABANDONADO',      0, -2, -1,  0,  0,  0, -4),
    -- DEUDAS
    ('DEUDA_REGISTRADA',         0,  0,  0,  0,  1,  0, -3),
    ('DEUDA_CUOTA_TIEMPO',       8,  1,  2,  0,  0,  0,  2),
    ('DEUDA_CUOTA_ADELANTADA',   13, 2,  3,  0,  0,  0,  3),
    ('DEUDA_CUOTA_ATRASADA',     0, -1, -2,  0,  0,  0, -5),
    ('DEUDA_COMPLETADA',        150, 8,  5,  3,  0,  4, 12),
    ('DEUDA_RACHA_6M',           65, 4,  7,  2,  0,  0,  6),
    ('DEUDA_RACHA_12M',         150, 8, 14,  4,  0,  0, 12),
    -- CUOTAS CMR
    ('CMR_CUOTA_TIEMPO',         6,  1,  2,  0,  0,  0,  2),
    ('CMR_CUOTA_ATRASADA',       0, -1, -2,  0,  0,  0, -4),
    ('CMR_COMPLETADA',           35, 3,  2,  1,  0,  0,  4),
    -- COMPROMISOS / SUSCRIPCIONES
    ('COMPROMISO_REGISTRADO',    2,  0,  1,  0,  0,  0,  0),
    ('COMPROMISO_CUMPLIDO',      5,  0,  2,  0,  0,  0,  1),
    ('COMPROMISO_VENCIDO',       0,  0, -2,  0,  0,  0, -3),
    ('COMPROMISO_CANCELADO',     4,  1,  0,  0,  1,  0,  0),
    -- COBROS
    ('COBRO_REGISTRADO',         2,  1,  0,  0,  0,  1,  0),
    ('COBRO_TOTAL',             15,  2,  0,  0,  0,  3,  2),
    ('COBRO_PARCIAL',            7,  1,  0,  0,  0,  2,  1),
    ('COBRO_INCOBRABLE',         0, -1,  0,  0,  0, -1, -3),
    -- MOVIMIENTOS
    ('INGRESO_REGISTRADO',       0,  0,  0,  0,  0,  1,  0),  -- Trabajo; cap diario aplicado abajo
    -- FUTUROS (preparados, inactivos)
    ('PLANIFICACION_INICIADA',   4,  0,  2,  0,  1,  0,  0),
    ('APRENDIZAJE_LECCION',     10,  0,  0,  0,  4,  0,  0)
  ) AS r(tipo, xp, d_fin, d_dis, d_vit, d_con, d_tra, d_vida)
  WHERE r.tipo = p_tipo_evento;

  -- Evento desconocido
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'motivo', 'evento_desconocido');
  END IF;

  -- ── 4. Validaciones anti-abuso por tipo de evento ────────────

  -- OBJETIVO: meta mínima $50.000 CLP
  IF p_tipo_evento IN ('OBJETIVO_CREADO','OBJETIVO_HITO_25','OBJETIVO_HITO_50',
                        'OBJETIVO_HITO_75','OBJETIVO_COMPLETADO') THEN
    IF p_referencia_id IS NOT NULL THEN
      SELECT monto_objetivo INTO v_objetivo_monto
      FROM objetivos_ahorro WHERE id = p_referencia_id;
      IF v_objetivo_monto IS NOT NULL AND v_objetivo_monto < 50000 THEN
        v_validacion_ok := FALSE;
        v_skip_reason   := 'objetivo_monto_insuficiente';
      END IF;
    END IF;
  END IF;

  -- DEUDA_COMPLETADA: deuda debe tener ≥ 3 meses de antigüedad
  IF p_tipo_evento = 'DEUDA_COMPLETADA' AND v_validacion_ok THEN
    IF p_referencia_id IS NOT NULL THEN
      SELECT EXTRACT(MONTH FROM AGE(NOW(), created_at))::INT INTO v_deuda_edad_meses
      FROM deudas WHERE id = p_referencia_id;
      IF v_deuda_edad_meses IS NOT NULL AND v_deuda_edad_meses < 3 THEN
        v_validacion_ok := FALSE;
        v_skip_reason   := 'deuda_muy_reciente';
      END IF;
    END IF;
  END IF;

  -- PRESUPUESTO_CUMPLIDO_*: ≥3 categorías activas, total ≥$100.000 CLP
  IF p_tipo_evento IN ('PRESUPUESTO_CUMPLIDO_100','PRESUPUESTO_CUMPLIDO_90',
                        'PRESUPUESTO_CUMPLIDO_75') AND v_validacion_ok THEN
    IF p_referencia_id IS NOT NULL THEN
      -- metadatos.mes y metadatos.anio opcionales; si no vienen, usar el actual
      SELECT COUNT(*), COALESCE(SUM(monto_presupuestado),0)
      INTO v_presupuesto_cats, v_presupuesto_total
      FROM presupuestos
      WHERE usuario_id = p_usuario_id
        AND mes  = COALESCE((p_metadatos->>'mes')::INT,  EXTRACT(MONTH FROM NOW())::INT)
        AND anio = COALESCE((p_metadatos->>'anio')::INT, EXTRACT(YEAR  FROM NOW())::INT);

      IF v_presupuesto_cats < 3 OR v_presupuesto_total < 100000 THEN
        v_validacion_ok := FALSE;
        v_skip_reason   := 'presupuesto_insuficiente';
      END IF;
    END IF;
  END IF;

  -- INGRESO_REGISTRADO: cap de Trabajo = +3 por día
  IF p_tipo_evento = 'INGRESO_REGISTRADO' AND v_validacion_ok THEN
    SELECT COALESCE(SUM(delta_trabajo), 0) INTO v_trabajo_hoy
    FROM rpg_eventos
    WHERE usuario_id  = p_usuario_id
      AND tipo_evento = 'INGRESO_REGISTRADO'
      AND created_at >= CURRENT_DATE;
    IF v_trabajo_hoy >= 3 THEN
      v_d_tra := 0;  -- cap alcanzado, no aporta más Trabajo
    END IF;
  END IF;

  -- COBRO_REGISTRADO: máx 5 por mes
  IF p_tipo_evento = 'COBRO_REGISTRADO' AND v_validacion_ok THEN
    SELECT COUNT(*) INTO v_cobros_mes
    FROM rpg_eventos
    WHERE usuario_id  = p_usuario_id
      AND tipo_evento = 'COBRO_REGISTRADO'
      AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
      AND EXTRACT(YEAR  FROM created_at) = EXTRACT(YEAR  FROM NOW());
    IF v_cobros_mes >= 5 THEN
      v_validacion_ok := FALSE;
      v_skip_reason   := 'cobros_mes_maximos';
    END IF;
  END IF;

  IF NOT v_validacion_ok THEN
    RETURN jsonb_build_object(
      'success', false,
      'skip',    true,
      'motivo',  v_skip_reason
    );
  END IF;

  -- ── 5. Calcular nuevos valores con clamp ─────────────────────
  v_xp_nuevo    := v_perfil.xp_total + v_xp;
  v_nivel_nuevo := rpg_calcular_nivel(v_xp_nuevo);

  -- nivel nunca retrocede
  IF v_nivel_nuevo < v_nivel_anterior THEN
    v_nivel_nuevo := v_nivel_anterior;
  END IF;

  v_subio_nivel := (v_nivel_nuevo > v_nivel_anterior);

  -- ── 6. Actualizar perfil ─────────────────────────────────────
  UPDATE rpg_perfiles SET
    xp_total          = v_xp_nuevo,
    nivel             = v_nivel_nuevo,
    rango             = rpg_rango_para_nivel(v_nivel_nuevo),
    stat_finanzas     = rpg_clamp_stat(stat_finanzas,    v_d_fin),
    stat_disciplina   = rpg_clamp_stat(stat_disciplina,  v_d_dis),
    stat_vitalidad    = rpg_clamp_stat(stat_vitalidad,   v_d_vit),
    stat_conocimiento = rpg_clamp_stat(stat_conocimiento, v_d_con),
    stat_trabajo      = rpg_clamp_stat(stat_trabajo,     v_d_tra),
    vida              = GREATEST(0, LEAST(100, vida + v_d_vida)),
    updated_at        = NOW()
  WHERE usuario_id = p_usuario_id;

  -- ── 7. Registrar evento ──────────────────────────────────────
  INSERT INTO rpg_eventos (
    usuario_id, tipo_evento, referencia_id, referencia_tipo,
    xp_otorgada, delta_finanzas, delta_disciplina, delta_vitalidad,
    delta_conocimiento, delta_trabajo, delta_vida,
    resultado
  ) VALUES (
    p_usuario_id, p_tipo_evento, p_referencia_id, p_referencia_tipo,
    v_xp, v_d_fin, v_d_dis, v_d_vit,
    v_d_con, v_d_tra, v_d_vida,
    jsonb_build_object(
      'nivel_anterior', v_nivel_anterior,
      'nivel_nuevo',    v_nivel_nuevo,
      'xp_total',       v_xp_nuevo,
      'subio_nivel',    v_subio_nivel
    )
  );

  -- ── 8. Logros first-time ─────────────────────────────────────
  IF p_tipo_evento = 'DEUDA_COMPLETADA' THEN
    SELECT NOT EXISTS(
      SELECT 1 FROM rpg_logros_usuario
      WHERE usuario_id = p_usuario_id AND logro_tipo = 'PRIMERA_DEUDA_ELIMINADA'
    ) INTO v_es_primer_logro;
    IF v_es_primer_logro THEN
      INSERT INTO rpg_logros_usuario (usuario_id, logro_tipo, referencia_id)
      VALUES (p_usuario_id, 'PRIMERA_DEUDA_ELIMINADA', p_referencia_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF p_tipo_evento = 'OBJETIVO_COMPLETADO' THEN
    SELECT NOT EXISTS(
      SELECT 1 FROM rpg_logros_usuario
      WHERE usuario_id = p_usuario_id AND logro_tipo = 'PRIMER_OBJETIVO_COMPLETADO'
    ) INTO v_es_primer_logro;
    IF v_es_primer_logro THEN
      INSERT INTO rpg_logros_usuario (usuario_id, logro_tipo, referencia_id)
      VALUES (p_usuario_id, 'PRIMER_OBJETIVO_COMPLETADO', p_referencia_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF p_tipo_evento = 'PRESUPUESTO_RACHA_12M' THEN
    INSERT INTO rpg_logros_usuario (usuario_id, logro_tipo, referencia_id)
    VALUES (p_usuario_id, 'ANIO_DE_ACERO', p_referencia_id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_subio_nivel AND v_nivel_nuevo = 20 THEN
    INSERT INTO rpg_logros_usuario (usuario_id, logro_tipo)
    VALUES (p_usuario_id, 'LA_UNION')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── 9. Respuesta ─────────────────────────────────────────────
  v_resultado := jsonb_build_object(
    'success',        true,
    'xp_ganada',      v_xp,
    'xp_total',       v_xp_nuevo,
    'nivel_anterior', v_nivel_anterior,
    'nivel_nuevo',    v_nivel_nuevo,
    'subio_nivel',    v_subio_nivel,
    'rango',          rpg_rango_para_nivel(v_nivel_nuevo),
    'stats', jsonb_build_object(
      'finanzas',     rpg_clamp_stat(v_perfil.stat_finanzas,     v_d_fin),
      'disciplina',   rpg_clamp_stat(v_perfil.stat_disciplina,   v_d_dis),
      'vitalidad',    rpg_clamp_stat(v_perfil.stat_vitalidad,    v_d_vit),
      'conocimiento', rpg_clamp_stat(v_perfil.stat_conocimiento, v_d_con),
      'trabajo',      rpg_clamp_stat(v_perfil.stat_trabajo,      v_d_tra)
    ),
    'vida', GREATEST(0, LEAST(100, v_perfil.vida + v_d_vida))
  );

  RETURN v_resultado;
END;
$$;

-- Función pública para inicializar perfil RPG del usuario actual
CREATE OR REPLACE FUNCTION inicializar_rpg_perfil()
RETURNS rpg_perfiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_perfil rpg_perfiles%ROWTYPE;
BEGIN
  INSERT INTO rpg_perfiles (usuario_id)
  VALUES (auth.uid())
  ON CONFLICT (usuario_id) DO NOTHING;

  SELECT * INTO v_perfil FROM rpg_perfiles WHERE usuario_id = auth.uid();
  RETURN v_perfil;
END;
$$;

-- ─── TRIGGER: auto-crear perfil RPG al crear profile ─────────
CREATE OR REPLACE FUNCTION rpg_crear_perfil_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.rpg_perfiles (usuario_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_rpg ON public.profiles;
CREATE TRIGGER on_profile_created_rpg
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION rpg_crear_perfil_trigger();
