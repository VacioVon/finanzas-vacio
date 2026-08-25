-- Sprint 3.2: Cuentas por Cobrar
-- Convierte el flag para_tercero en un módulo financiero real.
-- Flujo: gasto para tercero → cuenta_por_cobrar → pagos parciales → cierre.

-- ── Categoría sistema "Recuperación de dinero" ───────────────
INSERT INTO categorias (usuario_id, nombre, tipo, emoji, es_default, orden)
SELECT NULL, 'Recuperación de dinero', 'ingreso', '💸', TRUE, 99
WHERE NOT EXISTS (
  SELECT 1 FROM categorias
  WHERE nombre = 'Recuperación de dinero' AND es_default = TRUE
);

-- ── Tabla principal ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cuentas_por_cobrar (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  movimiento_origen_id UUID REFERENCES movimientos(id) ON DELETE SET NULL,
  persona              TEXT NOT NULL,
  descripcion          TEXT,
  monto_original       NUMERIC(12,2) NOT NULL CHECK (monto_original > 0),
  monto_pagado         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monto_pagado >= 0),
  fecha                DATE NOT NULL,
  fecha_vencimiento    DATE,
  estado               TEXT NOT NULL DEFAULT 'pendiente'
                         CHECK (estado IN ('pendiente', 'pagado', 'cancelado')),
  nota                 TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Pagos parciales ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagos_cobrar (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cuenta_por_cobrar_id UUID REFERENCES cuentas_por_cobrar(id) ON DELETE CASCADE NOT NULL,
  movimiento_id        UUID REFERENCES movimientos(id) ON DELETE SET NULL,
  monto                NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  fecha                DATE NOT NULL,
  nota                 TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE cuentas_por_cobrar ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_cobrar       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cobrar: propietario" ON cuentas_por_cobrar;
CREATE POLICY "cobrar: propietario" ON cuentas_por_cobrar
  FOR ALL USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "pagos_cobrar: via cuenta" ON pagos_cobrar;
CREATE POLICY "pagos_cobrar: via cuenta" ON pagos_cobrar
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cuentas_por_cobrar c
      WHERE c.id = pagos_cobrar.cuenta_por_cobrar_id
        AND c.usuario_id = auth.uid()
    )
  );

-- ── Índices ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cobrar_usuario_estado
  ON cuentas_por_cobrar (usuario_id, estado);
CREATE INDEX IF NOT EXISTS idx_cobrar_vencimiento
  ON cuentas_por_cobrar (usuario_id, fecha_vencimiento)
  WHERE estado = 'pendiente' AND fecha_vencimiento IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pagos_cobrar_cuenta
  ON pagos_cobrar (cuenta_por_cobrar_id);

-- ── RPC 1: Crear gasto para tercero (atómica) ─────────────────
-- Crea el movimiento + procesa saldo + crea cuenta_por_cobrar
-- en una sola transacción. No puede quedar a mitad.
CREATE OR REPLACE FUNCTION crear_gasto_tercero(
  p_usuario_id      UUID,
  p_fecha           DATE,
  p_categoria_id    UUID,
  p_subcategoria_id UUID,
  p_cuenta_id       UUID,
  p_monto           NUMERIC,
  p_comercio        TEXT,
  p_nota            TEXT,
  p_comprobante_url TEXT,
  p_comision        NUMERIC,
  p_persona         TEXT,
  p_descripcion     TEXT,
  p_fecha_vencimiento DATE
) RETURNS JSON AS $$
DECLARE
  v_movimiento_id UUID;
  v_cobrar_id     UUID;
BEGIN
  -- 1. Insertar movimiento
  INSERT INTO movimientos (
    usuario_id, tipo, fecha, categoria_id, subcategoria_id,
    cuenta_id, monto, comercio, nota, comprobante_url, comision,
    para_tercero, tercero_nombre
  ) VALUES (
    p_usuario_id, 'gasto', p_fecha, p_categoria_id, p_subcategoria_id,
    p_cuenta_id, p_monto, p_comercio, p_nota, p_comprobante_url,
    COALESCE(p_comision, 0), TRUE, p_persona
  ) RETURNING id INTO v_movimiento_id;

  -- 2. Actualizar saldo cuenta (gasto = resta)
  UPDATE cuentas
  SET saldo_actual = saldo_actual - p_monto,
      updated_at   = NOW()
  WHERE id = p_cuenta_id;

  -- 3. Crear cuenta por cobrar
  INSERT INTO cuentas_por_cobrar (
    usuario_id, movimiento_origen_id, persona, descripcion,
    monto_original, fecha, fecha_vencimiento, estado
  ) VALUES (
    p_usuario_id, v_movimiento_id, p_persona, p_descripcion,
    p_monto, p_fecha, p_fecha_vencimiento, 'pendiente'
  ) RETURNING id INTO v_cobrar_id;

  RETURN json_build_object(
    'movimiento_id', v_movimiento_id,
    'cobrar_id',     v_cobrar_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC 2: Registrar cobro recibido (atómica) ─────────────────
-- Crea el ingreso + actualiza saldo + registra el pago +
-- cierra la cuenta_por_cobrar si ya está totalmente pagada.
CREATE OR REPLACE FUNCTION registrar_cobro_recibido(
  p_cobrar_id  UUID,
  p_usuario_id UUID,
  p_monto      NUMERIC,
  p_cuenta_id  UUID,
  p_fecha      DATE,
  p_nota       TEXT
) RETURNS JSON AS $$
DECLARE
  v_movimiento_id     UUID;
  v_nuevo_pagado      NUMERIC;
  v_monto_original    NUMERIC;
  v_nuevo_estado      TEXT;
  v_cat_recuperacion  UUID;
BEGIN
  -- 0. Obtener categoría "Recuperación de dinero"
  SELECT id INTO v_cat_recuperacion
  FROM categorias
  WHERE nombre = 'Recuperación de dinero' AND es_default = TRUE
  LIMIT 1;

  -- 1. Leer y validar cuenta_por_cobrar (valida propiedad)
  SELECT monto_original, monto_pagado + p_monto
  INTO v_monto_original, v_nuevo_pagado
  FROM cuentas_por_cobrar
  WHERE id = p_cobrar_id AND usuario_id = p_usuario_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuenta por cobrar no encontrada o no pertenece al usuario';
  END IF;

  -- 2. Determinar nuevo estado
  v_nuevo_estado := CASE
    WHEN v_nuevo_pagado >= v_monto_original THEN 'pagado'
    ELSE 'pendiente'
  END;

  -- 3. Crear movimiento ingreso
  INSERT INTO movimientos (
    usuario_id, tipo, fecha, categoria_id, cuenta_id, monto, nota, para_tercero
  ) VALUES (
    p_usuario_id, 'ingreso', p_fecha, v_cat_recuperacion,
    p_cuenta_id, p_monto, p_nota, FALSE
  ) RETURNING id INTO v_movimiento_id;

  -- 4. Actualizar saldo cuenta (ingreso = suma)
  UPDATE cuentas
  SET saldo_actual = saldo_actual + p_monto,
      updated_at   = NOW()
  WHERE id = p_cuenta_id;

  -- 5. Registrar pago
  INSERT INTO pagos_cobrar (cuenta_por_cobrar_id, movimiento_id, monto, fecha, nota)
  VALUES (p_cobrar_id, v_movimiento_id, p_monto, p_fecha, p_nota);

  -- 6. Actualizar cuenta_por_cobrar
  UPDATE cuentas_por_cobrar
  SET monto_pagado = v_nuevo_pagado,
      estado       = v_nuevo_estado,
      updated_at   = NOW()
  WHERE id = p_cobrar_id;

  RETURN json_build_object(
    'movimiento_id', v_movimiento_id,
    'estado',        v_nuevo_estado,
    'monto_pagado',  v_nuevo_pagado
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
