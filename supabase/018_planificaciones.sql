-- ============================================================
-- FINANZAS VACÍO — Hito 03: Planificador financiero
--
-- Separación conceptual:
--   Movimiento real   = ya ocurrió (tabla movimientos)
--   Compromiso        = obligación existente (suscripciones/cuotas/deudas)
--   Planificación     = yo quiero que ocurra (tabla planificaciones)
--
-- Diseño de recurrencia:
--   recurrencia JSONB      = configuración estática {frecuencia, intervalo_dias?, fin?}
--   ocurrencias_restantes  = estado dinámico del countdown (NULL = sin límite)
--   Solo existe la próxima ocurrencia en BD; las siguientes se expanden en memoria.
-- ============================================================

-- ─── 1. Tabla planificaciones ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.planificaciones (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Qué
  tipo                  TEXT NOT NULL CHECK (tipo IN ('gasto','ingreso','ahorro','mover')),
  monto                 NUMERIC(12,0) NOT NULL CHECK (monto > 0),
  fecha                 DATE NOT NULL,

  -- Clasificación (reutiliza tablas existentes)
  categoria_id          UUID REFERENCES public.categorias(id),
  subcategoria_id       UUID REFERENCES public.subcategorias(id),
  descripcion           TEXT,
  comercio              TEXT,

  -- Cuentas
  -- gasto/ingreso/ahorro: cuenta_id = cuenta origen/destino
  -- mover: cuenta_id = origen, cuenta_destino_id = destino
  -- ahorro con objetivo: objetivo_id = objetivo vinculado
  cuenta_id             UUID REFERENCES public.cuentas(id),
  cuenta_destino_id     UUID REFERENCES public.cuentas(id),
  objetivo_id           UUID REFERENCES public.objetivos_ahorro(id),

  nota                  TEXT,

  -- Recurrencia
  -- Ejemplo mensual:      {"frecuencia":"mensual","fin":null}
  -- Ejemplo personalizado: {"frecuencia":"personalizada","intervalo_dias":10,"fin":"2026-12-31"}
  recurrencia           JSONB,
  ocurrencias_restantes INT CHECK (ocurrencias_restantes IS NULL OR ocurrencias_restantes > 0),

  -- Ciclo de vida
  estado                TEXT NOT NULL DEFAULT 'pendiente'
                        CHECK (estado IN ('pendiente','realizado','cancelado')),
  movimiento_id         UUID REFERENCES public.movimientos(id), -- se llena al convertir

  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- ─── 2. RLS ───────────────────────────────────────────────────
ALTER TABLE public.planificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planificaciones: propietario"
  ON public.planificaciones FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── 3. Índices ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_plan_user_fecha
  ON public.planificaciones (user_id, fecha);

CREATE INDEX IF NOT EXISTS idx_plan_user_estado
  ON public.planificaciones (user_id, estado);

-- ─── 4. RPC: convertir_planificacion_a_movimiento ─────────────
--
-- Convierte atómicamente una planificación pendiente en movimiento real.
-- Pasos dentro de una única transacción:
--   1. Validar ownership + estado pendiente
--   2. Validar cuentas/objetivo según tipo
--   3. Insertar movimiento
--   4. Llamar procesar_movimiento (lógica existente, sin duplicar)
--   5. Para ahorro con objetivo: llamar asignar_fondos_objetivo
--   6. Marcar planificación como realizada + guardar movimiento_id
--   7. Si es recurrente y corresponde: generar próxima ocurrencia
--
CREATE OR REPLACE FUNCTION public.convertir_planificacion_a_movimiento(
  p_planificacion_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_plan              RECORD;
  v_uid               UUID;
  v_tipo_mov          TEXT;
  v_mov_id            UUID;
  v_next_fecha        DATE;
  v_rec               JSONB;
  v_continuar         BOOLEAN;
  v_cuenta_valida     BOOLEAN;
BEGIN
  v_uid := auth.uid();

  -- ── 1. Validar ownership + estado ──────────────────────────
  SELECT * INTO v_plan
  FROM public.planificaciones
  WHERE id = p_planificacion_id AND user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Planificación no encontrada o no pertenece al usuario';
  END IF;

  IF v_plan.estado != 'pendiente' THEN
    RAISE EXCEPTION 'La planificación ya está en estado "%" — no se puede convertir de nuevo', v_plan.estado;
  END IF;

  -- ── 2. Validaciones por tipo ────────────────────────────────

  IF v_plan.tipo = 'gasto' THEN
    -- Cuenta de gasto debe ser del usuario
    SELECT EXISTS(
      SELECT 1 FROM public.cuentas
      WHERE id = v_plan.cuenta_id AND usuario_id = v_uid AND activa = TRUE
    ) INTO v_cuenta_valida;
    IF NOT v_cuenta_valida THEN
      RAISE EXCEPTION 'Cuenta de gasto inválida o no pertenece al usuario';
    END IF;

  ELSIF v_plan.tipo = 'ingreso' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.cuentas
      WHERE id = v_plan.cuenta_id AND usuario_id = v_uid AND activa = TRUE
    ) INTO v_cuenta_valida;
    IF NOT v_cuenta_valida THEN
      RAISE EXCEPTION 'Cuenta de ingreso inválida o no pertenece al usuario';
    END IF;

  ELSIF v_plan.tipo = 'ahorro' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.cuentas
      WHERE id = v_plan.cuenta_id AND usuario_id = v_uid AND activa = TRUE
    ) INTO v_cuenta_valida;
    IF NOT v_cuenta_valida THEN
      RAISE EXCEPTION 'Cuenta origen de ahorro inválida o no pertenece al usuario';
    END IF;
    IF v_plan.objetivo_id IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM public.objetivos_ahorro
        WHERE id = v_plan.objetivo_id AND usuario_id = v_uid
      ) INTO v_cuenta_valida;
      IF NOT v_cuenta_valida THEN
        RAISE EXCEPTION 'Objetivo de ahorro inválido o no pertenece al usuario';
      END IF;
    END IF;

  ELSIF v_plan.tipo = 'mover' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.cuentas
      WHERE id = v_plan.cuenta_id AND usuario_id = v_uid AND activa = TRUE
    ) INTO v_cuenta_valida;
    IF NOT v_cuenta_valida THEN
      RAISE EXCEPTION 'Cuenta origen de transferencia inválida o no pertenece al usuario';
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.cuentas
      WHERE id = v_plan.cuenta_destino_id AND usuario_id = v_uid AND activa = TRUE
    ) INTO v_cuenta_valida;
    IF NOT v_cuenta_valida THEN
      RAISE EXCEPTION 'Cuenta destino de transferencia inválida o no pertenece al usuario';
    END IF;
    IF v_plan.cuenta_id = v_plan.cuenta_destino_id THEN
      RAISE EXCEPTION 'La cuenta origen y destino no pueden ser la misma';
    END IF;
  END IF;

  -- ── 3. Mapear tipo planificación → tipo movimiento ──────────
  v_tipo_mov := CASE v_plan.tipo
    WHEN 'mover' THEN 'transferencia'
    ELSE v_plan.tipo   -- gasto, ingreso, ahorro: nombre idéntico
  END;

  -- ── 4. Crear movimiento real ─────────────────────────────────
  INSERT INTO public.movimientos (
    usuario_id, tipo, fecha,
    categoria_id, subcategoria_id,
    cuenta_id, cuenta_destino_id, objetivo_ahorro_id,
    monto, comercio, nota
  ) VALUES (
    v_uid, v_tipo_mov, v_plan.fecha,
    v_plan.categoria_id, v_plan.subcategoria_id,
    v_plan.cuenta_id,
    CASE WHEN v_plan.tipo = 'mover' THEN v_plan.cuenta_destino_id ELSE NULL END,
    v_plan.objetivo_id,
    v_plan.monto, v_plan.comercio, v_plan.nota
  ) RETURNING id INTO v_mov_id;

  -- ── 5. Actualizar saldos (RPC existente — no duplicar lógica) ─
  PERFORM public.procesar_movimiento(
    v_tipo_mov,
    v_plan.cuenta_id,
    CASE WHEN v_plan.tipo = 'mover' THEN v_plan.cuenta_destino_id ELSE NULL END,
    NULL,    -- objetivo: ahorro lo maneja asignar_fondos_objetivo separado (diseño intencional)
    NULL,    -- deuda: planificaciones no manejan pago_deuda
    v_plan.monto
  );

  -- ── 6. Ahorro con objetivo: actualizar progreso + historial ──
  -- Los objetivos son etiquetas de propósito (006_objetivos_asignacion.sql).
  -- procesar_movimiento no los toca intencionalmente.
  -- asignar_fondos_objetivo registra en aportes_objetivos con historial.
  IF v_plan.tipo = 'ahorro' AND v_plan.objetivo_id IS NOT NULL THEN
    PERFORM public.asignar_fondos_objetivo(
      v_plan.objetivo_id,
      v_plan.monto,
      v_plan.nota,
      v_plan.fecha
    );
  END IF;

  -- ── 7. Marcar planificación como realizada ───────────────────
  UPDATE public.planificaciones
  SET estado = 'realizado', movimiento_id = v_mov_id, updated_at = NOW()
  WHERE id = p_planificacion_id;

  -- ── 8. Generar próxima ocurrencia si es recurrente ───────────
  v_rec := v_plan.recurrencia;
  IF v_rec IS NOT NULL THEN
    v_next_fecha := CASE v_rec->>'frecuencia'
      WHEN 'semanal'       THEN v_plan.fecha + INTERVAL '7 days'
      WHEN 'quincenal'     THEN v_plan.fecha + INTERVAL '15 days'
      WHEN 'mensual'       THEN v_plan.fecha + INTERVAL '1 month'
      WHEN 'personalizada' THEN v_plan.fecha +
           ((v_rec->>'intervalo_dias')::INT * INTERVAL '1 day')
    END;

    v_continuar := TRUE;

    -- Límite por fecha de fin
    IF (v_rec->>'fin') IS NOT NULL
       AND v_next_fecha > (v_rec->>'fin')::DATE THEN
      v_continuar := FALSE;
    END IF;

    -- Límite por ocurrencias restantes
    IF v_plan.ocurrencias_restantes IS NOT NULL
       AND v_plan.ocurrencias_restantes <= 1 THEN
      v_continuar := FALSE;
    END IF;

    IF v_continuar THEN
      INSERT INTO public.planificaciones (
        user_id, tipo, monto, fecha,
        categoria_id, subcategoria_id,
        descripcion, comercio,
        cuenta_id, cuenta_destino_id, objetivo_id,
        nota, recurrencia, ocurrencias_restantes
      ) VALUES (
        v_uid, v_plan.tipo, v_plan.monto, v_next_fecha,
        v_plan.categoria_id, v_plan.subcategoria_id,
        v_plan.descripcion, v_plan.comercio,
        v_plan.cuenta_id, v_plan.cuenta_destino_id, v_plan.objetivo_id,
        v_plan.nota, v_plan.recurrencia,
        CASE WHEN v_plan.ocurrencias_restantes IS NOT NULL
             THEN v_plan.ocurrencias_restantes - 1
             ELSE NULL END
      );
    END IF;
  END IF;

  RETURN v_mov_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificación
SELECT 'Hito 03 - planificaciones migración aplicada' AS estado;
SELECT
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'planificaciones') AS tabla_existe,
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'convertir_planificacion_a_movimiento') AS rpc_existe;
