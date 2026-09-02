-- ════════════════════════════════════════════════════════════════
-- 027_misiones_manuales.sql — ETAPA C (IDEMPOTENTE)
-- Misiones manuales de hábito para el motor RPG de QloB.
--
-- ZONA HORARIA: el sistema utiliza UTC como fecha canónica.
-- CURRENT_DATE representa la fecha UTC. El cambio de día puede
-- ocurrir a una hora distinta en la zona local del usuario.
-- Consistente con rpg_actualizar_racha y caps de INGRESO_REGISTRADO.
--
-- FUNCIONES REEMPLAZADAS:
--   · process_rpg_event (se extiende con rama MISION_MANUAL)
--   · completar_mision_manual (nueva — no existía antes)
--
-- ROLLBACK (si se necesita revertir):
--   DROP FUNCTION IF EXISTS completar_mision_manual(UUID);
--   DROP TABLE IF EXISTS public.misiones_manuales_log;
--   DROP TABLE IF EXISTS public.misiones_manuales;
--   -- Luego re-ejecutar 003_rpg_rachas_logros.sql para restaurar
--   -- process_rpg_event a su versión anterior.
-- ════════════════════════════════════════════════════════════════


-- ── 1. Catálogo de misiones manuales ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.misiones_manuales (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clave           TEXT        NOT NULL UNIQUE,
  camino          TEXT        NOT NULL
                              CHECK (camino IN ('finanzas','disciplina','vitalidad','conocimiento','trabajo')),
  nombre          TEXT        NOT NULL,
  descripcion     TEXT,
  emoji           TEXT        NOT NULL DEFAULT '⚔️',
  xp_recompensa   SMALLINT    NOT NULL DEFAULT 8
                              CHECK (xp_recompensa BETWEEN 1 AND 12),
  stat_key        TEXT        NOT NULL
                              CHECK (stat_key IN ('finanzas','disciplina','vitalidad','conocimiento','trabajo')),
  cooldown_horas  SMALLINT    NOT NULL DEFAULT 20
                              CHECK (cooldown_horas BETWEEN 1 AND 168),
  activa          BOOLEAN     NOT NULL DEFAULT TRUE,
  orden_ui        SMALLINT    NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.misiones_manuales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "misiones_manuales: lectura activa" ON public.misiones_manuales;
CREATE POLICY "misiones_manuales: lectura activa"
  ON public.misiones_manuales FOR SELECT
  USING (activa = TRUE);


-- ── 2. Log de completaciones ──────────────────────────────────────
-- id (UUID) = referencia_id único en rpg_eventos → idempotencia.
-- Sin INSERT policy: solo completar_mision_manual (SECURITY DEFINER) inserta.
CREATE TABLE IF NOT EXISTS public.misiones_manuales_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mision_id     UUID        NOT NULL REFERENCES public.misiones_manuales(id),
  xp_otorgada   SMALLINT    NOT NULL,
  -- ZONA HORARIA: dia usa CURRENT_DATE (UTC). El cap diario se resetea en medianoche UTC.
  dia           DATE        NOT NULL DEFAULT CURRENT_DATE,
  completada_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mm_log_usuario_dia
  ON public.misiones_manuales_log (usuario_id, dia);
CREATE INDEX IF NOT EXISTS idx_mm_log_usuario_mision_at
  ON public.misiones_manuales_log (usuario_id, mision_id, completada_at DESC);

ALTER TABLE public.misiones_manuales_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "misiones_manuales_log: lectura propia" ON public.misiones_manuales_log;
CREATE POLICY "misiones_manuales_log: lectura propia"
  ON public.misiones_manuales_log FOR SELECT
  USING (auth.uid() = usuario_id);


-- ── 3. Seed — 15 hábitos de cultivo ──────────────────────────────
INSERT INTO public.misiones_manuales
  (clave, camino, nombre, descripcion, emoji, xp_recompensa, stat_key, cooldown_horas, orden_ui)
VALUES
  ('finanzas_revisar_gastos',    'finanzas',     'Revisé mis gastos del día',            'Miré en qué gasté hoy y lo registré',          '💰',  6, 'finanzas',    20, 1),
  ('finanzas_evitar_impulso',    'finanzas',     'Evité una compra impulsiva',            'Sentí el impulso de comprar y lo resistí',      '🛑', 12, 'finanzas',    24, 2),
  ('finanzas_aportar_objetivo',  'finanzas',     'Aporté a un objetivo',                  'Transferí dinero a un ahorro o meta',            '🎯', 10, 'finanzas',    24, 3),
  ('disciplina_hora_planificada','disciplina',   'Me levanté a la hora planificada',      'Sin snooze',                                    '⏰',  8, 'disciplina',  20, 1),
  ('disciplina_rutina',          'disciplina',   'Completé mi rutina de la mañana',       'Ejercicio, meditación o lo planificado',         '🌅', 10, 'disciplina',  24, 2),
  ('disciplina_concentracion',   'disciplina',   'Modo concentrado 90 min',               'Sin distracciones, deep work real',              '🎯', 12, 'disciplina',  24, 3),
  ('vitalidad_hidratacion',      'vitalidad',    'Tomé 8 vasos de agua',                  'Mantuve hidratación plena hoy',                 '💧',  6, 'vitalidad',   20, 1),
  ('vitalidad_ejercicio',        'vitalidad',    'Hice ejercicio 30+ min',                'Cardio, pesas, yoga — lo que sea activo',        '🏃', 10, 'vitalidad',   24, 2),
  ('vitalidad_sueno',            'vitalidad',    'Dormí 7-8 horas',                       'Respeté mis horas de sueño anoche',             '😴',  8, 'vitalidad',   24, 3),
  ('conocimiento_leer',          'conocimiento', 'Leí 20+ minutos',                       'Un libro, artículo o material de aprendizaje',   '📖',  8, 'conocimiento',20, 1),
  ('conocimiento_aprender',      'conocimiento', 'Aprendí algo nuevo',                    'Tomé un curso, tutorial o nueva habilidad',      '🧠', 10, 'conocimiento',24, 2),
  ('conocimiento_analizar',      'conocimiento', 'Analicé mis datos financieros',         'Revisé reportes o gráficos de mis finanzas',     '📊',  8, 'conocimiento',24, 3),
  ('trabajo_tarea_dificil',      'trabajo',      'Terminé mi tarea más difícil primero',  'La que más evitaba, completada',                 '⚔️', 10, 'trabajo',     20, 1),
  ('trabajo_organizar',          'trabajo',      'Organicé mis pendientes',               'Revisé y prioricé mi lista del día',             '📋',  6, 'trabajo',     20, 2),
  ('trabajo_cerrar_importante',  'trabajo',      'Cerré algo importante',                 'Entregué, terminé o aprobé algo relevante',      '✅', 12, 'trabajo',     24, 3)
ON CONFLICT (clave) DO NOTHING;


-- ── 4. process_rpg_event — extensión con MISION_MANUAL ───────────
--
-- CAMBIOS respecto a 003_rpg_rachas_logros.sql:
--   + Rama MISION_MANUAL antes de la tabla VALUES estática.
--   + Guard auth.uid(): solo el propio usuario puede disparar MISION_MANUAL.
--   + XP y stat_key se leen desde la base (log → catálogo), nunca de p_metadatos.
--   + Validaciones de eventos del sistema sin cambios.
--   + Misiones manuales no alimentan rachas.
--
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
  v_subio_nivel       BOOLEAN  := FALSE;
  v_objetivo_monto    NUMERIC;
  v_deuda_edad_meses  INT;
  v_presupuesto_cats  INT;
  v_presupuesto_total NUMERIC;
  v_trabajo_hoy       INT;
  v_cobros_mes        INT;
  v_validacion_ok     BOOLEAN  := TRUE;
  v_skip_reason       TEXT;
  v_racha_contador    INT;
  v_logros_nuevos     TEXT[]   := '{}';
  v_resultado         JSONB;
  v_mm_xp             SMALLINT;
  v_mm_stat_key       TEXT;
BEGIN
  -- 0. Crear perfil si no existe
  INSERT INTO rpg_perfiles (usuario_id)
  VALUES (p_usuario_id)
  ON CONFLICT (usuario_id) DO NOTHING;

  -- 1. Idempotencia
  IF p_referencia_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM rpg_eventos
      WHERE referencia_id = p_referencia_id AND tipo_evento = p_tipo_evento
    ) THEN
      RETURN jsonb_build_object('success', false, 'skip', true, 'motivo', 'evento_duplicado');
    END IF;
  END IF;

  -- 2. Leer perfil actual
  SELECT * INTO v_perfil FROM rpg_perfiles WHERE usuario_id = p_usuario_id;
  v_nivel_anterior := v_perfil.nivel;

  -- 3. Recompensas
  IF p_tipo_evento = 'MISION_MANUAL' THEN

    -- Guard: solo el propio usuario puede disparar eventos manuales sobre su perfil.
    -- Los eventos del sistema (disparados internamente por funciones SECURITY DEFINER)
    -- no pasan por este guard — sus llamadas son legítimas con p_usuario_id arbitrario.
    IF p_usuario_id <> auth.uid() THEN
      RETURN jsonb_build_object('success', false, 'motivo', 'usuario_no_autorizado');
    END IF;

    -- Seguridad: XP y stat se leen exclusivamente desde la base de datos.
    -- p_metadatos se ignora para estos valores.
    -- Valida: log existe + pertenece a p_usuario_id + misión activa.
    SELECT mml.xp_otorgada, mm.stat_key
    INTO   v_mm_xp, v_mm_stat_key
    FROM   misiones_manuales_log mml
    JOIN   misiones_manuales     mm ON mm.id = mml.mision_id
    WHERE  mml.id         = p_referencia_id
      AND  mml.usuario_id = p_usuario_id
      AND  mm.activa      = TRUE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'motivo', 'mision_manual_invalida');
    END IF;

    v_xp := v_mm_xp;
    CASE v_mm_stat_key
      WHEN 'finanzas'     THEN v_d_fin := 1;
      WHEN 'disciplina'   THEN v_d_dis := 1;
      WHEN 'vitalidad'    THEN v_d_vit := 1;
      WHEN 'conocimiento' THEN v_d_con := 1;
      WHEN 'trabajo'      THEN v_d_tra := 1;
      ELSE NULL;
    END CASE;

  ELSE
    -- Tabla de recompensas estática — sin cambios respecto a 003_rpg_rachas_logros.sql
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
  END IF;

  -- 4. Validaciones anti-abuso (solo eventos del sistema)
  IF p_tipo_evento <> 'MISION_MANUAL' THEN
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
      WHERE usuario_id = p_usuario_id AND tipo_evento = 'INGRESO_REGISTRADO'
        AND created_at >= CURRENT_DATE;
      IF v_trabajo_hoy >= 3 THEN v_d_tra := 0; END IF;
    END IF;

    IF p_tipo_evento = 'COBRO_REGISTRADO' AND v_validacion_ok THEN
      SELECT COUNT(*) INTO v_cobros_mes
      FROM rpg_eventos
      WHERE usuario_id = p_usuario_id AND tipo_evento = 'COBRO_REGISTRADO'
        AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
        AND EXTRACT(YEAR  FROM created_at) = EXTRACT(YEAR  FROM NOW());
      IF v_cobros_mes >= 5 THEN
        v_validacion_ok := FALSE; v_skip_reason := 'cobros_mes_maximos';
      END IF;
    END IF;

    IF NOT v_validacion_ok THEN
      RETURN jsonb_build_object('success', false, 'skip', true, 'motivo', v_skip_reason);
    END IF;
  END IF;

  -- 5. Calcular nuevos valores
  v_xp_nuevo    := v_perfil.xp_total + v_xp;
  v_nivel_nuevo := GREATEST(v_nivel_anterior, rpg_calcular_nivel(v_xp_nuevo));
  v_subio_nivel := (v_nivel_nuevo > v_nivel_anterior);

  -- 6. Actualizar perfil
  UPDATE rpg_perfiles SET
    xp_total          = v_xp_nuevo,
    nivel             = v_nivel_nuevo,
    rango             = rpg_rango_para_nivel(v_nivel_nuevo),
    stat_finanzas     = rpg_clamp_stat(stat_finanzas,     v_d_fin),
    stat_disciplina   = rpg_clamp_stat(stat_disciplina,   v_d_dis),
    stat_vitalidad    = rpg_clamp_stat(stat_vitalidad,    v_d_vit),
    stat_conocimiento = rpg_clamp_stat(stat_conocimiento, v_d_con),
    stat_trabajo      = rpg_clamp_stat(stat_trabajo,      v_d_tra),
    vida              = GREATEST(0, LEAST(100, vida + v_d_vida)),
    updated_at        = NOW()
  WHERE usuario_id = p_usuario_id;

  -- 7. Registrar evento
  INSERT INTO rpg_eventos (
    usuario_id, tipo_evento, referencia_id, referencia_tipo,
    xp_otorgada, delta_finanzas, delta_disciplina, delta_vitalidad,
    delta_conocimiento, delta_trabajo, delta_vida, resultado
  ) VALUES (
    p_usuario_id, p_tipo_evento, p_referencia_id, p_referencia_tipo,
    v_xp, v_d_fin, v_d_dis, v_d_vit, v_d_con, v_d_tra, v_d_vida,
    jsonb_build_object(
      'nivel_anterior', v_nivel_anterior, 'nivel_nuevo', v_nivel_nuevo,
      'xp_total', v_xp_nuevo, 'subio_nivel', v_subio_nivel
    )
  );

  -- 8. Rachas (solo sistema — misiones manuales no alimentan rachas)
  IF p_tipo_evento IN ('PRESUPUESTO_CUMPLIDO_100','PRESUPUESTO_CUMPLIDO_90','PRESUPUESTO_CUMPLIDO_75') THEN
    v_racha_contador := rpg_actualizar_racha(p_usuario_id, 'presupuesto', true);
    IF v_racha_contador = 3  THEN PERFORM process_rpg_event(p_usuario_id, 'PRESUPUESTO_RACHA_3M',  NULL, 'racha'); END IF;
    IF v_racha_contador = 6  THEN PERFORM process_rpg_event(p_usuario_id, 'PRESUPUESTO_RACHA_6M',  NULL, 'racha'); END IF;
    IF v_racha_contador = 12 THEN PERFORM process_rpg_event(p_usuario_id, 'PRESUPUESTO_RACHA_12M', NULL, 'racha'); END IF;
  ELSIF p_tipo_evento = 'PRESUPUESTO_EXCEDIDO' THEN
    PERFORM rpg_actualizar_racha(p_usuario_id, 'presupuesto', false);
  END IF;

  IF p_tipo_evento IN ('DEUDA_CUOTA_TIEMPO','DEUDA_CUOTA_ADELANTADA') THEN
    v_racha_contador := rpg_actualizar_racha(p_usuario_id, 'deuda_pagos', true);
    IF v_racha_contador = 6  THEN PERFORM process_rpg_event(p_usuario_id, 'DEUDA_RACHA_6M',  NULL, 'racha'); END IF;
    IF v_racha_contador = 12 THEN PERFORM process_rpg_event(p_usuario_id, 'DEUDA_RACHA_12M', NULL, 'racha'); END IF;
  ELSIF p_tipo_evento = 'DEUDA_CUOTA_ATRASADA' THEN
    PERFORM rpg_actualizar_racha(p_usuario_id, 'deuda_pagos', false);
  END IF;

  -- 9. Logros
  IF p_tipo_evento = 'INGRESO_REGISTRADO' THEN
    IF rpg_otorgar_logro(p_usuario_id, 'PRIMEROS_PASOS', p_referencia_id) THEN
      v_logros_nuevos := array_append(v_logros_nuevos, 'PRIMEROS_PASOS');
    END IF;
  END IF;

  IF p_tipo_evento = 'DEUDA_COMPLETADA' THEN
    DECLARE v_total_deudas INT;
    BEGIN
      IF rpg_otorgar_logro(p_usuario_id, 'PRIMERA_DEUDA_ELIMINADA', p_referencia_id) THEN
        v_logros_nuevos := array_append(v_logros_nuevos, 'PRIMERA_DEUDA_ELIMINADA');
      END IF;
      SELECT COUNT(*) INTO v_total_deudas FROM rpg_eventos
        WHERE usuario_id = p_usuario_id AND tipo_evento = 'DEUDA_COMPLETADA';
      IF v_total_deudas >= 3 AND rpg_otorgar_logro(p_usuario_id, 'TRES_DEUDAS_ELIMINADAS') THEN
        v_logros_nuevos := array_append(v_logros_nuevos, 'TRES_DEUDAS_ELIMINADAS');
      END IF;
      IF v_total_deudas >= 5 AND rpg_otorgar_logro(p_usuario_id, 'CINCO_DEUDAS_ELIMINADAS') THEN
        v_logros_nuevos := array_append(v_logros_nuevos, 'CINCO_DEUDAS_ELIMINADAS');
      END IF;
    END;
  END IF;

  IF p_tipo_evento = 'OBJETIVO_COMPLETADO' THEN
    DECLARE v_total_obj INT;
    BEGIN
      IF rpg_otorgar_logro(p_usuario_id, 'PRIMER_OBJETIVO_COMPLETADO', p_referencia_id) THEN
        v_logros_nuevos := array_append(v_logros_nuevos, 'PRIMER_OBJETIVO_COMPLETADO');
      END IF;
      SELECT COUNT(*) INTO v_total_obj FROM rpg_eventos
        WHERE usuario_id = p_usuario_id AND tipo_evento = 'OBJETIVO_COMPLETADO';
      IF v_total_obj >= 3 AND rpg_otorgar_logro(p_usuario_id, 'TRES_OBJETIVOS_COMPLETADOS') THEN
        v_logros_nuevos := array_append(v_logros_nuevos, 'TRES_OBJETIVOS_COMPLETADOS');
      END IF;
    END;
  END IF;

  IF p_tipo_evento = 'PRESUPUESTO_RACHA_3M'  AND rpg_otorgar_logro(p_usuario_id, 'RACHA_PRESUPUESTO_3M')  THEN v_logros_nuevos := array_append(v_logros_nuevos, 'RACHA_PRESUPUESTO_3M');  END IF;
  IF p_tipo_evento = 'PRESUPUESTO_RACHA_6M'  AND rpg_otorgar_logro(p_usuario_id, 'RACHA_PRESUPUESTO_6M')  THEN v_logros_nuevos := array_append(v_logros_nuevos, 'RACHA_PRESUPUESTO_6M');  END IF;
  IF p_tipo_evento = 'PRESUPUESTO_RACHA_12M' AND rpg_otorgar_logro(p_usuario_id, 'ANIO_DE_ACERO')         THEN v_logros_nuevos := array_append(v_logros_nuevos, 'ANIO_DE_ACERO');          END IF;
  IF p_tipo_evento = 'DEUDA_RACHA_6M'        AND rpg_otorgar_logro(p_usuario_id, 'RACHA_DEUDA_6M')        THEN v_logros_nuevos := array_append(v_logros_nuevos, 'RACHA_DEUDA_6M');        END IF;
  IF p_tipo_evento = 'DEUDA_RACHA_12M'       AND rpg_otorgar_logro(p_usuario_id, 'RACHA_DEUDA_12M')       THEN v_logros_nuevos := array_append(v_logros_nuevos, 'RACHA_DEUDA_12M');       END IF;

  IF v_subio_nivel THEN
    IF v_nivel_nuevo >= 5  AND rpg_otorgar_logro(p_usuario_id, 'NIVEL_5')  THEN v_logros_nuevos := array_append(v_logros_nuevos, 'NIVEL_5');  END IF;
    IF v_nivel_nuevo >= 10 AND rpg_otorgar_logro(p_usuario_id, 'NIVEL_10') THEN v_logros_nuevos := array_append(v_logros_nuevos, 'NIVEL_10'); END IF;
    IF v_nivel_nuevo >= 15 AND rpg_otorgar_logro(p_usuario_id, 'NIVEL_15') THEN v_logros_nuevos := array_append(v_logros_nuevos, 'NIVEL_15'); END IF;
    IF v_nivel_nuevo  = 20 AND rpg_otorgar_logro(p_usuario_id, 'LA_UNION') THEN v_logros_nuevos := array_append(v_logros_nuevos, 'LA_UNION'); END IF;
  END IF;

  -- 10. Re-leer perfil y responder
  SELECT * INTO v_perfil FROM rpg_perfiles WHERE usuario_id = p_usuario_id;

  RETURN jsonb_build_object(
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
END;
$$;


-- ── 5. completar_mision_manual — RPC pública ─────────────────────
--
-- Guards en orden:
--   0. auth.uid() no es null
--   1. Advisory lock por usuario → serializa concurrencia (anti-carrera cap)
--   2. Misión existe y activa
--   3. Cooldown (horas absolutas UTC desde última completación)
--   4. Cap XP diario 30 (lectura serializada dentro del lock)
--   5. INSERT en log → log_id UUID único
--   6. process_rpg_event → si falla, RAISE EXCEPTION rollbackea todo
--
-- ATOMICIDAD: INSERT log y proceso RPG son la misma transacción.
-- El log nunca puede existir sin su rpg_evento correspondiente.
--
CREATE OR REPLACE FUNCTION completar_mision_manual(p_mision_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         UUID             := auth.uid();
  v_mision      misiones_manuales%ROWTYPE;
  v_xp_hoy      SMALLINT;
  v_xp_cap      CONSTANT SMALLINT := 30;
  v_xp_real     SMALLINT;
  v_ultima      TIMESTAMPTZ;
  v_log_id      UUID;
  v_rpg_result  JSONB;
BEGIN
  -- Guard 0: usuario autenticado
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_autenticado');
  END IF;

  -- Guard 1: lock transaccional por usuario.
  -- Serializa llamadas simultáneas del mismo usuario antes de leer xp_hoy.
  -- Se libera automáticamente al cerrar la transacción.
  PERFORM pg_advisory_xact_lock(hashtext(v_uid::TEXT)::BIGINT);

  -- Guard 2: misión existe y activa
  SELECT * INTO v_mision FROM misiones_manuales
    WHERE id = p_mision_id AND activa = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'mision_no_encontrada');
  END IF;

  -- Guard 3: cooldown
  -- NOW() es UTC. El cooldown opera en horas absolutas UTC.
  SELECT MAX(completada_at) INTO v_ultima
    FROM misiones_manuales_log
    WHERE usuario_id = v_uid AND mision_id = p_mision_id;

  IF v_ultima IS NOT NULL AND
     (NOW() - v_ultima) < (v_mision.cooldown_horas * INTERVAL '1 hour') THEN
    RETURN jsonb_build_object(
      'ok',            false,
      'error',         'cooldown',
      'disponible_en', v_ultima + (v_mision.cooldown_horas * INTERVAL '1 hour')
    );
  END IF;

  -- Guard 4: cap XP diario
  -- ZONA HORARIA: CURRENT_DATE es fecha UTC. El sistema utiliza UTC como
  -- fecha canónica; el cambio de día puede ocurrir a una hora distinta
  -- en la zona local del usuario.
  -- Lectura serializada dentro del lock → sin carrera de concurrencia.
  SELECT COALESCE(SUM(xp_otorgada), 0) INTO v_xp_hoy
    FROM misiones_manuales_log
    WHERE usuario_id = v_uid AND dia = CURRENT_DATE;

  v_xp_real := LEAST(v_mision.xp_recompensa, v_xp_cap - v_xp_hoy);
  IF v_xp_real <= 0 THEN
    RETURN jsonb_build_object(
      'ok',         false,
      'error',      'limite_diario_alcanzado',
      'xp_hoy',     v_xp_hoy,
      'cap_diario', v_xp_cap
    );
  END IF;

  -- Registrar en log → log_id UUID único por completación
  INSERT INTO misiones_manuales_log (usuario_id, mision_id, xp_otorgada)
    VALUES (v_uid, p_mision_id, v_xp_real)
    RETURNING id INTO v_log_id;

  -- Llamar al motor RPG
  v_rpg_result := process_rpg_event(
    p_usuario_id      := v_uid,
    p_tipo_evento     := 'MISION_MANUAL',
    p_referencia_id   := v_log_id,
    p_referencia_tipo := 'mision_manual',
    p_metadatos       := '{}'::JSONB
  );

  -- ATOMICIDAD: si el motor falla, RAISE EXCEPTION revierte toda la transacción.
  -- El INSERT en misiones_manuales_log se deshace junto con cualquier
  -- modificación parcial del motor. El log nunca queda huérfano.
  IF (v_rpg_result->>'success')::BOOLEAN IS NOT TRUE THEN
    RAISE EXCEPTION 'mision_manual_motor_fallo: %', v_rpg_result::TEXT
      USING ERRCODE = 'P0001',
            DETAIL  = v_rpg_result::TEXT;
  END IF;

  RETURN jsonb_build_object(
    'ok',          true,
    'xp_otorgada', v_xp_real,
    'xp_hoy',      v_xp_hoy + v_xp_real,
    'cap_diario',  v_xp_cap,
    'rpg',         v_rpg_result
  );
END;
$$;
