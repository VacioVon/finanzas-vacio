-- ============================================================
-- FINANZAS VACÍO — Sprint 3.1: Cuotas de tarjeta de crédito
--
-- PROPÓSITO: Tracking informacional de compras en cuotas
-- vinculadas a una cuenta tipo='credito'.
--
-- IMPORTANTE: Esta tabla NO afecta saldos de cuentas ni
-- patrimonio neto. El balance de la tarjeta ya refleja estas
-- compras. Las cuotas son una descomposición informacional
-- de lo que está dentro del saldo de la tarjeta.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cuotas_credito (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID         NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  cuenta_id       UUID         NOT NULL REFERENCES public.cuentas(id)    ON DELETE CASCADE,
  nombre          TEXT         NOT NULL,                    -- "Skechers", "Smart TV Falabella"
  emoji           TEXT,                                     -- ícono visual opcional
  monto_total     NUMERIC(12,2) NOT NULL,                  -- total financiado
  monto_cuota     NUMERIC(12,2) NOT NULL,                  -- valor de cada cuota
  cuotas_total    INT          NOT NULL CHECK (cuotas_total > 0),
  cuotas_pagadas  INT          NOT NULL DEFAULT 0
                               CHECK (cuotas_pagadas >= 0),
  interes         NUMERIC(5,2) NOT NULL DEFAULT 0,         -- % anual; 0 = sin interés
  fecha_inicio    DATE         NOT NULL,                    -- fecha de la compra
  estado          TEXT         NOT NULL DEFAULT 'activa'
                               CHECK (estado IN ('activa', 'completada', 'cancelada')),
  nota            TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT cuotas_pagadas_validas CHECK (cuotas_pagadas <= cuotas_total)
);

-- RLS
ALTER TABLE public.cuotas_credito ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cuotas_credito: propietario"
  ON public.cuotas_credito FOR ALL
  USING  (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Índices
CREATE INDEX IF NOT EXISTS idx_cuotas_credito_usuario
  ON public.cuotas_credito (usuario_id);

CREATE INDEX IF NOT EXISTS idx_cuotas_credito_cuenta
  ON public.cuotas_credito (cuenta_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_cuotas_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_cuotas_credito_updated_at ON public.cuotas_credito;
CREATE TRIGGER set_cuotas_credito_updated_at
  BEFORE UPDATE ON public.cuotas_credito
  FOR EACH ROW EXECUTE FUNCTION public.set_cuotas_updated_at();

-- RPC: registrar el pago de una cuota (incrementa cuotas_pagadas, auto-completa)
CREATE OR REPLACE FUNCTION public.pagar_cuota(
  p_cuota_id UUID
)
RETURNS public.cuotas_credito AS $$
DECLARE
  v_cuota public.cuotas_credito;
BEGIN
  UPDATE public.cuotas_credito
  SET
    cuotas_pagadas = cuotas_pagadas + 1,
    estado = CASE
               WHEN cuotas_pagadas + 1 >= cuotas_total THEN 'completada'
               ELSE 'activa'
             END,
    updated_at = NOW()
  WHERE id         = p_cuota_id
    AND usuario_id = auth.uid()
    AND estado     = 'activa'
    AND cuotas_pagadas < cuotas_total
  RETURNING * INTO v_cuota;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuota no encontrada, ya completada, o sin permisos: %', p_cuota_id;
  END IF;

  RETURN v_cuota;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: deshacer último pago de cuota
CREATE OR REPLACE FUNCTION public.deshacer_pago_cuota(
  p_cuota_id UUID
)
RETURNS public.cuotas_credito AS $$
DECLARE
  v_cuota public.cuotas_credito;
BEGIN
  UPDATE public.cuotas_credito
  SET
    cuotas_pagadas = GREATEST(0, cuotas_pagadas - 1),
    estado = 'activa',
    updated_at = NOW()
  WHERE id         = p_cuota_id
    AND usuario_id = auth.uid()
    AND cuotas_pagadas > 0
  RETURNING * INTO v_cuota;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuota no encontrada o sin pagos que deshacer: %', p_cuota_id;
  END IF;

  RETURN v_cuota;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificación
SELECT 'Sprint 3.1 — cuotas_credito migración aplicada' AS estado;
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'cuotas_credito'
ORDER BY ordinal_position;
