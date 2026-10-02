import type { Movimiento, MovimientoFormData } from '@/types/app.types'

/**
 * Reglas de la edición de un movimiento existente.
 *
 * 1. Los campos que el formulario de edición NO muestra ni maneja (para_tercero, tercero_nombre,
 *    deuda de un pago, objetivo) se conservan tal como estaban: editar fecha o nota no puede
 *    desvincular una deuda ni convertir un gasto para tercero en gasto personal.
 * 2. Solo se vuelven a calcular saldos (RPC) si cambió algo financiero. Cambiar fecha, nota,
 *    comercio, categoría o comprobante nunca toca saldos, deudas ni tarjetas.
 */

export interface ResolucionEdicion {
  deudaNueva:         string | null
  objetivoNuevo:      string | null
  paraTercero:        boolean
  terceroNombre:      string | null
  /** true si cambió tipo, cuenta, destino, objetivo, deuda o monto (hay que recalcular saldos) */
  cambioFinanciero:   boolean
}

export function resolverEdicion(original: Movimiento, form: MovimientoFormData): ResolucionEdicion {
  const esPagoDeuda = form.tipo === 'pago_deuda'
  const deudaNueva    = esPagoDeuda ? (form.deuda_id || original.deuda_id || null) : null
  const objetivoNuevo = form.objetivo_ahorro_id || original.objetivo_ahorro_id || null
  const cuentaNueva   = form.cuenta_id || null
  const destinoNuevo  = form.cuenta_destino_id || null

  const cambioFinanciero =
    original.tipo               !== form.tipo        ||
    (original.cuenta_id         ?? null) !== cuentaNueva   ||
    (original.cuenta_destino_id ?? null) !== destinoNuevo  ||
    (original.objetivo_ahorro_id ?? null) !== objetivoNuevo ||
    (original.deuda_id          ?? null) !== deudaNueva    ||
    Number(original.monto)      !== Number(form.monto)

  return {
    deudaNueva, objetivoNuevo, cambioFinanciero,
    paraTercero:   original.para_tercero,
    terceroNombre: original.tercero_nombre,
  }
}

/** ¿Hay que verificar si una deuda está ligada a una tarjeta antes de recalcular saldos? */
export function deudasInvolucradas(original: Movimiento, deudaNueva: string | null): string[] {
  return [...new Set([original.deuda_id, deudaNueva].filter((d): d is string => !!d))]
}
