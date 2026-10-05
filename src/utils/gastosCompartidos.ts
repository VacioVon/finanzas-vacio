import type { GastoCompartido, CuentaPorCobrar, Movimiento } from '@/types/app.types'
import { esSobranteAMiDinero } from '@/utils/saldoTerceros'

/** Categoría de sistema con la que registrar_cobro_recibido marca el dinero recuperado. */
export const CATEGORIA_RECUPERACION = 'Recuperación de dinero'

/**
 * Modelo "yo pagué el total": el movimiento gasto es el monto_total (sale completo de la
 * cuenta) y cada participante genera una cuenta por cobrar enlazada al movimiento.
 * Las filas antiguas (monto del movimiento = solo mi parte) no tienen cobrar_id.
 */
export function esGastoCompartidoPagadoTotal(gc: GastoCompartido): boolean {
  return gc.participantes.some(p => !!p.cobrar_id)
}

export interface ResumenGastoCompartido {
  movimientoId: string
  bruto:        number   // total que salió de mi cuenta
  miParte:      number   // lo que realmente me corresponde
  porRecibir:   number   // total que otros me deben por este gasto
  recibido:     number   // reembolsos efectivamente recibidos
  pendiente:    number   // aún por recibir
  neto:         number   // bruto − recibido (costo efectivo hasta hoy)
}

export function resumenGastoCompartido(
  gc: GastoCompartido,
  cobrar: CuentaPorCobrar[]
): ResumenGastoCompartido {
  const ids = new Set(gc.participantes.map(p => p.cobrar_id).filter(Boolean) as string[])
  const enlazadas = cobrar.filter(c => ids.has(c.id) && c.estado !== 'cancelado')

  const porRecibir = enlazadas.reduce((s, c) => s + c.monto_original, 0)
  const recibido   = enlazadas.reduce((s, c) => s + Math.min(c.monto_pagado, c.monto_original), 0)

  return {
    movimientoId: gc.movimiento_id,
    bruto:        gc.monto_total,
    miParte:      gc.monto_usuario,
    porRecibir,
    recibido,
    pendiente:    Math.max(0, porRecibir - recibido),
    neto:         gc.monto_total - recibido,
  }
}

export interface ResumenCompartidosPeriodo {
  recibido:   number
  pendiente:  number
  /** Gasto bruto de los movimientos compartidos del período (ya incluido en "gastos"). */
  bruto:      number
}

/** Agrega los gastos compartidos (modelo pagado-total) cuyos movimientos caen en el período. */
export function resumenCompartidosPeriodo(
  movimientos: Movimiento[],
  compartidos: GastoCompartido[],
  cobrar: CuentaPorCobrar[]
): ResumenCompartidosPeriodo {
  const idsMov = new Set(movimientos.filter(m => m.tipo === 'gasto' && !m.para_tercero).map(m => m.id))
  let recibido = 0, pendiente = 0, bruto = 0
  for (const gc of compartidos) {
    if (!idsMov.has(gc.movimiento_id) || !esGastoCompartidoPagadoTotal(gc)) continue
    const r = resumenGastoCompartido(gc, cobrar)
    recibido  += r.recibido
    pendiente += r.pendiente
    bruto     += r.bruto
  }
  return { recibido, pendiente, bruto }
}

/** Ingreso propio: no es dinero devuelto ("Recuperación de dinero") ni dinero de terceros. */
export function esIngresoPersonal(m: Pick<Movimiento, 'tipo' | 'categoria'> & { fondos_tercero?: boolean; nota?: string | null; cuenta_id?: string | null }): boolean {
  if (esSobranteAMiDinero(m)) return true   // sobrante de terceros que el usuario se quedó
  return m.tipo === 'ingreso' && m.categoria?.nombre !== CATEGORIA_RECUPERACION && !m.fondos_tercero
}

/** Gasto propio: no es gasto hecho para un tercero ni pagado con dinero de terceros. */
export function esGastoPersonal(m: Pick<Movimiento, 'tipo' | 'para_tercero'> & { fondos_tercero?: boolean }): boolean {
  return m.tipo === 'gasto' && !m.para_tercero && !m.fondos_tercero
}
