import type { Cuenta, Deuda } from '@/types/app.types'
import { agruparDeudasPagables, type DeudaElegible } from '@/utils/pagoVariasDeudas'

/**
 * Vista "juntas" de las deudas ligadas a tarjetas de crédito, y reparto de un pago único entre ellas.
 * Lógica pura: solo calcula; no registra nada.
 */

export interface DeudaTarjetaResumen extends DeudaElegible {
  pagadoPeriodo: number   // pagos a esta deuda dentro del período actual
}
export interface TarjetaResumen {
  tarjetaId:       string
  nombre:          string
  deudas:          DeudaTarjetaResumen[]
  totalPendiente:  number
  cuotasDelMes:    number   // suma de las cuotas sugeridas (lo que cubre "todas las cuotas")
  pagadoPeriodo:   number
}
export interface ResumenTarjetas {
  tarjetas:        TarjetaResumen[]
  totalPendiente:  number
  cuotasDelMes:    number
  pagadoPeriodo:   number
  cantidad:        number
}

/** Agrupa por tarjeta las deudas pendientes ligadas a una tarjeta de crédito, con lo pagado en el período. */
export function resumenTarjetas(
  deudas: Deuda[], cuentas: Cuenta[], pagosPeriodo: { deuda_id: string | null; monto: number }[]
): ResumenTarjetas {
  const pagado = new Map<string, number>()
  for (const p of pagosPeriodo) if (p.deuda_id) pagado.set(p.deuda_id, (pagado.get(p.deuda_id) ?? 0) + p.monto)

  const tarjetas: TarjetaResumen[] = agruparDeudasPagables(deudas, cuentas)
    .filter(g => g.tarjetaId)
    .map(g => {
      const ds = g.items.map(e => ({ ...e, pagadoPeriodo: pagado.get(e.deuda.id) ?? 0 }))
      return {
        tarjetaId: g.tarjetaId!, nombre: g.titulo.replace(/^Tarjeta\s+/, ''), deudas: ds,
        totalPendiente: ds.reduce((s, d) => s + d.pendiente, 0),
        cuotasDelMes:   ds.reduce((s, d) => s + d.cuotaSugerida, 0),
        pagadoPeriodo:  ds.reduce((s, d) => s + d.pagadoPeriodo, 0),
      }
    })
  return {
    tarjetas,
    totalPendiente: tarjetas.reduce((s, t) => s + t.totalPendiente, 0),
    cuotasDelMes:   tarjetas.reduce((s, t) => s + t.cuotasDelMes, 0),
    pagadoPeriodo:  tarjetas.reduce((s, t) => s + t.pagadoPeriodo, 0),
    cantidad:       tarjetas.reduce((s, t) => s + t.deudas.length, 0),
  }
}

export type EstrategiaReparto = 'cuotas' | 'menor_saldo'

export interface LineaReparto { deudaId: string; nombre: string; pendiente: number; monto: number; pendienteDespues: number }
export interface Reparto { lineas: LineaReparto[]; asignado: number; sobrante: number }

type ItemReparto = Pick<DeudaElegible, 'pendiente' | 'cuotaSugerida'> & { deuda: Pick<Deuda, 'id' | 'nombre' | 'fecha_prox_pago'> }

/**
 * Reparte `monto` entre deudas, sin pasarse de lo pendiente de ninguna.
 *  - 'cuotas': primero la cuota de cada deuda (la que vence antes primero); lo que sobre cierra la deuda más chica.
 *  - 'menor_saldo': cierra primero la deuda con menos saldo, luego la siguiente.
 * `sobrante` = lo que no se pudo asignar (el monto supera todo lo pendiente).
 */
export function repartirPago(monto: number, items: ItemReparto[], estrategia: EstrategiaReparto): Reparto {
  let resto = Math.max(0, Math.round(monto))
  const asignado = new Map<string, number>()
  const falta = (it: ItemReparto) => it.pendiente - (asignado.get(it.deuda.id) ?? 0)
  const dar = (it: ItemReparto, tope: number) => {
    const m = Math.min(resto, falta(it), Math.max(0, Math.round(tope)))
    if (m > 0) { asignado.set(it.deuda.id, (asignado.get(it.deuda.id) ?? 0) + m); resto -= m }
  }
  const porSaldo = [...items].sort((a, b) => a.pendiente - b.pendiente || a.deuda.nombre.localeCompare(b.deuda.nombre))

  if (estrategia === 'cuotas') {
    const porVencimiento = [...items].sort((a, b) =>
      (a.deuda.fecha_prox_pago ?? '9999').localeCompare(b.deuda.fecha_prox_pago ?? '9999') || a.deuda.nombre.localeCompare(b.deuda.nombre))
    for (const it of porVencimiento) dar(it, it.cuotaSugerida)
    for (const it of porSaldo) dar(it, Infinity)
  } else {
    for (const it of porSaldo) dar(it, Infinity)
  }

  const lineas = items
    .filter(it => (asignado.get(it.deuda.id) ?? 0) > 0)
    .map(it => {
      const m = asignado.get(it.deuda.id)!
      return { deudaId: it.deuda.id, nombre: it.deuda.nombre.trim(), pendiente: it.pendiente, monto: m, pendienteDespues: it.pendiente - m }
    })
  return { lineas, asignado: lineas.reduce((s, l) => s + l.monto, 0), sobrante: resto }
}

export const ETIQUETA_ESTRATEGIA: Record<EstrategiaReparto, { titulo: string; ayuda: string }> = {
  cuotas:      { titulo: 'Cuotas primero', ayuda: 'Paga la cuota de cada deuda (la que vence antes primero). Lo que sobre cierra la deuda más chica.' },
  menor_saldo: { titulo: 'Cerrar la más chica', ayuda: 'Va pagando por completo la deuda con menos saldo, luego la siguiente. Terminas deudas antes.' },
}
