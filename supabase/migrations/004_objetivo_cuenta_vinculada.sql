-- ============================================================
-- OBJETIVOS: Columna cuenta_vinculada_id
-- Permite vincular un objetivo de ahorro a una cuenta de
-- inversión. El progreso se calcula desde el saldo de la cuenta.
-- ============================================================

ALTER TABLE objetivos_ahorro
  ADD COLUMN IF NOT EXISTS cuenta_vinculada_id UUID
    REFERENCES cuentas(id) ON DELETE SET NULL;
