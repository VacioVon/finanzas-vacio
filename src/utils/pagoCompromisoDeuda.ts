import type { Cuenta, Deuda } from '@/types/app.types'
import { calcularPlanCuotas, montoProximaCuota, type PlanCuotas } from '@/utils/planCuotas'
import { deudaPendienteReal } from '@/utils/financial'

/**
 * Pagar un compromiso con una deuda de tarjeta (compra en cuotas con la tarjeta de crédito).
 *
 * Un solo movimiento 'pago_deuda' enlazado a la deuda y al compromiso: baja la cuenta de origen,
 * la deuda de la tarjeta y lo pendiente de la compra, y deja el compromiso pagado.
 */

export interface DeudaPagable {
  deuda:          Deuda
  tarjeta:        Cuenta
  pendiente:      number
  cuotaSugerida:  number
  cuotasRestantes: number
  /** El nombre se parece al del compromiso (p. ej. "Comida gaticas" ↔ "Comida gatos"). */
  coincideNombre: boolean
}

const quitarTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
const tokens = (s: string) =>
  quitarTildes(s.toLowerCase()).split(/[^a-z0-9]+/).filter(t => t.length >= 4)

/** ¿Comparten alguna palabra significativa (≥ 4 letras)? */
export function nombresSeParecen(a: string, b: string): boolean {
  const ta = new Set(tokens(a))
  return tokens(b).some(t => ta.has(t))
}

/** Deudas activas ligadas a una tarjeta de crédito que todavía tienen saldo, las que coinciden con el compromiso primero. */
export function deudasPagablesDeTarjeta(
  deudas: Deuda[],
  cuentas: Cuenta[],
  compromisoNombre: string
): DeudaPagable[] {
  const tarjetas = new Map(cuentas.filter(c => c.activa && c.tipo === 'credito').map(c => [c.id, c]))
  const res: DeudaPagable[] = []
  for (const d of deudas) {
    if (d.estado !== 'activa' && d.estado !== 'en_mora') continue
    if (d.direccion === 'me_deben') continue
    const tarjeta = d.cuenta_id ? tarjetas.get(d.cuenta_id) : undefined
    if (!tarjeta) continue
    const pendiente = deudaPendienteReal(d)
    if (pendiente <= 0) continue
    const plan = calcularPlanCuotas(pendiente, d.cuota_mensual)
    res.push({
      deuda: d, tarjeta, pendiente,
      cuotaSugerida:   montoProximaCuota(pendiente, d.cuota_mensual),
      cuotasRestantes: plan?.cuotasRestantes ?? 1,
      coincideNombre:  nombresSeParecen(compromisoNombre, d.nombre),
    })
  }
  return res.sort((a, b) =>
    Number(b.coincideNombre) - Number(a.coincideNombre) || a.deuda.nombre.localeCompare(b.deuda.nombre))
}

/** Mensaje de error si el pago no es válido; null si se puede registrar. */
export function validarPagoConDeuda(
  pendiente: number,
  monto: number,
  cuentaOrigen: Pick<Cuenta, 'tipo' | 'activa'> | null | undefined
): string | null {
  if (!cuentaOrigen) return 'Selecciona la cuenta desde donde pagas'
  if (cuentaOrigen.tipo === 'credito') return 'No puedes pagar una deuda de tarjeta con la misma tarjeta'
  if (cuentaOrigen.tipo === 'inversion') return 'Selecciona una cuenta con dinero disponible'
  if (!cuentaOrigen.activa) return 'La cuenta seleccionada está inactiva'
  if (!(monto > 0)) return 'El monto debe ser mayor a 0'
  if (monto > pendiente) return 'El monto no puede superar lo que falta pagar de esta compra'
  return null
}

export interface ResumenPagoConDeuda {
  pendienteDespues: number
  saldaLaDeuda:     boolean
  plan:             PlanCuotas | null
}

/** Cómo queda la compra después de pagar `monto` (cuotas restantes recalculadas, última ajustada). */
export function resumenPagoConDeuda(pendiente: number, monto: number, cuotaMensual: number | null): ResumenPagoConDeuda {
  const pendienteDespues = Math.max(0, pendiente - monto)
  return {
    pendienteDespues,
    saldaLaDeuda: pendienteDespues === 0,
    plan: pendienteDespues > 0 ? calcularPlanCuotas(pendienteDespues, cuotaMensual) : null,
  }
}
