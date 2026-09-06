ALTER TABLE public.suscripciones
  ADD COLUMN IF NOT EXISTS ultimo_pago_fecha DATE DEFAULT NULL;
