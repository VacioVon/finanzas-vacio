/**
 * Saldo de "dinero de terceros": plata de otras personas que está físicamente en tus cuentas.
 *
 * Se calcula recorriendo los movimientos con fondos_tercero en orden cronológico:
 *   ingreso  → el saldo sube
 *   egreso   → el saldo baja (gasto o pago hecho con esa plata)
 * y el saldo NUNCA baja de 0: lo que se gastó de más antes de recibir un depósito se asume propio
 * y no consume los depósitos futuros.
 */

export interface MovTerceros {
  tipo:           string
  monto:          number
  fecha:          string
  created_at?:    string | null
  fondos_tercero: boolean
  cuenta_id?:     string | null
}

export interface SaldoTercerosCalculado {
  /** Total recibido de terceros (histórico). */
  fondos:          number
  /** Total gastado con fondos de terceros (histórico). */
  gastadoTerceros: number
  /** Lo que aún tienes de otros: nunca negativo. */
  disponible:      number
  /** Gasto propio que cubrió dinero de terceros que no existía (informativo). */
  absorbidoPropio: number
  /** Cuenta real donde está la mayor parte de los fondos de terceros. */
  primaryCuentaId: string | null
}

export function calcularSaldoTerceros(movs: MovTerceros[]): SaldoTercerosCalculado {
  const ordenados = movs
    .filter(m => m.fondos_tercero)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.created_at ?? '').localeCompare(b.created_at ?? ''))

  let saldo = 0, fondos = 0, gastado = 0, absorbido = 0
  const porCuenta: Record<string, number> = {}

  for (const m of ordenados) {
    if (m.tipo === 'ingreso') {
      saldo += m.monto
      fondos += m.monto
      if (m.cuenta_id) porCuenta[m.cuenta_id] = (porCuenta[m.cuenta_id] ?? 0) + m.monto
    } else {
      gastado += m.monto
      const baja = Math.min(saldo, m.monto)
      absorbido += m.monto - baja      // la parte que no tenía respaldo en fondos de terceros
      saldo -= baja
    }
  }

  const primaryCuentaId = Object.entries(porCuenta).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return { fondos, gastadoTerceros: gastado, disponible: saldo, absorbidoPropio: absorbido, primaryCuentaId }
}

/** Sobrante que quedaría de dinero de terceros después de usar `monto` de él (0 si no alcanza). */
export function sobranteTrasPago(disponible: number, monto: number): number {
  return Math.max(0, Math.round(disponible - monto))
}
