-- Agregar pareja y mascotas al tipo de compromiso
ALTER TABLE public.suscripciones
  DROP CONSTRAINT IF EXISTS suscripciones_tipo_check;

ALTER TABLE public.suscripciones
  ADD CONSTRAINT suscripciones_tipo_check CHECK (
    tipo IN (
      'servicio',
      'gasto_fijo',
      'membresia',
      'seguro',
      'arriendo',
      'educacion',
      'salud',
      'pareja',
      'mascotas',
      'otro'
    )
  );
