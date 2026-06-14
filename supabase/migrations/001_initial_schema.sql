-- ============================================================
-- FINANZAS VACÍO — Esquema v1 (IDEMPOTENTE — se puede re-ejecutar)
-- Ejecutar DESPUÉS de 000_reset.sql si hubo errores previos
-- ============================================================

-- ─── TABLAS ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  avatar_url    TEXT,
  fecha_sueldo  INT CHECK (fecha_sueldo BETWEEN 1 AND 31),
  moneda        TEXT NOT NULL DEFAULT 'CLP',
  tema          TEXT NOT NULL DEFAULT 'auto' CHECK (tema IN ('light', 'dark', 'auto')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cuentas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('bancaria','digital','debito','credito','efectivo','inversion')),
  institucion   TEXT,
  saldo_actual  NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo_inicial NUMERIC(12,2) NOT NULL DEFAULT 0,
  limite        NUMERIC(12,2),
  color         TEXT NOT NULL DEFAULT '#2563EB',
  activa        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categorias (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('gasto','ingreso','ahorro','inversion')),
  emoji         TEXT,
  color         TEXT,
  activa        BOOLEAN NOT NULL DEFAULT TRUE,
  es_default    BOOLEAN NOT NULL DEFAULT FALSE,
  orden         INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subcategorias (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id  UUID NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  activa        BOOLEAN NOT NULL DEFAULT TRUE,
  es_default    BOOLEAN NOT NULL DEFAULT FALSE,
  orden         INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.objetivos_ahorro (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  emoji           TEXT,
  color           TEXT NOT NULL DEFAULT '#2563EB',
  imagen_url      TEXT,
  monto_objetivo  NUMERIC(12,2) NOT NULL,
  monto_actual    NUMERIC(12,2) NOT NULL DEFAULT 0,
  fecha_objetivo  DATE,
  descripcion     TEXT,
  estado          TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','completado','pausado')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.presupuestos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  categoria_id        UUID NOT NULL REFERENCES public.categorias(id),
  mes                 INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio                INT NOT NULL,
  monto_presupuestado NUMERIC(12,2) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, categoria_id, mes, anio)
);

CREATE TABLE IF NOT EXISTS public.deudas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  categoria_id    UUID REFERENCES public.categorias(id),
  cuenta_id       UUID REFERENCES public.cuentas(id),
  monto_total     NUMERIC(12,2) NOT NULL,
  monto_pendiente NUMERIC(12,2) NOT NULL,
  cuotas_total    INT NOT NULL DEFAULT 1,
  cuotas_pagadas  INT NOT NULL DEFAULT 0,
  interes         NUMERIC(5,2) NOT NULL DEFAULT 0,
  fecha_compra    DATE NOT NULL,
  fecha_prox_pago DATE,
  estado          TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','pagada','en_mora')),
  nota            TEXT,
  comprobante_url TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.movimientos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo                TEXT NOT NULL CHECK (tipo IN ('ingreso','gasto','ahorro','pago_deuda','transferencia')),
  fecha               DATE NOT NULL,
  categoria_id        UUID REFERENCES public.categorias(id),
  subcategoria_id     UUID REFERENCES public.subcategorias(id),
  cuenta_id           UUID REFERENCES public.cuentas(id),
  cuenta_destino_id   UUID REFERENCES public.cuentas(id),
  objetivo_ahorro_id  UUID REFERENCES public.objetivos_ahorro(id),
  deuda_id            UUID REFERENCES public.deudas(id),
  monto               NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  nota                TEXT,
  comprobante_url     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.suscripciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  emoji         TEXT,
  monto         NUMERIC(12,2) NOT NULL,
  frecuencia    TEXT NOT NULL DEFAULT 'mensual' CHECK (frecuencia IN ('semanal','mensual','anual')),
  dia_cobro     INT CHECK (dia_cobro BETWEEN 1 AND 31),
  cuenta_id     UUID REFERENCES public.cuentas(id),
  categoria_id  UUID REFERENCES public.categorias(id),
  activa        BOOLEAN NOT NULL DEFAULT TRUE,
  proxima_fecha DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.eventos_calendario (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  titulo      TEXT NOT NULL,
  fecha       DATE NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('ingreso','gasto_recurrente','cuota','servicio','ahorro','suscripcion')),
  monto       NUMERIC(12,2),
  origen_tipo TEXT,
  origen_id   UUID,
  estado      TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','pagado','cancelado')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.salud_financiera (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  puntaje           INT NOT NULL CHECK (puntaje BETWEEN 0 AND 100),
  comp_presupuestos INT,
  comp_ahorros      INT,
  comp_deudas       INT,
  comp_flujo        INT,
  fecha_calculo     DATE NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ÍNDICES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_fecha ON public.movimientos (usuario_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo          ON public.movimientos (tipo);
CREATE INDEX IF NOT EXISTS idx_cuentas_usuario           ON public.cuentas (usuario_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_usuario_mes  ON public.presupuestos (usuario_id, mes, anio);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
-- (ALTER TABLE ... ENABLE RLS es idempotente — no falla si ya estaba habilitado)
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategorias      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objetivos_ahorro   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deudas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suscripciones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_calendario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salud_financiera   ENABLE ROW LEVEL SECURITY;

-- ─── POLÍTICAS RLS ───────────────────────────────────────────
-- Patrón: DROP IF EXISTS → CREATE  (hace el script idempotente)

-- profiles
DROP POLICY IF EXISTS "profiles: usuario ve y edita los suyos" ON public.profiles;
CREATE POLICY "profiles: usuario ve y edita los suyos"
  ON public.profiles FOR ALL USING (auth.uid() = id);

-- cuentas
DROP POLICY IF EXISTS "cuentas: propietario" ON public.cuentas;
CREATE POLICY "cuentas: propietario"
  ON public.cuentas FOR ALL USING (auth.uid() = usuario_id);

-- categorias: SELECT permite ver defaults del sistema + las propias
DROP POLICY IF EXISTS "categorias: propias y defaults" ON public.categorias;
CREATE POLICY "categorias: propias y defaults"
  ON public.categorias FOR SELECT
  USING (usuario_id = auth.uid() OR es_default = TRUE);

DROP POLICY IF EXISTS "categorias: propietario modifica" ON public.categorias;
CREATE POLICY "categorias: propietario modifica"
  ON public.categorias FOR ALL USING (auth.uid() = usuario_id);

-- subcategorias: visible si su categoría padre es del usuario o es default
DROP POLICY IF EXISTS "subcategorias: ver via categoria" ON public.subcategorias;
CREATE POLICY "subcategorias: ver via categoria"
  ON public.subcategorias FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.categorias c
      WHERE c.id = subcategorias.categoria_id
        AND (c.usuario_id = auth.uid() OR c.es_default = TRUE)
    )
  );

-- movimientos
DROP POLICY IF EXISTS "movimientos: propietario" ON public.movimientos;
CREATE POLICY "movimientos: propietario"
  ON public.movimientos FOR ALL USING (auth.uid() = usuario_id);

-- objetivos_ahorro
DROP POLICY IF EXISTS "objetivos_ahorro: propietario" ON public.objetivos_ahorro;
CREATE POLICY "objetivos_ahorro: propietario"
  ON public.objetivos_ahorro FOR ALL USING (auth.uid() = usuario_id);

-- presupuestos
DROP POLICY IF EXISTS "presupuestos: propietario" ON public.presupuestos;
CREATE POLICY "presupuestos: propietario"
  ON public.presupuestos FOR ALL USING (auth.uid() = usuario_id);

-- deudas
DROP POLICY IF EXISTS "deudas: propietario" ON public.deudas;
CREATE POLICY "deudas: propietario"
  ON public.deudas FOR ALL USING (auth.uid() = usuario_id);

-- suscripciones
DROP POLICY IF EXISTS "suscripciones: propietario" ON public.suscripciones;
CREATE POLICY "suscripciones: propietario"
  ON public.suscripciones FOR ALL USING (auth.uid() = usuario_id);

-- eventos_calendario
DROP POLICY IF EXISTS "eventos_calendario: propietario" ON public.eventos_calendario;
CREATE POLICY "eventos_calendario: propietario"
  ON public.eventos_calendario FOR ALL USING (auth.uid() = usuario_id);

-- salud_financiera
DROP POLICY IF EXISTS "salud_financiera: propietario" ON public.salud_financiera;
CREATE POLICY "salud_financiera: propietario"
  ON public.salud_financiera FOR ALL USING (auth.uid() = usuario_id);

-- ─── FUNCIONES ───────────────────────────────────────────────

-- Función: crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, moneda, tema)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    'CLP',
    'auto'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: ajustar saldo de cuenta (RPC)
CREATE OR REPLACE FUNCTION public.ajustar_saldo_cuenta(
  p_cuenta_id UUID,
  p_delta     NUMERIC
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.cuentas
  SET saldo_actual = saldo_actual + p_delta,
      updated_at   = NOW()
  WHERE id = p_cuenta_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: procesar movimiento y actualizar saldos en cascada (RPC)
CREATE OR REPLACE FUNCTION public.procesar_movimiento(
  p_tipo               TEXT,
  p_cuenta_id          UUID,
  p_cuenta_destino_id  UUID,
  p_objetivo_id        UUID,
  p_deuda_id           UUID,
  p_monto              NUMERIC
)
RETURNS VOID AS $$
BEGIN
  IF p_tipo = 'ingreso' AND p_cuenta_id IS NOT NULL THEN
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;

  ELSIF p_tipo = 'gasto' AND p_cuenta_id IS NOT NULL THEN
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;

  ELSIF p_tipo = 'ahorro' AND p_cuenta_id IS NOT NULL THEN
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;
    IF p_objetivo_id IS NOT NULL THEN
      UPDATE public.objetivos_ahorro
      SET monto_actual = monto_actual + p_monto, updated_at = NOW()
      WHERE id = p_objetivo_id;
    END IF;

  ELSIF p_tipo = 'pago_deuda' AND p_cuenta_id IS NOT NULL THEN
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;
    IF p_deuda_id IS NOT NULL THEN
      UPDATE public.deudas
      SET monto_pendiente = GREATEST(0, monto_pendiente - p_monto),
          cuotas_pagadas  = cuotas_pagadas + 1,
          updated_at      = NOW()
      WHERE id = p_deuda_id;
    END IF;

  ELSIF p_tipo = 'transferencia'
        AND p_cuenta_id IS NOT NULL
        AND p_cuenta_destino_id IS NOT NULL THEN
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual - p_monto, updated_at = NOW()
    WHERE id = p_cuenta_id;
    UPDATE public.cuentas
    SET saldo_actual = saldo_actual + p_monto, updated_at = NOW()
    WHERE id = p_cuenta_destino_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: updated_at automático en UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── TRIGGERS ────────────────────────────────────────────────
-- Patrón: DROP IF EXISTS → CREATE  (idempotente)

-- Trigger: crear perfil al registrarse
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers: updated_at
DROP TRIGGER IF EXISTS set_profiles_updated_at      ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_cuentas_updated_at        ON public.cuentas;
CREATE TRIGGER set_cuentas_updated_at
  BEFORE UPDATE ON public.cuentas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_movimientos_updated_at    ON public.movimientos;
CREATE TRIGGER set_movimientos_updated_at
  BEFORE UPDATE ON public.movimientos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_objetivos_updated_at      ON public.objetivos_ahorro;
CREATE TRIGGER set_objetivos_updated_at
  BEFORE UPDATE ON public.objetivos_ahorro
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_presupuestos_updated_at   ON public.presupuestos;
CREATE TRIGGER set_presupuestos_updated_at
  BEFORE UPDATE ON public.presupuestos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_deudas_updated_at         ON public.deudas;
CREATE TRIGGER set_deudas_updated_at
  BEFORE UPDATE ON public.deudas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_suscripciones_updated_at  ON public.suscripciones;
CREATE TRIGGER set_suscripciones_updated_at
  BEFORE UPDATE ON public.suscripciones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── VERIFICACIÓN FINAL ──────────────────────────────────────
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
