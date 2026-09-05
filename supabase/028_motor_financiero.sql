-- ============================================================
-- MOTOR FINANCIERO — Migration 028 (IDEMPOTENTE)
-- Origen del dinero · Ciclos de ingreso · Transferencias externas
-- Dinero asignado (sobres de presupuesto)
-- ============================================================

-- ─── 1. ORIGEN DEL DINERO en movimientos ─────────────────────
-- Clasifica de dónde viene el dinero de cada gasto/pago
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS origen_dinero TEXT
    CHECK (origen_dinero IN ('sueldo','ahorro','transferencia_externa','objetivo','prestamo','otro'));

-- Vincula un gasto/pago a un ingreso esperado específico (ciclo de ingreso)
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS ingreso_origen_id UUID
    REFERENCES public.ingresos_esperados(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_movimientos_ingreso_origen
  ON public.movimientos (ingreso_origen_id)
  WHERE ingreso_origen_id IS NOT NULL;

-- ─── 2. TRANSFERENCIAS EXTERNAS ──────────────────────────────
-- Extiende un movimiento de tipo 'ingreso' con metadata de la persona origen
CREATE TABLE IF NOT EXISTS public.transferencias_externas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  movimiento_id   UUID        NOT NULL REFERENCES public.movimientos(id) ON DELETE CASCADE,
  persona_nombre  TEXT        NOT NULL,
  persona_tipo    TEXT        NOT NULL DEFAULT 'persona'
                    CHECK (persona_tipo IN ('persona','empresa','banco','otro')),
  proposito       TEXT,                    -- razón del ingreso (préstamo, devolución, regalo, etc.)
  es_devolucion   BOOLEAN     NOT NULL DEFAULT FALSE,
  deuda_origen_id UUID        REFERENCES public.deudas(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.transferencias_externas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transferencias_externas: propietario" ON public.transferencias_externas;
CREATE POLICY "transferencias_externas: propietario"
  ON public.transferencias_externas FOR ALL
  USING (auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS idx_transferencias_externas_usuario
  ON public.transferencias_externas (usuario_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transferencias_externas_movimiento
  ON public.transferencias_externas (movimiento_id);

-- ─── 3. DINERO ASIGNADO (Sobres de Presupuesto) ──────────────
-- Reserva una porción del saldo de una cuenta para un propósito específico.
-- Cuando se paga algo relacionado, se usa monto_usado para rastrear el avance.
CREATE TABLE IF NOT EXISTS public.dinero_asignado (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cuenta_id       UUID        NOT NULL REFERENCES public.cuentas(id) ON DELETE CASCADE,
  nombre          TEXT        NOT NULL,
  emoji           TEXT        NOT NULL DEFAULT '📦',
  color           TEXT        NOT NULL DEFAULT '#2979FF',
  monto_reservado NUMERIC(12,2) NOT NULL CHECK (monto_reservado > 0),
  monto_usado     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monto_usado >= 0),
  proposito_tipo  TEXT        NOT NULL
                    CHECK (proposito_tipo IN ('deuda','compra','objetivo','ahorro','emergencia','otro')),
  referencia_id   UUID,                   -- deuda_id, objetivo_id, etc.
  descripcion     TEXT,
  fecha_limite    DATE,                   -- cuándo se espera usar el dinero
  activo          BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.dinero_asignado ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dinero_asignado: propietario" ON public.dinero_asignado;
CREATE POLICY "dinero_asignado: propietario"
  ON public.dinero_asignado FOR ALL
  USING (auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS idx_dinero_asignado_usuario
  ON public.dinero_asignado (usuario_id, activo);

CREATE INDEX IF NOT EXISTS idx_dinero_asignado_cuenta
  ON public.dinero_asignado (cuenta_id)
  WHERE activo = TRUE;

-- ─── 4. MOVIMIENTOS → DINERO ASIGNADO (uso de sobres) ───────
-- Registra qué sobre se usó para pagar un movimiento
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS dinero_asignado_id UUID
    REFERENCES public.dinero_asignado(id) ON DELETE SET NULL;

-- ─── 5. FUNCIÓN: usar dinero asignado ─────────────────────────
-- Incrementa monto_usado cuando se registra un gasto/pago de un sobre
CREATE OR REPLACE FUNCTION public.usar_dinero_asignado(
  p_dinero_asignado_id UUID,
  p_monto              NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_sobre  dinero_asignado%ROWTYPE;
  v_nuevo  NUMERIC;
BEGIN
  SELECT * INTO v_sobre
  FROM dinero_asignado
  WHERE id = p_dinero_asignado_id
    AND usuario_id = auth.uid()
    AND activo = TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sobre_no_encontrado');
  END IF;

  v_nuevo := v_sobre.monto_usado + p_monto;

  UPDATE dinero_asignado
  SET monto_usado = v_nuevo,
      activo      = CASE WHEN v_nuevo >= monto_reservado THEN FALSE ELSE TRUE END,
      updated_at  = NOW()
  WHERE id = p_dinero_asignado_id;

  RETURN jsonb_build_object(
    'ok',              true,
    'monto_usado',     v_nuevo,
    'monto_reservado', v_sobre.monto_reservado,
    'completado',      v_nuevo >= v_sobre.monto_reservado
  );
END;
$$;

-- ─── 6. FUNCIÓN: resumen de sobres por cuenta ─────────────────
CREATE OR REPLACE FUNCTION public.resumen_dinero_asignado(p_cuenta_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_total_reservado NUMERIC;
  v_total_usado     NUMERIC;
  v_total_libre     NUMERIC;
  v_saldo_cuenta    NUMERIC;
BEGIN
  SELECT saldo_actual INTO v_saldo_cuenta
  FROM cuentas
  WHERE id = p_cuenta_id AND usuario_id = auth.uid();

  SELECT
    COALESCE(SUM(monto_reservado), 0),
    COALESCE(SUM(monto_usado), 0)
  INTO v_total_reservado, v_total_usado
  FROM dinero_asignado
  WHERE cuenta_id  = p_cuenta_id
    AND usuario_id = auth.uid()
    AND activo     = TRUE;

  v_total_libre := v_saldo_cuenta - (v_total_reservado - v_total_usado);

  RETURN jsonb_build_object(
    'saldo_cuenta',     v_saldo_cuenta,
    'total_reservado',  v_total_reservado - v_total_usado,  -- pendiente de usar
    'total_libre',      v_total_libre,
    'sobres_activos',   (SELECT COUNT(*) FROM dinero_asignado
                         WHERE cuenta_id = p_cuenta_id AND usuario_id = auth.uid() AND activo = TRUE)
  );
END;
$$;

-- ─── 7. UPDATED_AT trigger para dinero_asignado ──────────────
DROP TRIGGER IF EXISTS set_dinero_asignado_updated_at ON public.dinero_asignado;
CREATE TRIGGER set_dinero_asignado_updated_at
  BEFORE UPDATE ON public.dinero_asignado
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
