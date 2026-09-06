-- El primer movimiento de cada cuenta siempre tiene saldo previo = 0
-- (antes de ese movimiento la cuenta no tenía historial en la app)
UPDATE public.movimientos
SET saldo_anterior = 0
WHERE id IN (
  SELECT DISTINCT ON (cuenta_id) id
  FROM public.movimientos
  WHERE cuenta_id IS NOT NULL
  ORDER BY cuenta_id, fecha ASC, created_at ASC
);

-- Verificar
SELECT fecha, nota, monto, saldo_anterior
FROM public.movimientos
WHERE id IN (
  SELECT DISTINCT ON (cuenta_id) id
  FROM public.movimientos
  WHERE cuenta_id IS NOT NULL
  ORDER BY cuenta_id, fecha ASC, created_at ASC
)
ORDER BY fecha;
