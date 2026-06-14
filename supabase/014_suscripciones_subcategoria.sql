ALTER TABLE public.suscripciones
  ADD COLUMN IF NOT EXISTS subcategoria_id UUID REFERENCES public.subcategorias(id) ON DELETE SET NULL;
