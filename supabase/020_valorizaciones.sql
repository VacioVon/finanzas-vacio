-- Sprint 4: Valorizaciones históricas de cuentas de inversión
-- Permite registrar el valor del portafolio en distintas fechas
-- y ver su evolución en el tiempo.

CREATE TABLE IF NOT EXISTS valorizaciones (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id  UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cuenta_id   UUID        REFERENCES cuentas(id)    ON DELETE CASCADE NOT NULL,
  fecha       DATE        NOT NULL,
  valor       NUMERIC(15,2) NOT NULL CHECK (valor >= 0),
  nota        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cuenta_id, fecha)   -- una valorización por cuenta por día
);

ALTER TABLE valorizaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_valorizaciones" ON valorizaciones
  FOR ALL USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Índice para consultas por cuenta ordenadas por fecha
CREATE INDEX IF NOT EXISTS idx_valorizaciones_cuenta_fecha
  ON valorizaciones (cuenta_id, fecha DESC);
