import type { Cuenta, Deuda } from '@/types/app.types'
import { calcularPlanCuotas, montoProximaCuota } from '@/utils/planCuotas'
import { deudaPendienteReal } from '@/utils/financial'

/**
 * Pagar varias deudas de una sola vez (cada una queda como su propia línea de movimiento).
 * Lógica pura: agrupar el listado, explicar cuántas cuotas se pagan y validar.
 */

export interface DeudaElegible {
  deuda:           Deuda
  tarjeta:         Cuenta | null     // tarjeta de crédito a la que está ligada (si la hay)
  pendiente:       number
  cuota:           number | null     // cuota definida (null = pago libre)
  cuotaSugerida:   number            // cuota, nunca más que lo pendiente
  cuotasRestantes: number | null     // null si no tiene cuota definida
  pagadoPct:       number            // 0..1
}

export interface GrupoDeudas { titulo: string; tarjetaId: string | null; items: DeudaElegible[] }

/** Deudas que tienen sentido pagar: activas o en mora, propias y con saldo; agrupadas por tarjeta. */
export function agruparDeudasPagables(deudas: Deuda[], cuentas: Cuenta[]): GrupoDeudas[] {
  const tarjetas = new Map(cuentas.filter(c => c.activa && c.tipo === 'credito').map(c => [c.id, c]))
  const grupos = new Map<string, GrupoDeudas>()

  for (const d of deudas) {
    if (d.estado !== 'activa' && d.estado !== 'en_mora') continue
    if (d.direccion === 'me_deben') continue
    const pendiente = deudaPendienteReal(d)
    if (pendiente <= 0) continue
    const tarjeta = d.cuenta_id ? (tarjetas.get(d.cuenta_id) ?? null) : null
    const plan = calcularPlanCuotas(pendiente, d.cuota_mensual)
    const clave = tarjeta?.id ?? 'otras'
    if (!grupos.has(clave)) {
      grupos.set(clave, { titulo: tarjeta ? `Tarjeta ${tarjeta.nombre.trim()}` : 'Otras deudas', tarjetaId: tarjeta?.id ?? null, items: [] })
    }
    grupos.get(clave)!.items.push({
      deuda: d, tarjeta, pendiente,
      cuota: d.cuota_mensual && d.cuota_mensual > 0 ? d.cuota_mensual : null,
      cuotaSugerida: montoProximaCuota(pendiente, d.cuota_mensual),
      cuotasRestantes: plan ? plan.cuotasRestantes : null,
      pagadoPct: d.monto_total > 0 ? Math.min(1, Math.max(0, (d.monto_total - pendiente) / d.monto_total)) : 0,
    })
  }

  const orden = [...grupos.values()].sort((a, b) => Number(!!b.tarjetaId) - Number(!!a.tarjetaId) || a.titulo.localeCompare(b.titulo))
  for (const g of orden) g.items.sort((a, b) => (a.deuda.fecha_prox_pago ?? '9999').localeCompare(b.deuda.fecha_prox_pago ?? '9999') || a.deuda.nombre.localeCompare(b.deuda.nombre))
  return orden
}

export interface DescripcionPago {
  texto:            string
  cuotasCompletas:  number
  saldaLaDeuda:     boolean
  pendienteDespues: number
  cuotasRestantesDespues: number | null
}

const clp = (n: number) => '$' + Math.round(n).toLocaleString('es-CL')

/** Explica en palabras qué significa pagar `monto` de una deuda (cuántas cuotas, parcial, saldo). */
export function describirPago(pendiente: number, monto: number, cuota: number | null): DescripcionPago {
  const m = Math.max(0, Math.min(Math.round(monto), pendiente))
  const despues = pendiente - m
  const plan = despues > 0 ? calcularPlanCuotas(despues, cuota) : null
  const base = { pendienteDespues: despues, cuotasRestantesDespues: plan?.cuotasRestantes ?? null }

  if (m <= 0) return { ...base, texto: 'Sin pago', cuotasCompletas: 0, saldaLaDeuda: false }
  if (despues === 0) {
    const antes = calcularPlanCuotas(pendiente, cuota)
    const txt = antes && antes.cuotasRestantes > 1 ? `Salda la deuda (quedaban ${antes.cuotasRestantes} cuotas)` : 'Salda la deuda'
    return { ...base, texto: txt, cuotasCompletas: antes?.cuotasRestantes ?? 1, saldaLaDeuda: true }
  }
  if (!cuota || cuota <= 0) return { ...base, texto: `Abono libre · quedan ${clp(despues)}`, cuotasCompletas: 0, saldaLaDeuda: false }

  const completas = Math.floor(m / cuota)
  const resto = m - completas * cuota
  let texto: string
  if (completas === 0) texto = `Abono parcial (${Math.round((m / cuota) * 100)}% de una cuota)`
  else if (resto === 0) texto = completas === 1 ? '1 cuota completa' : `${completas} cuotas completas`
  else texto = `${completas === 1 ? '1 cuota' : `${completas} cuotas`} + ${clp(resto)} de la siguiente`
  return { ...base, texto: `${texto} · ${plan ? `quedan ${plan.cuotasRestantes}` : 'sin cuotas'}`, cuotasCompletas: completas, saldaLaDeuda: false }
}

/** Atajos de monto para una deuda: 1 cuota, 2 cuotas (si hay) y saldar. */
export function opcionesRapidas(pendiente: number, cuota: number | null): { etiqueta: string; monto: number }[] {
  const res: { etiqueta: string; monto: number }[] = []
  if (cuota && cuota > 0 && pendiente > cuota) {
    res.push({ etiqueta: '1 cuota', monto: cuota })
    if (pendiente > cuota * 2) res.push({ etiqueta: '2 cuotas', monto: cuota * 2 })
  }
  res.push({ etiqueta: 'Saldar', monto: pendiente })
  return res
}

export interface LineaPago { deudaId: string; nombre: string; pendiente: number; monto: number }

/** Errores del pago múltiple; lista vacía = se puede registrar. */
export function validarPagoMultiple(
  lineas: LineaPago[],
  cuentaOrigen: Pick<Cuenta, 'tipo' | 'activa'> | null | undefined
): string[] {
  const errores: string[] = []
  if (!cuentaOrigen) errores.push('Elige la cuenta desde donde pagas')
  else if (cuentaOrigen.tipo === 'credito') errores.push('No puedes pagar una deuda de tarjeta con la misma tarjeta')
  else if (cuentaOrigen.tipo === 'inversion') errores.push('Elige una cuenta con dinero disponible')
  else if (!cuentaOrigen.activa) errores.push('La cuenta elegida está inactiva')
  if (lineas.length === 0) errores.push('Selecciona al menos una deuda')
  for (const l of lineas) {
    if (!(l.monto > 0)) errores.push(`${l.nombre}: el monto debe ser mayor a 0`)
    else if (l.monto > l.pendiente) errores.push(`${l.nombre}: no puedes pagar más de lo pendiente (${clp(l.pendiente)})`)
  }
  return errores
}

export const totalLineas = (lineas: LineaPago[]) => lineas.reduce((s, l) => s + (l.monto > 0 ? l.monto : 0), 0)
