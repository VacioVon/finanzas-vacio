/**
 * Pagar un compromiso con dos medios de pago (p. ej. $8.000 en efectivo + $10.000 con débito).
 * Se registran dos gastos del mismo compromiso, uno por cada cuenta; el compromiso se marca pagado una sola vez.
 */
import type { Cuenta } from '@/types/app.types'

export interface ParteDePago { cuentaId: string; monto: number }

type CuentaPago = Pick<Cuenta, 'id' | 'tipo' | 'activa'> | null | undefined

/** Monto que le toca a la segunda cuenta: total − lo de la primera (nunca negativo). */
export const montoSegundaParte = (total: number, montoPrimera: number) =>
  Math.max(0, Math.round(total) - Math.round(montoPrimera))

/** Errores del pago dividido; null = se puede registrar. */
export function validarPagoDividido(
  total: number, montoPrimera: number, cuentaA: CuentaPago, cuentaB: CuentaPago
): string | null {
  if (!(total > 0)) return 'El total debe ser mayor a 0'
  if (!cuentaA) return 'Elige la primera cuenta'
  if (!cuentaB) return 'Elige la segunda cuenta'
  if (cuentaA.id === cuentaB.id) return 'Elige dos cuentas distintas (si es la misma, no necesitas dividir)'
  for (const c of [cuentaA, cuentaB]) {
    if (c.tipo === 'credito') return 'Para pagar con la tarjeta de crédito usa "Con deuda de tarjeta"'
    if (c.tipo === 'inversion') return 'Elige cuentas con dinero disponible'
    if (!c.activa) return 'Una de las cuentas está inactiva'
  }
  const a = Math.round(montoPrimera)
  if (!(a > 0)) return 'El monto de la primera cuenta debe ser mayor a 0'
  if (a >= Math.round(total)) return 'El monto de la primera cuenta debe ser menor al total (el resto va a la segunda)'
  return null
}

/** Las dos partes listas para registrar. */
export function partesDePago(total: number, cuentaIdA: string, montoPrimera: number, cuentaIdB: string): [ParteDePago, ParteDePago] {
  return [
    { cuentaId: cuentaIdA, monto: Math.round(montoPrimera) },
    { cuentaId: cuentaIdB, monto: montoSegundaParte(total, montoPrimera) },
  ]
}
