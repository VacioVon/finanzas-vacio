-- Agregar campo dirección a deudas: 'debo' (yo debo) | 'me_deben' (me deben a mí)
ALTER TABLE public.deudas
  ADD COLUMN IF NOT EXISTS direccion TEXT NOT NULL DEFAULT 'debo'
  CHECK (direccion IN ('debo', 'me_deben'));

-- Marcar la deuda de Víctor como 'me_deben'
UPDATE public.deudas
SET direccion = 'me_deben'
WHERE nombre = 'Ayuda Víctor' AND prestamista_nombre = 'Víctor';
