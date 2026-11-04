import { describe, it, expect } from 'vitest'
import { MARCA_SIN_ASIGNAR, notaSinAsignar, esPagoSinAsignar, totalSinAsignar, validarAsignacion } from '@/utils/pagosSinAsignar'

describe('pagos sin asignar', () => {
  it('la nota lleva la marca y se reconoce', () => {
    expect(notaSinAsignar()).toBe(MARCA_SIN_ASIGNAR)
    expect(notaSinAsignar('  pago de noviembre ')).toBe('[SIN ASIGNAR] pago de noviembre')
    expect(esPagoSinAsignar({ tipo: 'pago_tarjeta', nota: notaSinAsignar('x') })).toBe(true)
  })
  it('un pago de tarjeta normal (sin marca) o de otro tipo no cuenta', () => {
    expect(esPagoSinAsignar({ tipo: 'pago_tarjeta', nota: 'Pago tarjeta cmr' })).toBe(false)
    expect(esPagoSinAsignar({ tipo: 'pago_tarjeta', nota: null })).toBe(false)
    expect(esPagoSinAsignar({ tipo: 'gasto', nota: MARCA_SIN_ASIGNAR })).toBe(false)
  })
  it('suma solo los sin asignar', () => {
    expect(totalSinAsignar([
      { tipo: 'pago_tarjeta', nota: notaSinAsignar(), monto: 100000 },
      { tipo: 'pago_tarjeta', nota: 'otro', monto: 155164 },
      { tipo: 'pago_tarjeta', nota: notaSinAsignar('b'), monto: 20000 },
    ])).toBe(120000)
  })
  it('validarAsignacion: caso 100.000 repartido en dos deudas', () => {
    const r = validarAsignacion(100000, [
      { deudaId: 'a', nombre: 'Mama', pendiente: 57781, monto: 57781 },
      { deudaId: 'b', nombre: 'Gatos', pendiente: 43290, monto: 14430 },
      { deudaId: 'c', nombre: 'Pizza', pendiente: 11220, monto: 0 },
    ])
    expect(r.errores).toEqual([])
    expect(r.asignado).toBe(72211)
    expect(r.restante).toBe(27789)
  })
  it('rechaza asignar más de lo pagado, más de lo pendiente o nada', () => {
    expect(validarAsignacion(1000, [{ deudaId: 'a', nombre: 'A', pendiente: 5000, monto: 2000 }]).errores.join()).toMatch(/más de lo que pagaste/)
    expect(validarAsignacion(9000, [{ deudaId: 'a', nombre: 'A', pendiente: 500, monto: 600 }]).errores.join()).toMatch(/más de lo pendiente/)
    expect(validarAsignacion(9000, [{ deudaId: 'a', nombre: 'A', pendiente: 500, monto: 0 }]).errores.join()).toMatch(/al menos/)
  })
  it('asignar todo deja restante 0', () => {
    expect(validarAsignacion(500, [{ deudaId: 'a', nombre: 'A', pendiente: 500, monto: 500 }]).restante).toBe(0)
  })
})
