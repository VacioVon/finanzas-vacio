-- ============================================================
-- RPG MISIONES / QUESTS — HITO 06.8 (IDEMPOTENTE)
-- Sistema de misiones conectado al comportamiento financiero real.
-- Backend-first: React solo solicita; Supabase evalúa, recompensa y registra.
-- No modifica tablas existentes. No modifica el árbol (06.7).
-- ============================================================

-- ─── TABLAS ──────────────────────────────────────────────────

-- Catálogo de misiones (definición estática, seed por código)
CREATE TABLE IF NOT EXISTS public.rpg_misiones (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  clave            TEXT         UNIQUE NOT NULL,
  nombre           TEXT         NOT NULL,
  descripcion      TEXT         NOT NULL,
  tipo             TEXT         NOT NULL CHECK (tipo IN ('diaria','semanal','especial')),
  dificultad       TEXT         NOT NULL CHECK (dificultad IN ('facil','media','dificil','legendaria')),
  condicion_tipo   TEXT         NOT NULL,
  condicion_valor  INT          NOT NULL DEFAULT 1,
  xp_recompensa    INT          NOT NULL DEFAULT 10,
  stat_recompensa  TEXT,        -- 'finanzas'|'disciplina'|'vitalidad'|'conocimiento'|'trabajo'|NULL
  stat_delta       INT          DEFAULT 0,
  vida_delta       INT          DEFAULT 0,
  activa           BOOLEAN      DEFAULT TRUE,
  orden_ui         INT          DEFAULT 0,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- Instancias por usuario × misión × período (anti-farming via UNIQUE)
CREATE TABLE IF NOT EXISTS public.rpg_misiones_usuario (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mision_id        UUID         NOT NULL REFERENCES public.rpg_misiones(id) ON DELETE CASCADE,
  periodo_inicio   TIMESTAMPTZ  NOT NULL,
  periodo_fin      TIMESTAMPTZ  NOT NULL,
  estado           TEXT         DEFAULT 'pendiente'
                                CHECK (estado IN ('pendiente','en_progreso','completada','expirada')),
  progreso         INT          DEFAULT 0,
  baseline         INT          DEFAULT 0,
  completada_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  -- Una instancia activa por usuario+misión+período
  UNIQUE (usuario_id, mision_id, periodo_inicio)
);

-- ─── ÍNDICES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rpg_misiones_usuario_uid  ON public.rpg_misiones_usuario (usuario_id, mision_id);
CREATE INDEX IF NOT EXISTS idx_rpg_misiones_usuario_est  ON public.rpg_misiones_usuario (usuario_id, estado);

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.rpg_misiones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rpg_misiones_usuario ENABLE ROW LEVEL SECURITY;

-- Catálogo: lectura pública autenticada
DROP POLICY IF EXISTS "rpg_misiones: lectura pública" ON public.rpg_misiones;
CREATE POLICY "rpg_misiones: lectura pública"
  ON public.rpg_misiones FOR SELECT USING (true);

-- Instancias: lectura propia (escritura solo vía funciones SECURITY DEFINER)
DROP POLICY IF EXISTS "rpg_misiones_usuario: lectura propia" ON public.rpg_misiones_usuario;
CREATE POLICY "rpg_misiones_usuario: lectura propia"
  ON public.rpg_misiones_usuario FOR SELECT
  USING (auth.uid() = usuario_id);

-- ─── SEED — CATÁLOGO DE MISIONES ─────────────────────────────
INSERT INTO public.rpg_misiones
  (clave, nombre, descripcion, tipo, dificultad, condicion_tipo, condicion_valor, xp_recompensa, stat_recompensa, stat_delta, vida_delta, orden_ui)
VALUES
  -- DIARIAS
  ('diaria_registrar_movimiento',
   'Ordena tu camino',
   'Registra al menos 1 movimiento hoy.',
   'diaria', 'facil',
   'movimientos_count_hoy', 1,
   10, NULL, 0, 0, 10),

  ('diaria_presupuesto_activo',
   'El guardián de la balanza',
   'Tienes al menos 1 presupuesto activo este mes.',
   'diaria', 'facil',
   'presupuesto_activo', 1,
   5, NULL, 0, 0, 20),

  ('diaria_sin_gasto_sin_categoria',
   'Consciencia del flujo',
   'No registras gastos sin categoría hoy.',
   'diaria', 'facil',
   'gastos_sin_categoria_hoy', 1,
   8, 'disciplina', 1, 0, 30),

  -- SEMANALES
  ('semanal_presupuesto_cumplido',
   'Fortalece tus raíces',
   'Mantén los gastos bajo el presupuesto en al menos 3 categorías esta semana.',
   'semanal', 'media',
   'gastos_bajo_presupuesto', 3,
   45, 'disciplina', 3, 0, 40),

  ('semanal_registrar_5_dias',
   'El cronista del meridiano',
   'Registra movimientos en al menos 5 días distintos esta semana.',
   'semanal', 'media',
   'movimientos_dias_semana', 5,
   30, 'disciplina', 2, 0, 50),

  ('semanal_ahorro_positivo',
   'El arte de retener',
   'Tu ahorro neto esta semana es positivo.',
   'semanal', 'media',
   'ahorro_neto_positivo', 1,
   40, 'finanzas', 3, 0, 60),

  ('semanal_sin_deuda_nueva',
   'Escudo de los compromisos',
   'No registras nuevas deudas esta semana.',
   'semanal', 'facil',
   'deudas_nuevas_semana', 1,
   25, 'vitalidad', 2, 0, 70),

  -- ESPECIALES
  ('especial_eliminar_deuda',
   'Romper la cadena',
   'Cierra una deuda activa.',
   'especial', 'dificil',
   'deuda_cerrada', 1,
   150, 'finanzas', 10, 5, 80),

  ('especial_completar_objetivo',
   'La cosecha del cultivo',
   'Completa un objetivo de ahorro al 100%.',
   'especial', 'dificil',
   'objetivo_completado', 1,
   200, 'finanzas', 10, 10, 90),

  ('especial_racha_30',
   'La llama que no se apaga',
   'Mantén una racha de 30 días consecutivos.',
   'especial', 'legendaria',
   'racha_dias', 30,
   300, NULL, 0, 20, 100)

ON CONFLICT (clave) DO UPDATE SET
  nombre          = EXCLUDED.nombre,
  descripcion     = EXCLUDED.descripcion,
  xp_recompensa   = EXCLUDED.xp_recompensa,
  stat_recompensa = EXCLUDED.stat_recompensa,
  stat_delta      = EXCLUDED.stat_delta,
  vida_delta      = EXCLUDED.vida_delta,
  orden_ui        = EXCLUDED.orden_ui;

-- ─── FUNCIÓN: período activo por tipo ────────────────────────
CREATE OR REPLACE FUNCTION rpg_periodo_mision(p_tipo TEXT)
RETURNS TABLE(inicio TIMESTAMPTZ, fin TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SET search_path = public AS $$
BEGIN
  IF p_tipo = 'diaria' THEN
    RETURN QUERY SELECT
      date_trunc('day', NOW()),
      date_trunc('day', NOW()) + INTERVAL '1 day';
  ELSIF p_tipo = 'semanal' THEN
    -- Lunes a domingo (ISO week: Monday = 1)
    RETURN QUERY SELECT
      date_trunc('week', NOW()),
      date_trunc('week', NOW()) + INTERVAL '7 days';
  ELSE
    -- Especiales: ventana permanente (se completan una vez para siempre)
    RETURN QUERY SELECT
      '2020-01-01 00:00:00+00'::TIMESTAMPTZ,
      '2099-12-31 23:59:59+00'::TIMESTAMPTZ;
  END IF;
END;
$$;

-- ─── FUNCIÓN: evaluar condición de misión ────────────────────
-- Retorna el valor actual de la condición para el usuario en el período dado.
-- SECURITY DEFINER para acceder a tablas financieras del usuario.
CREATE OR REPLACE FUNCTION rpg_evaluar_condicion_mision(
  p_usuario_id     UUID,
  p_condicion_tipo TEXT,
  p_periodo_inicio TIMESTAMPTZ,
  p_periodo_fin    TIMESTAMPTZ
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_resultado INT := 0;
BEGIN
  CASE p_condicion_tipo

    WHEN 'movimientos_count_hoy' THEN
      SELECT COUNT(*) INTO v_resultado
      FROM movimientos
      WHERE usuario_id = p_usuario_id
        AND DATE(created_at) = CURRENT_DATE;

    WHEN 'presupuesto_activo' THEN
      SELECT COUNT(*) INTO v_resultado
      FROM presupuestos
      WHERE usuario_id = p_usuario_id
        AND mes  = EXTRACT(MONTH FROM NOW())::INT
        AND anio = EXTRACT(YEAR  FROM NOW())::INT;

    WHEN 'gastos_sin_categoria_hoy' THEN
      -- 1 si NO hay gastos sin categoría hoy, 0 si los hay
      SELECT CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END INTO v_resultado
      FROM movimientos
      WHERE usuario_id = p_usuario_id
        AND tipo = 'gasto'
        AND categoria_id IS NULL
        AND DATE(created_at) = CURRENT_DATE;

    WHEN 'gastos_bajo_presupuesto' THEN
      -- Cuenta categorías donde gastos del período < presupuesto mensual
      SELECT COUNT(*) INTO v_resultado
      FROM (
        SELECT p.id
        FROM presupuestos p
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(m.monto), 0) AS gastado
          FROM movimientos m
          WHERE m.categoria_id = p.categoria_id
            AND m.usuario_id   = p_usuario_id
            AND m.tipo         = 'gasto'
            AND m.created_at BETWEEN p_periodo_inicio AND p_periodo_fin
        ) g ON TRUE
        WHERE p.usuario_id = p_usuario_id
          AND p.mes  = EXTRACT(MONTH FROM p_periodo_inicio)::INT
          AND p.anio = EXTRACT(YEAR  FROM p_periodo_inicio)::INT
          AND g.gastado < p.monto_presupuestado
      ) sub;

    WHEN 'movimientos_dias_semana' THEN
      SELECT COUNT(DISTINCT DATE(created_at)) INTO v_resultado
      FROM movimientos
      WHERE usuario_id = p_usuario_id
        AND created_at BETWEEN p_periodo_inicio AND p_periodo_fin;

    WHEN 'ahorro_neto_positivo' THEN
      -- 1 si hay al menos 1 movimiento de ahorro en el período, 0 si no
      SELECT CASE WHEN COALESCE(SUM(monto), 0) > 0 THEN 1 ELSE 0 END INTO v_resultado
      FROM movimientos
      WHERE usuario_id = p_usuario_id
        AND tipo = 'ahorro'
        AND created_at BETWEEN p_periodo_inicio AND p_periodo_fin;

    WHEN 'deudas_nuevas_semana' THEN
      -- 1 si NO hay deudas nuevas en el período, 0 si las hay
      SELECT CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END INTO v_resultado
      FROM deudas
      WHERE usuario_id = p_usuario_id
        AND created_at BETWEEN p_periodo_inicio AND p_periodo_fin;

    WHEN 'deuda_cerrada' THEN
      SELECT COUNT(*) INTO v_resultado
      FROM deudas
      WHERE usuario_id = p_usuario_id
        AND estado = 'pagada'
        AND updated_at BETWEEN p_periodo_inicio AND p_periodo_fin;

    WHEN 'objetivo_completado' THEN
      SELECT COUNT(*) INTO v_resultado
      FROM objetivos_ahorro
      WHERE usuario_id = p_usuario_id
        AND estado = 'completado'
        AND updated_at BETWEEN p_periodo_inicio AND p_periodo_fin;

    WHEN 'racha_dias' THEN
      SELECT COALESCE(r.contador, 0) INTO v_resultado
      FROM rpg_rachas r
      WHERE r.usuario_id = p_usuario_id
        AND r.tipo_racha  = 'diaria';

    WHEN 'stats_minimo_todos' THEN
      -- Retorna el mínimo de todos los stats (condicion_valor = 50 para completar)
      SELECT LEAST(stat_finanzas, stat_disciplina, stat_vitalidad, stat_conocimiento, stat_trabajo)
      INTO v_resultado
      FROM rpg_perfiles
      WHERE usuario_id = p_usuario_id;

    ELSE
      v_resultado := 0;
  END CASE;

  RETURN COALESCE(v_resultado, 0);
END;
$$;

-- ─── FUNCIÓN: aplicar recompensa variable de misión ──────────
-- Aplica XP + stat + vida directamente al perfil RPG.
-- Separada de process_rpg_event porque las misiones tienen XP variable.
-- Idempotente: si ya existe el evento con ese referencia_id+tipo_evento, no aplica.
CREATE OR REPLACE FUNCTION rpg_aplicar_recompensa_mision(
  p_usuario_id    UUID,
  p_xp            INT,
  p_stat_nombre   TEXT,      -- stat a incrementar o NULL
  p_stat_delta    INT,
  p_vida_delta    INT,
  p_referencia_id UUID,      -- rpg_misiones_usuario.id
  p_tipo_evento   TEXT       -- 'MISION_<clave>'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_perfil         rpg_perfiles%ROWTYPE;
  v_xp_nuevo       INT;
  v_nivel_anterior SMALLINT;
  v_nivel_nuevo    SMALLINT;
  v_subio_nivel    BOOLEAN := FALSE;
BEGIN
  -- Idempotencia: evitar doble recompensa
  IF EXISTS (
    SELECT 1 FROM rpg_eventos
    WHERE referencia_id = p_referencia_id AND tipo_evento = p_tipo_evento
  ) THEN
    RETURN jsonb_build_object('skip', true, 'motivo', 'recompensa_ya_otorgada');
  END IF;

  -- Crear perfil si no existe
  INSERT INTO rpg_perfiles (usuario_id) VALUES (p_usuario_id) ON CONFLICT DO NOTHING;
  SELECT * INTO v_perfil FROM rpg_perfiles WHERE usuario_id = p_usuario_id;

  v_nivel_anterior := v_perfil.nivel;
  v_xp_nuevo       := v_perfil.xp_total + COALESCE(p_xp, 0);
  v_nivel_nuevo    := GREATEST(v_nivel_anterior, rpg_calcular_nivel(v_xp_nuevo));
  v_subio_nivel    := (v_nivel_nuevo > v_nivel_anterior);

  -- Actualizar perfil con XP + stat + vida
  UPDATE rpg_perfiles SET
    xp_total    = v_xp_nuevo,
    nivel       = v_nivel_nuevo,
    rango       = rpg_rango_para_nivel(v_nivel_nuevo),
    stat_finanzas     = CASE WHEN p_stat_nombre = 'finanzas'
                             THEN rpg_clamp_stat(stat_finanzas,     COALESCE(p_stat_delta,0)::SMALLINT)
                             ELSE stat_finanzas     END,
    stat_disciplina   = CASE WHEN p_stat_nombre = 'disciplina'
                             THEN rpg_clamp_stat(stat_disciplina,   COALESCE(p_stat_delta,0)::SMALLINT)
                             ELSE stat_disciplina   END,
    stat_vitalidad    = CASE WHEN p_stat_nombre = 'vitalidad'
                             THEN rpg_clamp_stat(stat_vitalidad,    COALESCE(p_stat_delta,0)::SMALLINT)
                             ELSE stat_vitalidad    END,
    stat_conocimiento = CASE WHEN p_stat_nombre = 'conocimiento'
                             THEN rpg_clamp_stat(stat_conocimiento, COALESCE(p_stat_delta,0)::SMALLINT)
                             ELSE stat_conocimiento END,
    stat_trabajo      = CASE WHEN p_stat_nombre = 'trabajo'
                             THEN rpg_clamp_stat(stat_trabajo,      COALESCE(p_stat_delta,0)::SMALLINT)
                             ELSE stat_trabajo      END,
    vida        = GREATEST(0, LEAST(100, vida + COALESCE(p_vida_delta, 0))),
    updated_at  = NOW()
  WHERE usuario_id = p_usuario_id;

  -- Registrar evento (idempotencia garantizada por UNIQUE arriba)
  INSERT INTO rpg_eventos (
    usuario_id, tipo_evento, referencia_id, referencia_tipo,
    xp_otorgada,
    delta_finanzas, delta_disciplina, delta_vitalidad, delta_conocimiento, delta_trabajo,
    delta_vida, resultado
  ) VALUES (
    p_usuario_id, p_tipo_evento, p_referencia_id, 'mision',
    COALESCE(p_xp, 0)::SMALLINT,
    CASE WHEN p_stat_nombre = 'finanzas'     THEN COALESCE(p_stat_delta,0) ELSE 0 END::SMALLINT,
    CASE WHEN p_stat_nombre = 'disciplina'   THEN COALESCE(p_stat_delta,0) ELSE 0 END::SMALLINT,
    CASE WHEN p_stat_nombre = 'vitalidad'    THEN COALESCE(p_stat_delta,0) ELSE 0 END::SMALLINT,
    CASE WHEN p_stat_nombre = 'conocimiento' THEN COALESCE(p_stat_delta,0) ELSE 0 END::SMALLINT,
    CASE WHEN p_stat_nombre = 'trabajo'      THEN COALESCE(p_stat_delta,0) ELSE 0 END::SMALLINT,
    COALESCE(p_vida_delta, 0)::SMALLINT,
    jsonb_build_object(
      'nivel_anterior', v_nivel_anterior,
      'nivel_nuevo',    v_nivel_nuevo,
      'xp_total',       v_xp_nuevo,
      'subio_nivel',    v_subio_nivel
    )
  );

  -- Logros de nivel (reutilizar lógica del motor existente)
  IF v_subio_nivel THEN
    IF v_nivel_nuevo >= 5  THEN PERFORM rpg_otorgar_logro(p_usuario_id, 'NIVEL_5');  END IF;
    IF v_nivel_nuevo >= 10 THEN PERFORM rpg_otorgar_logro(p_usuario_id, 'NIVEL_10'); END IF;
    IF v_nivel_nuevo >= 15 THEN PERFORM rpg_otorgar_logro(p_usuario_id, 'NIVEL_15'); END IF;
    IF v_nivel_nuevo = 20  THEN PERFORM rpg_otorgar_logro(p_usuario_id, 'LA_UNION'); END IF;
  END IF;

  RETURN jsonb_build_object(
    'success',        true,
    'xp_ganada',      COALESCE(p_xp, 0),
    'xp_total',       v_xp_nuevo,
    'nivel_anterior', v_nivel_anterior,
    'nivel_nuevo',    v_nivel_nuevo,
    'subio_nivel',    v_subio_nivel,
    'rango',          rpg_rango_para_nivel(v_nivel_nuevo)
  );
END;
$$;

-- ─── FUNCIÓN PRINCIPAL: verificar_mision ─────────────────────
-- Evalúa la condición de una misión para el usuario,
-- actualiza el progreso y otorga la recompensa si se cumple.
-- Idempotente: llamar múltiples veces es seguro.
CREATE OR REPLACE FUNCTION verificar_mision(
  p_user_id   UUID,
  p_mision_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_mision        rpg_misiones%ROWTYPE;
  v_instancia     rpg_misiones_usuario%ROWTYPE;
  v_periodo_ini   TIMESTAMPTZ;
  v_periodo_fin   TIMESTAMPTZ;
  v_valor_actual  INT;
  v_progreso      INT;
  v_completada    BOOLEAN := FALSE;
  v_resultado_rpg JSONB;
BEGIN
  -- 1. Obtener definición de la misión
  SELECT * INTO v_mision FROM rpg_misiones WHERE id = p_mision_id AND activa;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'mision_no_encontrada');
  END IF;

  -- 2. Calcular período activo
  SELECT inicio, fin INTO v_periodo_ini, v_periodo_fin
  FROM rpg_periodo_mision(v_mision.tipo);

  -- 3. Obtener o crear instancia del período (baseline = 0 siempre al inicio)
  INSERT INTO rpg_misiones_usuario
    (usuario_id, mision_id, periodo_inicio, periodo_fin, baseline)
  VALUES
    (p_user_id, p_mision_id, v_periodo_ini, v_periodo_fin, 0)
  ON CONFLICT (usuario_id, mision_id, periodo_inicio) DO NOTHING;

  SELECT * INTO v_instancia FROM rpg_misiones_usuario
  WHERE usuario_id = p_user_id
    AND mision_id  = p_mision_id
    AND periodo_inicio = v_periodo_ini;

  -- 4. Si ya está completada, no hacer nada más
  IF v_instancia.estado = 'completada' THEN
    RETURN jsonb_build_object(
      'ok',           true,
      'ya_completada', true,
      'progreso',     v_instancia.progreso,
      'objetivo',     v_mision.condicion_valor
    );
  END IF;

  -- 5. Evaluar condición actual
  v_valor_actual := rpg_evaluar_condicion_mision(
    p_user_id, v_mision.condicion_tipo, v_periodo_ini, v_periodo_fin
  );
  v_progreso := GREATEST(0, v_valor_actual - v_instancia.baseline);

  -- 6. Actualizar progreso en la instancia
  UPDATE rpg_misiones_usuario
  SET progreso = v_progreso,
      estado   = CASE
        WHEN v_progreso > 0 AND estado = 'pendiente' THEN 'en_progreso'
        ELSE estado
      END
  WHERE id = v_instancia.id;

  -- 7. Si condición cumplida → completar + otorgar recompensa
  IF v_progreso >= v_mision.condicion_valor THEN
    UPDATE rpg_misiones_usuario
    SET estado = 'completada', completada_at = NOW()
    WHERE id = v_instancia.id;

    v_resultado_rpg := rpg_aplicar_recompensa_mision(
      p_user_id,
      v_mision.xp_recompensa,
      v_mision.stat_recompensa,
      COALESCE(v_mision.stat_delta, 0),
      COALESCE(v_mision.vida_delta, 0),
      v_instancia.id,
      'MISION_' || v_mision.clave
    );
    v_completada := TRUE;
  END IF;

  RETURN jsonb_build_object(
    'ok',         true,
    'completada', v_completada,
    'progreso',   v_progreso,
    'objetivo',   v_mision.condicion_valor,
    'xp_ganado',  CASE WHEN v_completada THEN v_mision.xp_recompensa ELSE 0 END,
    'rpg',        v_resultado_rpg
  );
END;
$$;

-- ─── FUNCIÓN: verificar todas las misiones del usuario ───────
-- Llama verificar_mision para cada misión activa y retorna un resumen.
-- Usado por React al abrir el panel de misiones.
CREATE OR REPLACE FUNCTION verificar_todas_misiones_usuario(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_mision  rpg_misiones%ROWTYPE;
  v_res     JSONB;
  v_results JSONB := '[]'::JSONB;
BEGIN
  FOR v_mision IN
    SELECT * FROM rpg_misiones WHERE activa ORDER BY orden_ui
  LOOP
    v_res     := verificar_mision(p_user_id, v_mision.id);
    v_results := v_results || jsonb_build_array(
      jsonb_build_object('clave', v_mision.clave, 'resultado', v_res)
    );
  END LOOP;
  RETURN v_results;
END;
$$;

-- ─── FUNCIÓN: leer estado actual de misiones (UI) ────────────
-- Lectura pura del estado sin otorgar recompensas.
-- React la usa para mostrar el panel de misiones.
CREATE OR REPLACE FUNCTION obtener_misiones_usuario(p_user_id UUID)
RETURNS TABLE (
  mision_id       UUID,
  clave           TEXT,
  nombre          TEXT,
  descripcion     TEXT,
  tipo            TEXT,
  dificultad      TEXT,
  condicion_tipo  TEXT,
  condicion_valor INT,
  xp_recompensa   INT,
  stat_recompensa TEXT,
  stat_delta      INT,
  vida_delta      INT,
  orden_ui        INT,
  instancia_id    UUID,
  estado          TEXT,
  progreso        INT,
  periodo_inicio  TIMESTAMPTZ,
  periodo_fin     TIMESTAMPTZ,
  completada_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_mision      rpg_misiones%ROWTYPE;
  v_periodo_ini TIMESTAMPTZ;
  v_periodo_fin TIMESTAMPTZ;
BEGIN
  FOR v_mision IN
    SELECT * FROM rpg_misiones WHERE activa ORDER BY orden_ui
  LOOP
    SELECT inicio, fin INTO v_periodo_ini, v_periodo_fin
    FROM rpg_periodo_mision(v_mision.tipo);

    RETURN QUERY
    SELECT
      v_mision.id,
      v_mision.clave,
      v_mision.nombre,
      v_mision.descripcion,
      v_mision.tipo,
      v_mision.dificultad,
      v_mision.condicion_tipo,
      v_mision.condicion_valor,
      v_mision.xp_recompensa,
      v_mision.stat_recompensa,
      v_mision.stat_delta,
      v_mision.vida_delta,
      v_mision.orden_ui,
      mu.id              AS instancia_id,
      COALESCE(mu.estado, 'pendiente') AS estado,
      COALESCE(mu.progreso, 0)         AS progreso,
      v_periodo_ini,
      v_periodo_fin,
      mu.completada_at
    FROM (VALUES (1)) dummy(x)
    LEFT JOIN public.rpg_misiones_usuario mu ON
      mu.usuario_id      = p_user_id
      AND mu.mision_id   = v_mision.id
      AND mu.periodo_inicio = v_periodo_ini;
  END LOOP;
END;
$$;
