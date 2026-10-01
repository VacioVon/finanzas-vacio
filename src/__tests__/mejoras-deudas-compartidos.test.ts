import { describe, it, expect } from 'vitest'
import { calcularPlanCuotas, montoProximaCuota } from '../utils/planCuotas'
import {
  esGastoCompartidoPagadoTotal,
  resumenGastoCompartido,
  resumenCompartidosPeriodo,
  esIngresoPersonal,
} from '../utils/gastosCompartidos'
import type { GastoCompartido, CuentaPorCobrar, Movimiento } from '../types/app.types'

// ── MEJORA 1 ─────────────────────────────────────────────────────
describe('calcularPlanCuotas', () => {
  const original = 4_000_000
  const pagado   = 1_464_000
  const pendiente = original - pagado   // 2.536.000

  it('4.000.000 − 1.464.000 con cuota 150.000 → 17 cuotas: 16 × 150.000 + última 136.000', () => {
    expect(pendiente).toBe(2_536_000)
    expect(calcularPlanCuotas(pendiente, 150_000)).toEqual({
      cuotasRestantes: 17, cuotaHabitual: 150_000, cuotasCompletas: 16, montoUltima: 136_000,
    })
  })

  it('el cálculo es sobre el saldo pendiente, no sobre el monto original', () => {
    expect(calcularPlanCuotas(original, 150_000)!.cuotasRestantes).toBe(27)
    expect(calcularPlanCuotas(pendiente, 150_000)!.cuotasRestantes).toBe(17)
  })

  it('pago extraordinario de 500.000 → saldo 2.036.000 → 14 cuotas: 13 × 150.000 + 86.000', () => {
    expect(calcularPlanCuotas(pendiente - 500_000, 150_000)).toEqual({
      cuotasRestantes: 14, cuotaHabitual: 150_000, cuotasCompletas: 13, montoUltima: 86_000,
    })
  })

  it('cambiar la cuota a 200.000 solo cambia la proyección: 13 cuotas (12 × 200.000 + 136.000)', () => {
    expect(calcularPlanCuotas(pendiente, 200_000)).toEqual({
      cuotasRestantes: 13, cuotaHabitual: 200_000, cuotasCompletas: 12, montoUltima: 136_000,
    })
    // el pagado histórico no es parámetro del plan: se deriva de movimientos
    expect(original - pagado).toBe(pendiente)
  })

  it('división exacta: la última cuota es igual a la habitual', () => {
    expect(calcularPlanCuotas(300_000, 150_000)).toEqual({
      cuotasRestantes: 2, cuotaHabitual: 150_000, cuotasCompletas: 2, montoUltima: 150_000,
    })
  })

  it('saldo menor que la cuota → 1 cuota por el saldo; sin saldo → 0; cuota inválida → null', () => {
    expect(calcularPlanCuotas(90_000, 150_000)).toMatchObject({ cuotasRestantes: 1, cuotasCompletas: 0, montoUltima: 90_000 })
    expect(calcularPlanCuotas(0, 150_000)!.cuotasRestantes).toBe(0)
    expect(calcularPlanCuotas(100, 0)).toBeNull()
    expect(calcularPlanCuotas(100, undefined)).toBeNull()
  })

  it('deuda existente "Deuda Mama" (173.343 pendiente, cuota 57.781) → 3 cuotas', () => {
    expect(calcularPlanCuotas(173_343, 57_781)!.cuotasRestantes).toBe(3)
  })

  it('monto sugerido para pagar nunca supera el saldo', () => {
    expect(montoProximaCuota(136_000, 150_000)).toBe(136_000)
    expect(montoProximaCuota(2_536_000, 150_000)).toBe(150_000)
    expect(montoProximaCuota(500, null)).toBe(500)
  })
})

// ── MEJORA 2 ─────────────────────────────────────────────────────
function gc(over: Partial<GastoCompartido> = {}): GastoCompartido {
  return {
    id: 'gc1', movimiento_id: 'mov1', usuario_id: 'u', monto_total: 40_000, monto_usuario: 25_000,
    participantes: [{ nombre: 'Suegra', monto: 15_000, cobrar_id: 'c1' }],
    descripcion: 'Combustible', created_at: '', ...over,
  }
}
function cobrar(pagado: number, estado: CuentaPorCobrar['estado'] = 'pendiente'): CuentaPorCobrar {
  return {
    id: 'c1', usuario_id: 'u', movimiento_origen_id: 'mov1', persona: 'Suegra', descripcion: null,
    monto_original: 15_000, monto_pagado: pagado, fecha: '2026-10-01', fecha_vencimiento: null,
    estado, nota: null, created_at: '', updated_at: '',
  }
}

describe('resumenGastoCompartido', () => {
  it('sin recibir: bruto 40.000, mi parte 25.000, pendiente 15.000, neto = bruto', () => {
    expect(resumenGastoCompartido(gc(), [cobrar(0)])).toMatchObject({
      bruto: 40_000, miParte: 25_000, porRecibir: 15_000, recibido: 0, pendiente: 15_000, neto: 40_000,
    })
  })
  it('recibo 10.000 de 15.000: recibido 10.000, pendiente 5.000, costo efectivo 30.000', () => {
    expect(resumenGastoCompartido(gc(), [cobrar(10_000)])).toMatchObject({ recibido: 10_000, pendiente: 5_000, neto: 30_000 })
  })
  it('recibo los 15.000: pendiente 0, costo final 25.000 (= mi parte)', () => {
    const r = resumenGastoCompartido(gc(), [cobrar(15_000, 'pagado')])
    expect(r).toMatchObject({ recibido: 15_000, pendiente: 0, neto: 25_000 })
    expect(r.neto).toBe(r.miParte)
  })
  it('filas antiguas (sin cobrar_id) no se consideran modelo pagado-total', () => {
    expect(esGastoCompartidoPagadoTotal(gc({ participantes: [{ nombre: 'X', monto: 5 }] }))).toBe(false)
    expect(esGastoCompartidoPagadoTotal(gc())).toBe(true)
  })
})

function mov(over: Partial<Movimiento>): Movimiento {
  return { id: 'm', tipo: 'gasto', monto: 0, para_tercero: false, categoria: undefined, ...over } as Movimiento
}

describe('estadísticas sin doble conteo', () => {
  const movimientos = [
    mov({ id: 'mov1', tipo: 'gasto', monto: 40_000 }),
    mov({ id: 'rec1', tipo: 'ingreso', monto: 15_000, categoria: { nombre: 'Recuperación de dinero' } as Movimiento['categoria'] }),
  ]

  it('el reembolso NO es ingreso personal; el sueldo sí', () => {
    expect(esIngresoPersonal(movimientos[1])).toBe(false)
    expect(esIngresoPersonal(mov({ tipo: 'ingreso', categoria: { nombre: 'Sueldo' } as Movimiento['categoria'] }))).toBe(true)
  })

  it('una sola operación de gasto: bruto 40.000, reembolsos 15.000, neto 25.000', () => {
    const gastosBrutos = movimientos.filter(m => m.tipo === 'gasto' && !m.para_tercero).reduce((s, m) => s + m.monto, 0)
    const ingresos = movimientos.filter(esIngresoPersonal).reduce((s, m) => s + m.monto, 0)
    const comp = resumenCompartidosPeriodo(movimientos, [gc()], [cobrar(15_000, 'pagado')])
    expect(gastosBrutos).toBe(40_000)          // no 40.000 + 25.000
    expect(ingresos).toBe(0)                   // los 15.000 no son ingreso
    expect(comp.recibido).toBe(15_000)
    expect(gastosBrutos - comp.recibido).toBe(25_000)
  })

  it('con 10.000 recibidos el neto parcial es 30.000 y quedan 5.000 pendientes', () => {
    const comp = resumenCompartidosPeriodo(movimientos, [gc()], [cobrar(10_000)])
    expect(40_000 - comp.recibido).toBe(30_000)
    expect(comp.pendiente).toBe(5_000)
  })

  it('un gasto compartido fuera del período no suma al período', () => {
    const comp = resumenCompartidosPeriodo([mov({ id: 'otro', monto: 1 })], [gc()], [cobrar(15_000, 'pagado')])
    expect(comp).toEqual({ recibido: 0, pendiente: 0, bruto: 0 })
  })
})
