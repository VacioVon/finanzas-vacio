/**
 * Planificación de cuotas de una deuda.
 *
 * Es solo una PROYECCIÓN derivada del saldo pendiente real y del monto de cuota
 * definido por el usuario. No registra pagos ni altera el historial: el "pagado"
 * sigue saliendo únicamente de los movimientos pago_deuda.
 */

export interface PlanCuotas {
  /** Cuotas que faltan para saldar el pendiente (0 si no hay saldo). */
  cuotasRestantes: number
  /** Monto de la cuota habitual definida por el usuario. */
  cuotaHabitual:   number
  /** Cuotas que se pagan completas con la cuota habitual. */
  cuotasCompletas: number
  /** Monto de la última cuota, ajustado al saldo (≤ cuotaHabitual). */
  montoUltima:     number
}

export function calcularPlanCuotas(
  saldoPendiente: number,
  montoCuota: number | null | undefined
): PlanCuotas | null {
  const cuota = Math.round(Number(montoCuota))
  if (!Number.isFinite(cuota) || cuota <= 0) return null

  const saldo = Math.max(0, Math.round(Number(saldoPendiente) || 0))
  if (saldo === 0) {
    return { cuotasRestantes: 0, cuotaHabitual: cuota, cuotasCompletas: 0, montoUltima: 0 }
  }

  const cuotasRestantes = Math.ceil(saldo / cuota)
  const montoUltima     = saldo - (cuotasRestantes - 1) * cuota
  const cuotasCompletas = montoUltima === cuota ? cuotasRestantes : cuotasRestantes - 1

  return { cuotasRestantes, cuotaHabitual: cuota, cuotasCompletas, montoUltima }
}

/** Monto sugerido para el próximo pago: la cuota, nunca más que el saldo. */
export function montoProximaCuota(saldoPendiente: number, montoCuota: number | null | undefined): number {
  const saldo = Math.max(0, Math.round(Number(saldoPendiente) || 0))
  const cuota = Math.round(Number(montoCuota))
  if (!Number.isFinite(cuota) || cuota <= 0) return saldo
  return Math.min(cuota, saldo)
}
