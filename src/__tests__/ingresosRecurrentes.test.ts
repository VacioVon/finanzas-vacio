import { describe, it, expect } from 'vitest'
import {
  calcularVentanaInstancia, planificarCambioBase, esInstanciaAjustada, armarNotaAjuste,
  esIngresoSueldo, MARCA_AJUSTE,
} from '../utils/ingresosRecurrentes'
import type { InstanciaEsperada } from '../types/ingresos-recurrentes.types'

function inst(o: Partial<InstanciaEsperada>): InstanciaEsperada {
  return {
    id: 'i', ingreso_recurrente_id: 'r', periodo_ref: '2026-10', fecha_esperada: '2026-10-28',
    fecha_min: '2026-10-26', fecha_max: '2026-10-30', monto_esperado: 650000, estado: 'pendiente',
    movimiento_id: null, nota: null, ...o,
  }
}

describe('calcularVentanaInstancia (misma regla que la base)', () => {
  it('día 28 ±2 en octubre', () => {
    expect(calcularVentanaInstancia('2026-10', 28, 2)).toEqual({ fecha: '2026-10-28', min: '2026-10-26', max: '2026-10-30' })
  })
  it('día 31 en un mes de 30 días se limita al último día', () => {
    expect(calcularVentanaInstancia('2026-11', 31, 0).fecha).toBe('2026-11-30')
  })
  it('febrero (28 días) y año bisiesto', () => {
    expect(calcularVentanaInstancia('2026-02', 30, 0).fecha).toBe('2026-02-28')
    expect(calcularVentanaInstancia('2028-02', 30, 0).fecha).toBe('2028-02-29')
  })
  it('la ventana cruza de mes correctamente', () => {
    expect(calcularVentanaInstancia('2026-10', 1, 2)).toMatchObject({ min: '2026-09-29', max: '2026-10-03' })
  })
  it('día 15 ±1 (quincena actual)', () => {
    expect(calcularVentanaInstancia('2026-10', 15, 1)).toEqual({ fecha: '2026-10-15', min: '2026-10-14', max: '2026-10-16' })
  })
})

describe('planificarCambioBase: qué se toca y qué nunca', () => {
  const nueva = { monto_esperado: 700000, dia_esperado: 28, tolerancia_dias: 2 }

  it('actualiza solo las pendientes con la nueva configuración', () => {
    const plan = planificarCambioBase([inst({ id: 'oct' })], nueva)
    expect(plan.actualizar).toHaveLength(1)
    expect(plan.actualizar[0]).toMatchObject({ id: 'oct', antes: { monto: 650000 }, despues: { monto: 700000, fecha: '2026-10-28' } })
  })

  it('NUNCA toca confirmadas, pospuestas ni no recibidas', () => {
    const plan = planificarCambioBase([
      inst({ id: 'a', estado: 'confirmado', movimiento_id: 'm1' }),
      inst({ id: 'b', estado: 'pospuesto' }),
      inst({ id: 'c', estado: 'no_recibido' }),
    ], nueva)
    expect(plan.actualizar).toHaveLength(0)
    expect(plan.intactas.map(x => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('conserva las pendientes con ajuste manual de mes', () => {
    const ajustada = inst({ id: 'adj', monto_esperado: 630000, nota: armarNotaAjuste(650000, 630000) })
    const plan = planificarCambioBase([ajustada, inst({ id: 'normal', periodo_ref: '2026-11' })], nueva)
    expect(plan.conservadas.map(x => x.id)).toEqual(['adj'])
    expect(plan.actualizar.map(x => x.id)).toEqual(['normal'])
  })

  it('si nada cambia, no hay actualizaciones (sin escrituras innecesarias)', () => {
    const plan = planificarCambioBase([inst({})], { monto_esperado: 650000, dia_esperado: 28, tolerancia_dias: 2 })
    expect(plan.actualizar).toHaveLength(0)
  })

  it('cambiar solo el día actualiza la fecha y mantiene el monto', () => {
    const plan = planificarCambioBase([inst({})], { monto_esperado: 650000, dia_esperado: 27, tolerancia_dias: 2 })
    expect(plan.actualizar[0].despues).toMatchObject({ monto: 650000, fecha: '2026-10-27', min: '2026-10-25', max: '2026-10-29' })
  })

  it('un mes distinto usa su propio calendario', () => {
    const plan = planificarCambioBase([inst({ id: 'feb', periodo_ref: '2027-02', fecha_esperada: '2027-02-28' })], { monto_esperado: 650000, dia_esperado: 31, tolerancia_dias: 0 })
    expect(plan.actualizar[0].despues.fecha).toBe('2027-02-28')
  })

  it('no modifica los objetos de entrada', () => {
    const entrada = [inst({ id: 'x' })]
    const copia = JSON.stringify(entrada)
    planificarCambioBase(entrada, nueva)
    expect(JSON.stringify(entrada)).toBe(copia)
  })
})

describe('ajuste de un mes', () => {
  it('la nota deja constancia con la marca y los montos', () => {
    const nota = armarNotaAjuste(650000, 630000, 'descuento')
    expect(nota.startsWith(MARCA_AJUSTE)).toBe(true)
    expect(nota).toContain('630.000')
    expect(nota).toContain('descuento')
    expect(esInstanciaAjustada(nota)).toBe(true)
  })
  it('una nota normal o vacía no es ajuste', () => {
    expect(esInstanciaAjustada(null)).toBe(false)
    expect(esInstanciaAjustada('depósito con demora')).toBe(false)
  })
})

describe('identificar un sueldo', () => {
  it('por nombre o por fuente (sin distinguir mayúsculas)', () => {
    expect(esIngresoSueldo('Sueldo quincena ', null)).toBe(true)
    expect(esIngresoSueldo('Pago principal', 'Sueldo mensual')).toBe(true)
    expect(esIngresoSueldo('SUELDO', undefined)).toBe(true)
  })
  it('otros ingresos no son sueldo', () => {
    expect(esIngresoSueldo('Honorarios', null)).toBe(false)
    expect(esIngresoSueldo(null, null)).toBe(false)
  })
})
