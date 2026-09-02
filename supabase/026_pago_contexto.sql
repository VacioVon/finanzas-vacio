-- ============================================================
-- FINANZAS VACÍO — Contexto de pago y enriquecimiento de deudas
-- Migration 026
-- ============================================================

-- ─── 1. prestamista_nombre en deudas ─────────────────────────
-- Para tipo_deuda='deuda_persona': a quién se le debe o de quién se recibió
ALTER TABLE public.deudas
  ADD COLUMN IF NOT EXISTS prestamista_nombre TEXT;

-- ─── 2. contexto_pago en movimientos ─────────────────────────
-- Metadata de POR QUÉ se hizo este pago (no afecta lógica de saldos)
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS contexto_pago TEXT
    CHECK (contexto_pago IN ('deuda_propia','devolucion_prestamo','deuda_compartida','otro'));

-- ─── 3. capital e interes_pago en movimientos ────────────────
-- Desglose interno de un pago de deuda; opcional, informacional
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS capital       NUMERIC(12,2);
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS interes_pago  NUMERIC(12,2);

-- ─── 4. RPC: historial de pagos de una deuda ─────────────────
CREATE OR REPLACE FUNCTION public.obtener_historial_pagos_deuda(
  p_deuda_id UUID,
  p_user_id  UUID
)
RETURNS TABLE (
  id            UUID,
  fecha         DATE,
  monto         NUMERIC,
  capital       NUMERIC,
  interes_pago  NUMERIC,
  cuenta_id     UUID,
  cuenta_nombre TEXT,
  nota          TEXT,
  contexto_pago TEXT,
  created_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.fecha,
    m.monto,
    m.capital,
    m.interes_pago,
    m.cuenta_id,
    c.nombre,
    m.nota,
    m.contexto_pago,
    m.created_at
  FROM  movimientos m
  LEFT JOIN cuentas c ON c.id = m.cuenta_id
  WHERE m.deuda_id   = p_deuda_id
    AND m.usuario_id = p_user_id
    AND m.tipo IN ('pago_deuda', 'pago_tarjeta', 'transferencia', 'gasto')
  ORDER BY m.fecha DESC, m.created_at DESC;
END;
$$;

-- ─── 5. Vista resumen de deuda con total pagado ───────────────
-- Útil para el front: evita calcular en JS
CREATE OR REPLACE FUNCTION public.obtener_deudas_con_pagos(
  p_user_id UUID
)
RETURNS TABLE (
  deuda_id           UUID,
  nombre             TEXT,
  tipo_deuda         TEXT,
  prestamista_nombre TEXT,
  monto_total        NUMERIC,
  monto_pendiente    NUMERIC,
  total_pagos        NUMERIC,
  num_pagos          BIGINT,
  ultimo_pago        DATE,
  estado             TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.nombre,
    d.tipo_deuda,
    d.prestamista_nombre,
    d.monto_total,
    d.monto_pendiente,
    COALESCE(SUM(m.monto), 0),
    COUNT(m.id),
    MAX(m.fecha),
    d.estado
  FROM  deudas d
  LEFT JOIN movimientos m
    ON  m.deuda_id   = d.id
    AND m.usuario_id = p_user_id
    AND m.tipo IN ('pago_deuda', 'pago_tarjeta', 'transferencia', 'gasto')
  WHERE d.usuario_id = p_user_id
  GROUP BY d.id, d.nombre, d.tipo_deuda, d.prestamista_nombre,
           d.monto_total, d.monto_pendiente, d.estado
  ORDER BY d.estado, d.fecha_compra DESC;
END;
$$;
