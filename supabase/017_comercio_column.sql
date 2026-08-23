-- ============================================================
-- HITO 01 — Agregar columna comercio a movimientos
-- ============================================================

ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS comercio TEXT;

SELECT 'columna comercio agregada a movimientos' AS estado;
