/**
 * Pagos a la tarjeta "sin asignar": pagas $100.000 a la tarjeta hoy, y recién cuando llega el estado de cuenta
 * sabes a qué deudas se aplicó. Mientras tanto baja tu cuenta y la deuda total de la tarjeta; las deudas
 * individuales no se tocan hasta asignar. Se marcan con una etiqueta en la nota (sin cambios en la base de datos).
 */
import type { Movimiento } from '@/types/app.types'

export const MARCA_SIN_ASIGNAR = '[SIN ASIGNAR]'

export const notaSinAsignar = (extra?: string) => `${MARCA_SIN_ASIGNAR}${extra?.trim() ? ' ' + extra.trim() : ''}`

type PagoMin = Pick<Movimiento, 'tipo' | 'nota'>
export const esPagoSinAsignar = (m: PagoMin) => m.tipo === 'pago_tarjeta' && !!m.nota && m.nota.includes(MARCA_SIN_ASIGNAR)

export const totalSinAsignar = (movs: (PagoMin & { monto: number })[]) =>
  movs.filter(esPagoSinAsignar).reduce((s, m) => s + m.monto, 0)

export interface LineaAsignacion { deudaId: string; nombre: string; pendiente: number; monto: number }

/** Errores de una asignación; lista vacía = se puede registrar. `restante` = lo que queda sin asignar. */
export function validarAsignacion(disponible: number, lineas: LineaAsignacion[]): { errores: string[]; asignado: number; restante: number } {
  const errores: string[] = []
  const usadas = lineas.filter(l => l.monto > 0)
  const asignado = usadas.reduce((s, l) => s + l.monto, 0)
  if (usadas.length === 0) errores.push('Asigna el pago al menos a una deuda')
  for (const l of usadas) {
    if (l.monto > l.pendiente) errores.push(`${l.nombre}: no puedes asignar más de lo pendiente (${'$' + Math.round(l.pendiente).toLocaleString('es-CL')})`)
  }
  if (asignado > disponible) errores.push(`Asignaste $${(asignado - disponible).toLocaleString('es-CL')} más de lo que pagaste`)
  return { errores, asignado, restante: Math.max(0, disponible - asignado) }
}
