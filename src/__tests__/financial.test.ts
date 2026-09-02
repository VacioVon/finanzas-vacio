import { describe, it, expect } from 'vitest'
import {
  calcularTCT,
  calcularPatrimonioNeto,
  calcularDineroDisponible,
} from '../utils/financial'
import type { Cuenta, Deuda } from '../types/app.types'

// ── Helpers de fixture ────────────────────────────────────────

function makeCuenta(overrides: Partial<Cuenta> = {}): Cuenta {
  return {
    id: '1', usuario_id: 'u1', nombre: 'Test', tipo: 'bancaria',
    institucion: null, saldo_actual: 0, saldo_inicial: 0,
    limite: null, color: '#000', activa: true,
    dia_facturacion: null, dia_vencimiento: null, pago_minimo_pct: null,
    created_at: '', updated_at: '',
    ...overrides,
  }
}

function makeDeuda(overrides: Partial<Deuda> = {}): Deuda {
  return {
    id: '1', usuario_id: 'u1', nombre: 'Test', tipo_deuda: null,
    prestamista_nombre: null, categoria_id: null, cuenta_id: null,
    monto_total: 0, monto_pendiente: 0, cuotas_total: 1, cuotas_pagadas: 0,
    cuota_mensual: null, interes: 0, fecha_compra: '', fecha_prox_pago: null,
    fecha_vencimiento: null, estado: 'activa', nota: null, comprobante_url: null,
    created_at: '', updated_at: '',
    ...overrides,
  }
}

// ── calcularTCT ───────────────────────────────────────────────

describe('calcularTCT — Tasa de Costo Total', () => {
  it('devuelve null si monto_total es 0', () => {
    expect(calcularTCT(0, 10, 0, 12)).toBeNull()
  })

  it('devuelve null si cuotas_total es 0', () => {
    expect(calcularTCT(500000, 10, 0, 0)).toBeNull()
  })

  it('devuelve null si no hay costo (interes=0, comision=0)', () => {
    expect(calcularTCT(500000, 0, 0, 12)).toBeNull()
  })

  it('solo interés 10% anual, 12 meses → TCT = 10%', () => {
    // interesTotal = 500000 * 0.10 * 1 = 50000
    // tct = (50000 / 500000) / 1 * 100 = 10.0
    expect(calcularTCT(500000, 10, 0, 12)).toBe(10)
  })

  it('solo comisión 25000, sin interés, 12 meses → TCT = 5%', () => {
    // costoExtra = 25000
    // tct = (25000 / 500000) / 1 * 100 = 5.0
    expect(calcularTCT(500000, 0, 25000, 12)).toBe(5)
  })

  it('interés 10% + comisión 25000, 12 meses → TCT = 15%', () => {
    // interesTotal = 50000; costoExtra = 75000
    // tct = (75000 / 500000) / 1 * 100 = 15.0
    expect(calcularTCT(500000, 10, 25000, 12)).toBe(15)
  })

  it('plazo 24 meses, interés anual — TCT se mantiene igual (10%)', () => {
    // interesTotal = 500000 * 0.10 * 2 = 100000
    // tct = (100000 / 500000) / 2 * 100 = 10.0
    expect(calcularTCT(500000, 10, 0, 24)).toBe(10)
  })

  it('plazo 6 meses — comisión fija se anualiza → TCT sube (10%)', () => {
    // costoExtra = 25000; años = 0.5
    // tct = (25000 / 500000) / 0.5 * 100 = 10.0
    expect(calcularTCT(500000, 0, 25000, 6)).toBe(10)
  })

  it('resultado tiene máximo 1 decimal', () => {
    const tct = calcularTCT(300000, 7, 5000, 18)
    expect(tct).not.toBeNull()
    if (tct !== null) {
      const decimales = tct.toString().includes('.')
        ? tct.toString().split('.')[1].length
        : 0
      expect(decimales).toBeLessThanOrEqual(1)
    }
  })

  it('monto_total negativo → null', () => {
    expect(calcularTCT(-100000, 10, 0, 12)).toBeNull()
  })
})

// ── calcularPatrimonioNeto ─────────────────────────────────────

describe('calcularPatrimonioNeto', () => {
  it('sin cuentas ni deudas → 0', () => {
    expect(calcularPatrimonioNeto([], [])).toBe(0)
  })

  it('cuenta bancaria activa suma al patrimonio', () => {
    const cuentas = [makeCuenta({ saldo_actual: 1000000 })]
    expect(calcularPatrimonioNeto(cuentas, [])).toBe(1000000)
  })

  it('cuenta de crédito no suma (excluida)', () => {
    const cuentas = [makeCuenta({ tipo: 'credito', saldo_actual: 500000 })]
    expect(calcularPatrimonioNeto(cuentas, [])).toBe(0)
  })

  it('cuenta inactiva no cuenta', () => {
    const cuentas = [makeCuenta({ saldo_actual: 1000000, activa: false })]
    expect(calcularPatrimonioNeto(cuentas, [])).toBe(0)
  })

  it('deuda activa resta del patrimonio', () => {
    const cuentas = [makeCuenta({ saldo_actual: 2000000 })]
    const deudas  = [makeDeuda({ monto_pendiente: 500000 })]
    expect(calcularPatrimonioNeto(cuentas, deudas)).toBe(1500000)
  })

  it('deuda pagada no resta', () => {
    const cuentas = [makeCuenta({ saldo_actual: 2000000 })]
    const deudas  = [makeDeuda({ monto_pendiente: 500000, estado: 'pagada' })]
    expect(calcularPatrimonioNeto(cuentas, deudas)).toBe(2000000)
  })

  it('inversión suma al patrimonio', () => {
    const cuentas = [makeCuenta({ tipo: 'inversion', saldo_actual: 300000 })]
    expect(calcularPatrimonioNeto(cuentas, [])).toBe(300000)
  })

  it('patrimonio puede ser negativo (deuda > activos)', () => {
    const cuentas = [makeCuenta({ saldo_actual: 100000 })]
    const deudas  = [makeDeuda({ monto_pendiente: 500000 })]
    expect(calcularPatrimonioNeto(cuentas, deudas)).toBe(-400000)
  })
})

// ── calcularDineroDisponible ───────────────────────────────────

describe('calcularDineroDisponible', () => {
  it('solo cuentas líquidas (no inversión, no crédito)', () => {
    const cuentas = [
      makeCuenta({ tipo: 'bancaria',  saldo_actual: 500000 }),
      makeCuenta({ tipo: 'efectivo',  saldo_actual: 100000 }),
      makeCuenta({ tipo: 'inversion', saldo_actual: 200000 }),
      makeCuenta({ tipo: 'credito',   saldo_actual: 300000 }),
    ]
    expect(calcularDineroDisponible(cuentas)).toBe(600000)
  })

  it('cuentas inactivas no cuentan', () => {
    const cuentas = [
      makeCuenta({ saldo_actual: 500000, activa: false }),
      makeCuenta({ saldo_actual: 200000, activa: true }),
    ]
    expect(calcularDineroDisponible(cuentas)).toBe(200000)
  })

  it('lista vacía → 0', () => {
    expect(calcularDineroDisponible([])).toBe(0)
  })
})
