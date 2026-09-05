-- Corrección: tarjetas de crédito con deuda almacenada como positivo
-- Convención correcta: saldo_actual < 0 significa deuda (más negativo = más deuda)
-- Si saldo_actual > 0 en una tarjeta de crédito, fue ingresado con signo incorrecto

UPDATE cuentas
SET saldo_actual = -ABS(saldo_actual)
WHERE tipo = 'credito'
  AND saldo_actual > 0;
