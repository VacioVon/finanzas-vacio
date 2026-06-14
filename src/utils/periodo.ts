/**
 * Utilidades para el período presupuestario.
 *
 * Si fecha_sueldo = 1 (o no configurada), el período coincide con el mes calendario.
 * Si fecha_sueldo = 28, el "mes de junio" va del 28-may al 27-jun.
 */

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Calcula la fecha estimada de la última cuota.
 * fecha_inicio + (cuotas_total - 1) meses
 */
export function fechaFinCuota(fechaInicio: string, cuotasTotal: number): string {
  const [y, m, d] = fechaInicio.split('-').map(Number)
  const totalMeses = m - 1 + (cuotasTotal - 1)
  const anioFin    = y + Math.floor(totalMeses / 12)
  const mesFin     = (totalMeses % 12) + 1
  return `${anioFin}-${pad(mesFin)}-${pad(d)}`
}

/**
 * Calcula la fecha estimada del próximo pago.
 * fecha_inicio + cuotas_pagadas meses
 */
export function fechaProximaCuota(fechaInicio: string, cuotasPagadas: number): string {
  const [y, m, d] = fechaInicio.split('-').map(Number)
  const totalMeses = m - 1 + cuotasPagadas
  const anioProx   = y + Math.floor(totalMeses / 12)
  const mesProx    = (totalMeses % 12) + 1
  return `${anioProx}-${pad(mesProx)}-${pad(d)}`
}

/** Formatea 'YYYY-MM-DD' como 'mes año', ej: "Oct 2025" */
export function formatMesAnio(fecha: string): string {
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const [y, m] = fecha.split('-').map(Number)
  return `${meses[m - 1]} ${y}`
}

export function getPeriodoPresupuestal(
  mes: number,
  anio: number,
  fechaSueldo: number = 1
): { start: string; end: string } {
  if (fechaSueldo <= 1) {
    const lastDay = new Date(anio, mes, 0).getDate()
    return {
      start: `${anio}-${pad(mes)}-01`,
      end:   `${anio}-${pad(mes)}-${pad(lastDay)}`
    }
  }
  // Período: del día `fechaSueldo` del mes anterior al día `fechaSueldo - 1` del mes actual
  const prevMes  = mes === 1 ? 12 : mes - 1
  const prevAnio = mes === 1 ? anio - 1 : anio
  return {
    start: `${prevAnio}-${pad(prevMes)}-${pad(fechaSueldo)}`,
    end:   `${anio}-${pad(mes)}-${pad(fechaSueldo - 1)}`
  }
}

export function getCurrentMesAnio(): { mes: number; anio: number } {
  const now = new Date()
  return { mes: now.getMonth() + 1, anio: now.getFullYear() }
}

export function labelMesAnio(mes: number, anio: number): string {
  const months = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ]
  return `${months[mes - 1]} ${anio}`
}

export function navegarMes(
  mes: number,
  anio: number,
  delta: 1 | -1
): { mes: number; anio: number } {
  let newMes  = mes + delta
  let newAnio = anio
  if (newMes > 12) { newMes = 1;  newAnio++ }
  if (newMes < 1)  { newMes = 12; newAnio-- }
  return { mes: newMes, anio: newAnio }
}
