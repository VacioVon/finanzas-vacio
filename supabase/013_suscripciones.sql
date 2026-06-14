-- ============================================================
-- FINANZAS VACÍO — Sprint 3: Suscripciones recurrentes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.suscripciones (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre       TEXT          NOT NULL,
  emoji        TEXT,
  monto        NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  frecuencia   TEXT          NOT NULL CHECK (frecuencia IN ('semanal', 'mensual', 'anual')),
  dia_cobro    INTEGER       CHECK (dia_cobro BETWEEN 1 AND 31),
  cuenta_id    UUID          REFERENCES public.cuentas(id) ON DELETE SET NULL,
  categoria_id UUID          REFERENCES public.categorias(id) ON DELETE SET NULL,
  activa       BOOLEAN       NOT NULL DEFAULT TRUE,
  proxima_fecha DATE,
  nota         TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.suscripciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios ven sus suscripciones"
  ON public.suscripciones FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "usuarios crean sus suscripciones"
  ON public.suscripciones FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "usuarios modifican sus suscripciones"
  ON public.suscripciones FOR UPDATE
  USING (auth.uid() = usuario_id);

CREATE POLICY "usuarios eliminan sus suscripciones"
  ON public.suscripciones FOR DELETE
  USING (auth.uid() = usuario_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_suscripciones_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_suscripciones_updated_at
  BEFORE UPDATE ON public.suscripciones
  FOR EACH ROW EXECUTE FUNCTION update_suscripciones_updated_at();

SELECT 'Tabla suscripciones creada' AS estado;
