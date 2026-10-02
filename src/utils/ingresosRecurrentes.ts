import type { InstanciaEsperada } from '@/types/ingresos-recurrentes.types'

/**
 * Lógica pura de edición de ingresos recurrentes.
 *
 * Regla de oro: una edición de la configuración SOLO puede tocar instancias en estado
 * 'pendiente' y que no tengan un ajuste manual de mes. Confirmadas, pospuestas y no recibidas
 * (y los movimientos reales) no se tocan nunca.
 */

/** Marca guardada en la nota de una instancia cuyo monto fue ajustado manualmente para ese mes. */
export const MARCA_AJUSTE = '[AJUSTE MES]'

export function esInstanciaAjustada(nota: string | null | undefined): boolean {
  return !!nota && nota.startsWith(MARCA_AJUSTE)
}

function pad(n: number) { return String(n).padStart(2, '0') }

function fmt(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Misma regla que la función de la base (generar_instancias_ingreso): el día se limita al último
 * día del mes y la ventana es fecha ± tolerancia.
 */
export function calcularVentanaInstancia(
  periodoRef: string,        // 'YYYY-MM'
  dia: number,
  tolerancia: number
): { fecha: string; min: string; max: string } {
  const [y, m] = periodoRef.split('-').map(Number)
  const ultimoDia = new Date(y, m, 0).getDate()
  const base = new Date(y, m - 1, Math.min(Math.max(1, dia), ultimoDia))
  const min = new Date(base); min.setDate(min.getDate() - tolerancia)
  const max = new Date(base); max.setDate(max.getDate() + tolerancia)
  return { fecha: fmt(base), min: fmt(min), max: fmt(max) }
}

export interface ConfigBase {
  monto_esperado:  number
  dia_esperado:    number
  tolerancia_dias: number
}

export interface CambioInstancia {
  id:           string
  periodo_ref:  string
  antes:        { monto: number; fecha: string }
  despues:      { monto: number; fecha: string; min: string; max: string }
}

export interface PlanCambioBase {
  /** Instancias pendientes que se actualizarán con la nueva configuración. */
  actualizar:  CambioInstancia[]
  /** Pendientes con ajuste manual de mes: se conservan tal cual. */
  conservadas: InstanciaEsperada[]
  /** Instancias que NO se tocan por no estar pendientes (confirmadas, pospuestas, no recibidas). */
  intactas:    InstanciaEsperada[]
}

export function planificarCambioBase(instancias: InstanciaEsperada[], nueva: ConfigBase): PlanCambioBase {
  const plan: PlanCambioBase = { actualizar: [], conservadas: [], intactas: [] }
  for (const i of instancias) {
    if (i.estado !== 'pendiente') { plan.intactas.push(i); continue }
    if (esInstanciaAjustada(i.nota)) { plan.conservadas.push(i); continue }
    const v = calcularVentanaInstancia(i.periodo_ref, nueva.dia_esperado, nueva.tolerancia_dias)
    const cambia = i.monto_esperado !== nueva.monto_esperado || i.fecha_esperada !== v.fecha ||
                   i.fecha_min !== v.min || i.fecha_max !== v.max
    if (!cambia) continue
    plan.actualizar.push({
      id: i.id, periodo_ref: i.periodo_ref,
      antes:   { monto: i.monto_esperado, fecha: i.fecha_esperada },
      despues: { monto: nueva.monto_esperado, fecha: v.fecha, min: v.min, max: v.max },
    })
  }
  return plan
}

/** Texto de la nota que deja constancia del ajuste de un mes. */
export function armarNotaAjuste(montoBase: number, montoNuevo: number, comentario?: string): string {
  const f = (n: number) => '$' + Math.round(n).toLocaleString('es-CL')
  const extra = comentario?.trim() ? ` · ${comentario.trim()}` : ''
  return `${MARCA_AJUSTE} esperado base ${f(montoBase)} → ${f(montoNuevo)}${extra}`
}

/** ¿El ingreso es un sueldo? Se reconoce por el nombre del ingreso o de su fuente. */
export function esIngresoSueldo(nombre?: string | null, fuente?: string | null): boolean {
  return /sueldo/i.test(nombre ?? '') || /sueldo/i.test(fuente ?? '')
}
