-- ═══════════════════════════════════════════════════════════════════
-- 029 — Gastos Compartidos
-- Permite registrar gastos divididos entre varias personas.
-- El movimiento registra solo la parte del usuario (lo que sale
-- de su saldo). La tabla gastos_compartidos guarda el total y
-- los participantes para tener el cuadro completo.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gastos_compartidos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movimiento_id  UUID NOT NULL REFERENCES movimientos(id) ON DELETE CASCADE,
  usuario_id     UUID NOT NULL,
  monto_total    NUMERIC(12,2) NOT NULL,       -- total del gasto entre todos
  monto_usuario  NUMERIC(12,2) NOT NULL,       -- parte que paga el usuario
  participantes  JSONB NOT NULL DEFAULT '[]',  -- [{nombre, monto}] otros participantes
  descripcion    TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_gastos_compartidos_movimiento
  ON gastos_compartidos (movimiento_id);

CREATE INDEX IF NOT EXISTS idx_gastos_compartidos_usuario
  ON gastos_compartidos (usuario_id);

-- RLS
ALTER TABLE gastos_compartidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gastos_compartidos_select" ON gastos_compartidos;
CREATE POLICY "gastos_compartidos_select" ON gastos_compartidos
  FOR SELECT USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "gastos_compartidos_insert" ON gastos_compartidos;
CREATE POLICY "gastos_compartidos_insert" ON gastos_compartidos
  FOR INSERT WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS "gastos_compartidos_update" ON gastos_compartidos;
CREATE POLICY "gastos_compartidos_update" ON gastos_compartidos
  FOR UPDATE USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "gastos_compartidos_delete" ON gastos_compartidos;
CREATE POLICY "gastos_compartidos_delete" ON gastos_compartidos
  FOR DELETE USING (usuario_id = auth.uid());
