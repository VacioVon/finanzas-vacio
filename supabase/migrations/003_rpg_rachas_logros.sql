-- ============================================================
-- RPG RACHAS + LOGROS EXTENDIDOS — HITO 06.5 (IDEMPOTENTE)
-- Añade lógica de rachas dentro de process_rpg_event y
-- amplía el catálogo de logros disponibles.
-- ============================================================

-- ─── TABLA DE DEFINICIÓN DE LOGROS (catálogo) ────────────────
CREATE TABLE IF NOT EXISTS public.rpg_logros_catalogo (
  logro_tipo    TEXT        PRIMARY KEY,
  nombre        TEXT        NOT NULL,
  descripcion   TEXT        NOT NULL,
  emoji         TEXT        NOT NULL DEFAULT '🏆',
  xp_bonus      SMALLINT    NOT NULL DEFAULT 0,
  oculto        BOOLEAN     NOT NULL DEFAULT FALSE  -- oculto hasta obtenerlo
);

-- Catálogo de logros (idempotente)
INSERT INTO public.rpg_logros_catalogo (logro_tipo, nombre, descripcion, emoji, xp_bonus, oculto)
VALUES
  -- Logros de deudas
  ('PRIMERA_DEUDA_ELIMINADA',    'Libertad inicial',       'Eliminaste tu primera deuda',                          '⛓️',  50,  false),
  ('TRES_DEUDAS_ELIMINADAS',     'Rompe cadenas',          'Eliminaste 3 deudas en total',                         '🔓',  100, false),
  ('CINCO_DEUDAS_ELIMINADAS',    'Maestro del crédito',    'Eliminaste 5 deudas en total',                         '💳',  200, false),
  -- Logros de objetivos
  ('PRIMER_OBJETIVO_COMPLETADO', 'Primera meta',           'Completaste tu primer objetivo de ahorro',              '🎯',  50,  false),
  ('TRES_OBJETIVOS_COMPLETADOS', 'Ahorrista comprometido', 'Completaste 3 objetivos de ahorro',                    '🏹',  100, false),
  -- Logros de rachas de presupuesto
  ('RACHA_PRESUPUESTO_3M',       'Constancia inicial',     '3 meses consecutivos cumpliendo presupuesto',          '📊',  60,  false),
  ('RACHA_PRESUPUESTO_6M',       'Disciplina sostenida',   '6 meses consecutivos cumpliendo presupuesto',          '📈', 130,  false),
  ('RACHA_PRESUPUESTO_12M',      'Año de Acero',           '12 meses consecutivos cumpliendo presupuesto',         '🔩', 270,  false),
  -- Logros de rachas de deuda
  ('RACHA_DEUDA_6M',             'Pagador confiable',      '6 meses consecutivos pagando deudas a tiempo',         '📅',  65,  false),
  ('RACHA_DEUDA_12M',            'Pagador de élite',       '12 meses consecutivos pagando deudas a tiempo',        '🏅', 150,  false),
  -- Logros de nivel
  ('NIVEL_5',                    'Camino iniciado',        'Alcanzaste el nivel 5',                                '⭐',  0,   false),
  ('NIVEL_10',                   'Experto Marcial',        'Alcanzaste el nivel 10',                               '⭐⭐', 0,  false),
  ('NIVEL_15',                   'Gran Maestro',           'Alcanzaste el nivel 15',                               '🌟',  0,   false),
  ('LA_UNION',                   'La Unión',               'Alcanzaste el nivel 20 — Emperador Marcial Supremo',   '👑',  0,   true),
  -- Logros de aprendizaje
  ('ANIO_DE_ACERO',              'Año de Acero',           'Cumpliste el presupuesto 12 meses seguidos',           '🔩', 270,  false),
  -- Logros especiales
  ('PRIMEROS_PASOS',             'Primeros pasos',         'Registraste tu primer ingreso',                        '🌱',  10,  false),
  ('COMPROMISO_FIEL',            'Compromiso fiel',        '10 compromisos registrados y pagados',                 '🤝',  80,  false)
ON CONFLICT (logro_tipo) DO UPDATE
  SET nombre      = EXCLUDED.nombre,
      descripcion = EXCLUDED.descripcion,
      emoji       = EXCLUDED.emoji,
      xp_bonus    = EXCLUDED.xp_bonus;

-- RLS para catálogo (lectura pública)
ALTER TABLE public.rpg_logros_catalogo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rpg_catalogo: lectura pública" ON public.rpg_logros_catalogo;
CREATE POLICY "rpg_catalogo: lectura pública"
  ON public.rpg_logros_catalogo FOR SELECT
  USING (true);

-- ─── FUNCIÓN: actualizar racha ────────────────────────────────
CREATE OR REPLACE FUNCTION rpg_actualizar_racha(
  p_usuario_id  UUID,
  p_tipo_racha  TEXT,
  p_exito       BOOLEAN     -- true = evento positivo, false = rompe racha
)
RETURNS INT   -- retorna el contador actual
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_hoy     DATE := CURRENT_DATE;
  v_racha   rpg_rachas%ROWTYPE;
BEGIN
  -- Obtener racha actual o insertar vacía
  INSERT INTO rpg_rachas (usuario_id, tipo_racha, inicio_racha, ultimo_evento, contador, mejor_racha)
  VALUES (p_usuario_id, p_tipo_racha, NULL, NULL, 0, 0)
  ON CONFLICT (usuario_id, tipo_racha) DO NOTHING;

  SELECT * INTO v_racha FROM rpg_rachas
  WHERE usuario_id = p_usuario_id AND tipo_racha = p_tipo_racha;

  IF p_exito THEN
    -- Si no había racha activa o último evento fue hace >32 días (mes nuevo), reiniciar
    IF v_racha.inicio_racha IS NULL OR
       (v_hoy - v_racha.ultimo_evento) > 32 THEN
      UPDATE rpg_rachas SET
        inicio_racha  = v_hoy,
        ultimo_evento = v_hoy,
        contador      = 1,
        mejor_racha   = GREATEST(mejor_racha, 1)
      WHERE usuario_id = p_usuario_id AND tipo_racha = p_tipo_racha;
      RETURN 1;
    ELSE
      -- Continuar racha
      UPDATE rpg_rachas SET
        ultimo_evento = v_hoy,
        contador      = contador + 1,
        mejor_racha   = GREATEST(mejor_racha, contador + 1)
      WHERE usuario_id = p_usuario_id AND tipo_racha = p_tipo_racha;
      RETURN v_racha.contador + 1;
    END IF;
  ELSE
    -- Romper racha
    UPDATE rpg_rachas SET
      inicio_racha  = NULL,
      ultimo_evento = v_hoy,
      contador      = 0
    WHERE usuario_id = p_usuario_id AND tipo_racha = p_tipo_racha;
    RETURN 0;
  END IF;
END;
$$;

-- ─── FUNCIÓN: otorgar logro con XP bonus ─────────────────────
CREATE OR REPLACE FUNCTION rpg_otorgar_logro(
  p_usuario_id   UUID,
  p_logro_tipo   TEXT,
  p_referencia_id UUID DEFAULT NULL
)
RETURNS BOOLEAN  -- true si fue nuevo, false si ya existía
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_es_nuevo  BOOLEAN;
  v_xp_bonus  SMALLINT;
  v_xp_nuevo  INT;
  v_nivel_ant SMALLINT;
  v_nivel_nvo SMALLINT;
BEGIN
  -- Verificar si ya tiene el logro
  SELECT NOT EXISTS(
    SELECT 1 FROM rpg_logros_usuario
    WHERE usuario_id = p_usuario_id AND logro_tipo = p_logro_tipo
  ) INTO v_es_nuevo;

  IF NOT v_es_nuevo THEN RETURN FALSE; END IF;

  -- Registrar logro
  INSERT INTO rpg_logros_usuario (usuario_id, logro_tipo, referencia_id)
  VALUES (p_usuario_id, p_logro_tipo, p_referencia_id)
  ON CONFLICT DO NOTHING;

  -- Aplicar XP bonus si tiene
  SELECT xp_bonus INTO v_xp_bonus
  FROM rpg_logros_catalogo WHERE logro_tipo = p_logro_tipo;

  IF v_xp_bonus > 0 THEN
    SELECT xp_total, nivel INTO v_xp_nuevo, v_nivel_ant
    FROM rpg_perfiles WHERE usuario_id = p_usuario_id;

    v_xp_nuevo  := v_xp_nuevo + v_xp_bonus;
    v_nivel_nvo := rpg_calcular_nivel(v_xp_nuevo);

    UPDATE rpg_perfiles SET
      xp_total   = v_xp_nuevo,
      nivel      = GREATEST(nivel, v_nivel_nvo),
      rango      = rpg_rango_para_nivel(GREATEST(nivel, v_nivel_nvo)::SMALLINT),
      updated_at = NOW()
    WHERE usuario_id = p_usuario_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- ─── REEMPLAZAR process_rpg_event con versión que gestiona rachas y logros ──
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
  v_perfil            rpg_perfiles%ROWTYPE;
  v_xp                SMALLINT := 0;
  v_d_fin             SMALLINT := 0;
  v_d_dis             SMALLINT := 0;
  v_d_vit             SMALLINT := 0;
  v_d_con             SMALLINT := 0;
  v_d_tra             SMALLINT := 0;
  v_d_vida            SMALLINT := 0;
  v_xp_nuevo          INT;
  v_nivel_nuevo       SMALLINT;
  v_nivel_anterior    SMALLINT;
  v_subio_nivel       BOOLEAN := FALSE;
  v_objetivo_monto    NUMERIC;
  v_deuda_edad_meses  INT;
  v_presupuesto_cats  INT;
  v_presupuesto_total NUMERIC;
  v_trabajo_hoy       INT;
  v_cobros_mes        INT;
  v_validacion_ok     BOOLEAN := TRUE;
  v_skip_reason       TEXT;
  v_racha_contador    INT;
  v_logros_nuevos     TEXT[] := '{}';
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
      RETURN jsonb_build_object('success', false, 'skip', true, 'motivo', 'evento_duplicado');
    END IF;
  END IF;

  -- ── 2. Leer perfil actual ────────────────────────────────────
  SELECT * INTO v_perfil FROM rpg_perfiles WHERE usuario_id = p_usuario_id;
  v_nivel_anterior := v_perfil.nivel;

  -- ── 3. Tabla de recompensas ──────────────────────────────────
  SELECT
    r.xp::SMALLINT, r.d_fin::SMALLINT, r.d_dis::SMALLINT,
    r.d_vit::SMALLINT, r.d_con::SMALLINT, r.d_tra::SMALLINT, r.d_vida::SMALLINT
  INTO v_xp, v_d_fin, v_d_dis, v_d_vit, v_d_con, v_d_tra, v_d_vida
  FROM (VALUES
    ('PRESUPUESTO_CREADO',       2,  0,  1,  0,  1,  0,  0),
    ('PRESUPUESTO_CUMPLIDO_100', 28, 0,  3,  1,  0,  0,  5),
    ('PRESUPUESTO_CUMPLIDO_90',  14, 0,  2,  0,  0,  0,  2),
    ('PRESUPUESTO_CUMPLIDO_75',  6,  0,  1,  0,  0,  0,  1),
    ('PRESUPUESTO_EXCEDIDO',     0,  0, -1,  0,  0,  0, -4),
    ('PRESUPUESTO_RACHA_3M',     60, 0,  5,  2,  0,  0,  5),
    ('PRESUPUESTO_RACHA_6M',    130, 0, 10,  3,  0,  0, 10),
    ('PRESUPUESTO_RACHA_12M',   270, 0, 18,  7,  0,  0, 18),
    ('OBJETIVO_CREADO',          2,  1,  0,  0,  0,  0,  0),
    ('OBJETIVO_HITO_25',         8,  2,  1,  0,  0,  0,  2),
    ('OBJETIVO_HITO_50',         13, 3,  1,  0,  0,  0,  3),
    ('OBJETIVO_HITO_75',         18, 4,  2,  0,  0,  0,  4),
    ('OBJETIVO_COMPLETADO',      85, 5,  3,  2,  0,  3,  8),
    ('OBJETIVO_ABANDONADO',      0, -2, -1,  0,  0,  0, -4),
    ('DEUDA_REGISTRADA',         0,  0,  0,  0,  1,  0, -3),
    ('DEUDA_CUOTA_TIEMPO',       8,  1,  2,  0,  0,  0,  2),
    ('DEUDA_CUOTA_ADELANTADA',   13, 2,  3,  0,  0,  0,  3),
    ('DEUDA_CUOTA_ATRASADA',     0, -1, -2,  0,  0,  0, -5),
    ('DEUDA_COMPLETADA',        150, 8,  5,  3,  0,  4, 12),
    ('DEUDA_RACHA_6M',           65, 4,  7,  2,  0,  0,  6),
    ('DEUDA_RACHA_12M',         150, 8, 14,  4,  0,  0, 12),
    ('CMR_CUOTA_TIEMPO',         6,  1,  2,  0,  0,  0,  2),
    ('CMR_CUOTA_ATRASADA',       0, -1, -2,  0,  0,  0, -4),
    ('CMR_COMPLETADA',           35, 3,  2,  1,  0,  0,  4),
    ('COMPROMISO_REGISTRADO',    2,  0,  1,  0,  0,  0,  0),
    ('COMPROMISO_CUMPLIDO',      5,  0,  2,  0,  0,  0,  1),
    ('COMPROMISO_VENCIDO',       0,  0, -2,  0,  0,  0, -3),
    ('COMPROMISO_CANCELADO',     4,  1,  0,  0,  1,  0,  0),
    ('COBRO_REGISTRADO',         2,  1,  0,  0,  0,  1,  0),
    ('COBRO_TOTAL',             15,  2,  0,  0,  0,  3,  2),
    ('COBRO_PARCIAL',            7,  1,  0,  0,  0,  2,  1),
    ('COBRO_INCOBRABLE',         0, -1,  0,  0,  0, -1, -3),
    ('INGRESO_REGISTRADO',       0,  0,  0,  0,  0,  1,  0),
    ('PLANIFICACION_INICIADA',   4,  0,  2,  0,  1,  0,  0),
    ('APRENDIZAJE_LECCION',     10,  0,  0,  0,  4,  0,  0)
  ) AS r(tipo, xp, d_fin, d_dis, d_vit, d_con, d_tra, d_vida)
  WHERE r.tipo = p_tipo_evento;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'motivo', 'evento_desconocido');
  END IF;

  -- ── 4. Validaciones anti-abuso ────────────────────────────────
  IF p_tipo_evento IN ('OBJETIVO_CREADO','OBJETIVO_HITO_25','OBJETIVO_HITO_50',
                        'OBJETIVO_HITO_75','OBJETIVO_COMPLETADO') THEN
    IF p_referencia_id IS NOT NULL THEN
      SELECT monto_objetivo INTO v_objetivo_monto
      FROM objetivos_ahorro WHERE id = p_referencia_id;
      IF v_objetivo_monto IS NOT NULL AND v_objetivo_monto < 50000 THEN
        v_validacion_ok := FALSE; v_skip_reason := 'objetivo_monto_insuficiente';
      END IF;
    END IF;
  END IF;

  IF p_tipo_evento = 'DEUDA_COMPLETADA' AND v_validacion_ok THEN
    IF p_referencia_id IS NOT NULL THEN
      SELECT EXTRACT(MONTH FROM AGE(NOW(), created_at))::INT INTO v_deuda_edad_meses
      FROM deudas WHERE id = p_referencia_id;
      IF v_deuda_edad_meses IS NOT NULL AND v_deuda_edad_meses < 3 THEN
        v_validacion_ok := FALSE; v_skip_reason := 'deuda_muy_reciente';
      END IF;
    END IF;
  END IF;

  IF p_tipo_evento IN ('PRESUPUESTO_CUMPLIDO_100','PRESUPUESTO_CUMPLIDO_90',
                        'PRESUPUESTO_CUMPLIDO_75') AND v_validacion_ok THEN
    IF p_referencia_id IS NOT NULL THEN
      SELECT COUNT(*), COALESCE(SUM(monto_presupuestado),0)
      INTO v_presupuesto_cats, v_presupuesto_total
      FROM presupuestos
      WHERE usuario_id = p_usuario_id
        AND mes  = COALESCE((p_metadatos->>'mes')::INT,  EXTRACT(MONTH FROM NOW())::INT)
        AND anio = COALESCE((p_metadatos->>'anio')::INT, EXTRACT(YEAR  FROM NOW())::INT);
      IF v_presupuesto_cats < 3 OR v_presupuesto_total < 100000 THEN
        v_validacion_ok := FALSE; v_skip_reason := 'presupuesto_insuficiente';
      END IF;
    END IF;
  END IF;

  IF p_tipo_evento = 'INGRESO_REGISTRADO' AND v_validacion_ok THEN
    SELECT COALESCE(SUM(delta_trabajo), 0) INTO v_trabajo_hoy
    FROM rpg_eventos
    WHERE usuario_id  = p_usuario_id
      AND tipo_evento = 'INGRESO_REGISTRADO'
      AND created_at >= CURRENT_DATE;
    IF v_trabajo_hoy >= 3 THEN v_d_tra := 0; END IF;
  END IF;

  IF p_tipo_evento = 'COBRO_REGISTRADO' AND v_validacion_ok THEN
    SELECT COUNT(*) INTO v_cobros_mes
    FROM rpg_eventos
    WHERE usuario_id  = p_usuario_id
      AND tipo_evento = 'COBRO_REGISTRADO'
      AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
      AND EXTRACT(YEAR  FROM created_at) = EXTRACT(YEAR  FROM NOW());
    IF v_cobros_mes >= 5 THEN
      v_validacion_ok := FALSE; v_skip_reason := 'cobros_mes_maximos';
    END IF;
  END IF;

  IF NOT v_validacion_ok THEN
    RETURN jsonb_build_object('success', false, 'skip', true, 'motivo', v_skip_reason);
  END IF;

  -- ── 5. Calcular nuevos valores ────────────────────────────────
  v_xp_nuevo    := v_perfil.xp_total + v_xp;
  v_nivel_nuevo := GREATEST(v_nivel_anterior, rpg_calcular_nivel(v_xp_nuevo));
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
    v_xp, v_d_fin, v_d_dis, v_d_vit, v_d_con, v_d_tra, v_d_vida,
    jsonb_build_object(
      'nivel_anterior', v_nivel_anterior, 'nivel_nuevo', v_nivel_nuevo,
      'xp_total', v_xp_nuevo, 'subio_nivel', v_subio_nivel
    )
  );

  -- ── 8. Rachas ────────────────────────────────────────────────
  -- Racha de presupuesto
  IF p_tipo_evento IN ('PRESUPUESTO_CUMPLIDO_100','PRESUPUESTO_CUMPLIDO_90','PRESUPUESTO_CUMPLIDO_75') THEN
    v_racha_contador := rpg_actualizar_racha(p_usuario_id, 'presupuesto', true);
    -- Disparar eventos de racha si llega a hito
    IF v_racha_contador = 3 THEN
      PERFORM process_rpg_event(p_usuario_id, 'PRESUPUESTO_RACHA_3M', NULL, 'racha');
    ELSIF v_racha_contador = 6 THEN
      PERFORM process_rpg_event(p_usuario_id, 'PRESUPUESTO_RACHA_6M', NULL, 'racha');
    ELSIF v_racha_contador = 12 THEN
      PERFORM process_rpg_event(p_usuario_id, 'PRESUPUESTO_RACHA_12M', NULL, 'racha');
    END IF;
  ELSIF p_tipo_evento = 'PRESUPUESTO_EXCEDIDO' THEN
    PERFORM rpg_actualizar_racha(p_usuario_id, 'presupuesto', false);
  END IF;

  -- Racha de deuda (cuotas a tiempo)
  IF p_tipo_evento IN ('DEUDA_CUOTA_TIEMPO','DEUDA_CUOTA_ADELANTADA') THEN
    v_racha_contador := rpg_actualizar_racha(p_usuario_id, 'deuda_pagos', true);
    IF v_racha_contador = 6 THEN
      PERFORM process_rpg_event(p_usuario_id, 'DEUDA_RACHA_6M', NULL, 'racha');
    ELSIF v_racha_contador = 12 THEN
      PERFORM process_rpg_event(p_usuario_id, 'DEUDA_RACHA_12M', NULL, 'racha');
    END IF;
  ELSIF p_tipo_evento = 'DEUDA_CUOTA_ATRASADA' THEN
    PERFORM rpg_actualizar_racha(p_usuario_id, 'deuda_pagos', false);
  END IF;

  -- ── 9. Logros ────────────────────────────────────────────────
  -- Primer ingreso
  IF p_tipo_evento = 'INGRESO_REGISTRADO' THEN
    IF rpg_otorgar_logro(p_usuario_id, 'PRIMEROS_PASOS', p_referencia_id) THEN
      v_logros_nuevos := array_append(v_logros_nuevos, 'PRIMEROS_PASOS');
    END IF;
  END IF;

  -- Deudas eliminadas
  IF p_tipo_evento = 'DEUDA_COMPLETADA' THEN
    DECLARE v_total_deudas_pagadas INT;
    BEGIN
      SELECT COUNT(*) INTO v_total_deudas_pagadas FROM rpg_logros_usuario
      WHERE usuario_id = p_usuario_id AND logro_tipo LIKE 'DEUDA_PAGADA_%';

      IF rpg_otorgar_logro(p_usuario_id, 'PRIMERA_DEUDA_ELIMINADA', p_referencia_id) THEN
        v_logros_nuevos := array_append(v_logros_nuevos, 'PRIMERA_DEUDA_ELIMINADA');
      END IF;

      -- Contar total de deudas completadas
      SELECT COUNT(*) INTO v_total_deudas_pagadas FROM rpg_eventos
      WHERE usuario_id = p_usuario_id AND tipo_evento = 'DEUDA_COMPLETADA';
      IF v_total_deudas_pagadas >= 3 THEN
        IF rpg_otorgar_logro(p_usuario_id, 'TRES_DEUDAS_ELIMINADAS') THEN
          v_logros_nuevos := array_append(v_logros_nuevos, 'TRES_DEUDAS_ELIMINADAS');
        END IF;
      END IF;
      IF v_total_deudas_pagadas >= 5 THEN
        IF rpg_otorgar_logro(p_usuario_id, 'CINCO_DEUDAS_ELIMINADAS') THEN
          v_logros_nuevos := array_append(v_logros_nuevos, 'CINCO_DEUDAS_ELIMINADAS');
        END IF;
      END IF;
    END;
  END IF;

  -- Objetivos completados
  IF p_tipo_evento = 'OBJETIVO_COMPLETADO' THEN
    DECLARE v_total_obj INT;
    BEGIN
      IF rpg_otorgar_logro(p_usuario_id, 'PRIMER_OBJETIVO_COMPLETADO', p_referencia_id) THEN
        v_logros_nuevos := array_append(v_logros_nuevos, 'PRIMER_OBJETIVO_COMPLETADO');
      END IF;
      SELECT COUNT(*) INTO v_total_obj FROM rpg_eventos
      WHERE usuario_id = p_usuario_id AND tipo_evento = 'OBJETIVO_COMPLETADO';
      IF v_total_obj >= 3 THEN
        IF rpg_otorgar_logro(p_usuario_id, 'TRES_OBJETIVOS_COMPLETADOS') THEN
          v_logros_nuevos := array_append(v_logros_nuevos, 'TRES_OBJETIVOS_COMPLETADOS');
        END IF;
      END IF;
    END;
  END IF;

  -- Rachas de presupuesto → logros
  IF p_tipo_evento = 'PRESUPUESTO_RACHA_3M' THEN
    IF rpg_otorgar_logro(p_usuario_id, 'RACHA_PRESUPUESTO_3M') THEN
      v_logros_nuevos := array_append(v_logros_nuevos, 'RACHA_PRESUPUESTO_3M');
    END IF;
  ELSIF p_tipo_evento = 'PRESUPUESTO_RACHA_6M' THEN
    IF rpg_otorgar_logro(p_usuario_id, 'RACHA_PRESUPUESTO_6M') THEN
      v_logros_nuevos := array_append(v_logros_nuevos, 'RACHA_PRESUPUESTO_6M');
    END IF;
  ELSIF p_tipo_evento = 'PRESUPUESTO_RACHA_12M' THEN
    IF rpg_otorgar_logro(p_usuario_id, 'ANIO_DE_ACERO') THEN
      v_logros_nuevos := array_append(v_logros_nuevos, 'ANIO_DE_ACERO');
    END IF;
  END IF;

  -- Rachas de deuda → logros
  IF p_tipo_evento = 'DEUDA_RACHA_6M' THEN
    IF rpg_otorgar_logro(p_usuario_id, 'RACHA_DEUDA_6M') THEN
      v_logros_nuevos := array_append(v_logros_nuevos, 'RACHA_DEUDA_6M');
    END IF;
  ELSIF p_tipo_evento = 'DEUDA_RACHA_12M' THEN
    IF rpg_otorgar_logro(p_usuario_id, 'RACHA_DEUDA_12M') THEN
      v_logros_nuevos := array_append(v_logros_nuevos, 'RACHA_DEUDA_12M');
    END IF;
  END IF;

  -- Logros de nivel
  IF v_subio_nivel THEN
    IF v_nivel_nuevo >= 5 THEN
      IF rpg_otorgar_logro(p_usuario_id, 'NIVEL_5') THEN
        v_logros_nuevos := array_append(v_logros_nuevos, 'NIVEL_5');
      END IF;
    END IF;
    IF v_nivel_nuevo >= 10 THEN
      IF rpg_otorgar_logro(p_usuario_id, 'NIVEL_10') THEN
        v_logros_nuevos := array_append(v_logros_nuevos, 'NIVEL_10');
      END IF;
    END IF;
    IF v_nivel_nuevo >= 15 THEN
      IF rpg_otorgar_logro(p_usuario_id, 'NIVEL_15') THEN
        v_logros_nuevos := array_append(v_logros_nuevos, 'NIVEL_15');
      END IF;
    END IF;
    IF v_nivel_nuevo = 20 THEN
      IF rpg_otorgar_logro(p_usuario_id, 'LA_UNION') THEN
        v_logros_nuevos := array_append(v_logros_nuevos, 'LA_UNION');
      END IF;
    END IF;
  END IF;

  -- ── 10. Re-leer perfil actualizado para respuesta ────────────
  SELECT * INTO v_perfil FROM rpg_perfiles WHERE usuario_id = p_usuario_id;

  -- ── 11. Respuesta ─────────────────────────────────────────────
  v_resultado := jsonb_build_object(
    'success',        true,
    'xp_ganada',      v_xp,
    'xp_total',       v_perfil.xp_total,
    'nivel_anterior', v_nivel_anterior,
    'nivel_nuevo',    v_nivel_nuevo,
    'subio_nivel',    v_subio_nivel,
    'rango',          v_perfil.rango,
    'logros_nuevos',  v_logros_nuevos,
    'stats', jsonb_build_object(
      'finanzas',     v_perfil.stat_finanzas,
      'disciplina',   v_perfil.stat_disciplina,
      'vitalidad',    v_perfil.stat_vitalidad,
      'conocimiento', v_perfil.stat_conocimiento,
      'trabajo',      v_perfil.stat_trabajo
    ),
    'vida', v_perfil.vida
  );

  RETURN v_resultado;
END;
$$;
