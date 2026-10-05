import { describe, it, expect } from 'vitest'
import { getCurrentMesAnio, getPeriodoPresupuestal, etiquetaRangoPeriodo } from '../utils/periodo'

describe('período con día de sueldo 28', () => {
  it('antes del 28 pertenece al mes en curso', () => {
    expect(getCurrentMesAnio(28, new Date(2026, 9, 5))).toEqual({ mes: 10, anio: 2026 })     // 5-oct → Octubre
    expect(getCurrentMesAnio(28, new Date(2026, 8, 27))).toEqual({ mes: 9, anio: 2026 })     // 27-sep → Septiembre
  })
  it('desde el día de sueldo corre el período del mes siguiente (28-sep → Octubre)', () => {
    expect(getCurrentMesAnio(28, new Date(2026, 8, 28))).toEqual({ mes: 10, anio: 2026 })
    expect(getCurrentMesAnio(28, new Date(2026, 9, 29))).toEqual({ mes: 11, anio: 2026 })   // 29-oct → Noviembre
  })
  it('diciembre pasa a enero del año siguiente', () => {
    expect(getCurrentMesAnio(28, new Date(2026, 11, 30))).toEqual({ mes: 1, anio: 2027 })
  })
  it('sin día de sueldo (1) es el mes calendario', () => {
    expect(getCurrentMesAnio(1, new Date(2026, 9, 29))).toEqual({ mes: 10, anio: 2026 })
    expect(getCurrentMesAnio(undefined, new Date(2026, 9, 29))).toEqual({ mes: 10, anio: 2026 })
  })
  it('el período de Octubre va del 28-sep al 27-oct', () => {
    expect(getPeriodoPresupuestal(10, 2026, 28)).toEqual({ start: '2026-09-28', end: '2026-10-27' })
    expect(etiquetaRangoPeriodo(10, 2026, 28)).toBe('28 sep – 27 oct')
  })
  it('un día del período cae en el mes de período correcto de punta a punta', () => {
    // el período calculado "hoy" siempre contiene la fecha de hoy
    for (const [y, m, d] of [[2026, 9, 5], [2026, 8, 28], [2026, 9, 27], [2026, 9, 28], [2026, 11, 31]]) {
      const hoy = new Date(y, m, d)
      const { mes, anio } = getCurrentMesAnio(28, hoy)
      const { start, end } = getPeriodoPresupuestal(mes, anio, 28)
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      expect(iso >= start && iso <= end).toBe(true)
    }
  })
})
