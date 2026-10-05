import { describe, it, expect } from 'vitest'
import {
  calcularTCT,
  calcularPatrimonio,
  calcularResumen,
  calcularDineroDisponible,
} from '../utils/financial'
import type { Cuenta, Deuda, CuentaPorCobrar } from '../types/app.types'

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

// ── calcularPatrimonio (fuente única) ──────────────────────────

function makeCobrar(overrides: Partial<CuentaPorCobrar> = {}): CuentaPorCobrar {
  return {
    id: 'c1', usuario_id: 'u1', movimiento_origen_id: null, persona: 'X', descripcion: null,
    monto_original: 0, monto_pagado: 0, fecha: '2026-10-01', fecha_vencimiento: null,
    estado: 'pendiente', nota: null, created_at: '', updated_at: '',
    ...overrides,
  }
}

/** Deuda cuyo pendiente se deriva de los pagos reales (monto_pagado_real). */
function deudaReal(total: number, pagado: number, o: Partial<Deuda> = {}): Deuda {
  return makeDeuda({
    monto_total: total, monto_pagado_real: pagado, monto_pendiente_real: Math.max(0, total - pagado),
    // columna de la base deliberadamente desactualizada: NO debe usarse
    monto_pendiente: total, ...o,
  })
}

describe('calcularPatrimonio', () => {
  // Caso real de QloB (01-10-2026)
  const cuentas = [
    makeCuenta({ id: 'be', tipo: 'debito', saldo_actual: 6920 }),
    makeCuenta({ id: 'fa', tipo: 'debito', saldo_actual: 146077 }),
    makeCuenta({ id: 'mp', tipo: 'digital', saldo_actual: 1 }),
    makeCuenta({ id: 'ef', tipo: 'efectivo', saldo_actual: 20280 }),
    makeCuenta({ id: 'cmr', tipo: 'credito', saldo_actual: 700493, limite: 1170000 }),
  ]
  const deudas = [
    deudaReal(231124, 57781),   // Mamá: pendiente 173.343
    deudaReal(233019, 77673),   // Diego: pendiente 155.346
    deudaReal(21590, 0),        // Linterna: 21.590
    deudaReal(9000, 9000, { estado: 'pagada' }),
  ]
  const porCobrar = [
    makeCobrar({ id: '1', monto_original: 20000, monto_pagado: 10000 }),   // 10.000
    makeCobrar({ id: '2', monto_original: 22900, monto_pagado: 17050 }),   // 5.850
    makeCobrar({ id: '3', monto_original: 20000, monto_pagado: 0 }),       // 20.000
    makeCobrar({ id: '4', monto_original: 15000, monto_pagado: 15000, estado: 'pagado' }),
  ]

  it('caso actual: activos 209.128, pasivos 1.050.772, patrimonio −841.644', () => {
    const p = calcularPatrimonio(cuentas, deudas, porCobrar)
    expect(p.activos).toEqual({ cuentas: 173278, inversiones: 0, porCobrar: 35850, total: 209128 })
    expect(p.pasivos).toEqual({ tarjetas: 700493, deudas: 350279, total: 1050772 })
    expect(p.patrimonioNeto).toBe(-841644)
  })

  it('A. sin cuentas por cobrar → −877.494', () => {
    expect(calcularPatrimonio(cuentas, deudas, []).patrimonioNeto).toBe(-877494)
  })

  it('B. sin deuda de tarjeta → activos − deudas = 173.278 + 35.850 − 350.279 = −141.151', () => {
    const sinTarjeta = cuentas.filter(c => c.tipo !== 'credito')
    expect(calcularPatrimonio(sinTarjeta, deudas, porCobrar).patrimonioNeto).toBe(-141151)
  })

  it('C. una deuda pagada no aparece como pasivo', () => {
    const p = calcularPatrimonio([], [deudaReal(9000, 9000, { estado: 'pagada' })])
    expect(p.pasivos.deudas).toBe(0)
    expect(p.patrimonioNeto).toBe(0)
  })

  it('D. una deuda en mora sigue siendo pasivo', () => {
    const p = calcularPatrimonio([], [deudaReal(100000, 40000, { estado: 'en_mora' })])
    expect(p.pasivos.deudas).toBe(60000)
    expect(p.patrimonioNeto).toBe(-60000)
  })

  it('E. por cobrar afecta el patrimonio pero NO el dinero disponible', () => {
    const cs = [makeCuenta({ saldo_actual: 100000 })]
    const sin = calcularPatrimonio(cs, [], [])
    const con = calcularPatrimonio(cs, [], [makeCobrar({ monto_original: 30000 })])
    expect(con.patrimonioNeto - sin.patrimonioNeto).toBe(30000)
    expect(calcularDineroDisponible(cs)).toBe(100000)   // la función de disponible no recibe cobros
    expect(con.activos.cuentas).toBe(100000)             // no se suma al saldo de cuentas
  })

  it('F. la tarjeta siempre resta, sea cual sea el signo guardado', () => {
    const pos = calcularPatrimonio([makeCuenta({ tipo: 'credito', saldo_actual: 700493 })], [])
    const neg = calcularPatrimonio([makeCuenta({ tipo: 'credito', saldo_actual: -700493 })], [])
    expect(pos.patrimonioNeto).toBe(-700493)
    expect(neg.patrimonioNeto).toBe(-700493)
    expect(pos.pasivos.tarjetas).toBe(700493)
  })

  it('G. una deuda ligada a tarjeta no se resta dos veces (por defecto)', () => {
    const cs = [makeCuenta({ id: 'cmr', tipo: 'credito', saldo_actual: -400000 })]
    const ds = [deudaReal(100000, 0, { cuenta_id: 'cmr' }), deudaReal(50000, 0)]
    expect(calcularPatrimonio(cs, ds).pasivos.deudas).toBe(50000)                                           // solo la no ligada
    expect(calcularPatrimonio(cs, ds).patrimonioNeto).toBe(-450000)                                         // tarjeta 400.000 + 50.000
    expect(calcularPatrimonio(cs, ds, [], { deduplicarDeudasDeTarjeta: false }).pasivos.deudas).toBe(150000) // opción: sumarlas
  })

  it('caso real tras corregir la CMR: tarjeta 526.779 con 5 compras en cuotas ligadas', () => {
    const cs = [
      makeCuenta({ id: 'cmr', tipo: 'credito', saldo_actual: -526779 }),
      makeCuenta({ id: 'bk', tipo: 'debito', saldo_actual: 100000 }),
    ]
    const ds = [
      deudaReal(233019, 77673, { cuenta_id: 'cmr' }),   // Diego 155.346
      deudaReal(231124, 57781, { cuenta_id: 'cmr' }),   // Mamá 173.343
      deudaReal(43290, 0, { cuenta_id: 'cmr' }),        // Comida gatos
      deudaReal(11220, 0, { cuenta_id: 'cmr' }),        // Pastillas
      deudaReal(8490, 0, { cuenta_id: 'cmr' }),         // Frutilla
      deudaReal(2535181, 0),                            // Deuda auto (sin tarjeta)
    ]
    const p = calcularPatrimonio(cs, ds)
    expect(p.pasivos.tarjetas).toBe(526779)             // las deudas ligadas ya están aquí dentro
    expect(p.pasivos.deudas).toBe(2535181)              // solo la deuda sin tarjeta
    expect(p.patrimonioNeto).toBe(100000 - 526779 - 2535181)
  })

  it('el pendiente sale de los pagos reales, no de la columna monto_pendiente', () => {
    const d = makeDeuda({ monto_total: 200000, monto_pendiente: 200000, monto_pagado_real: 50000, monto_pendiente_real: 150000 })
    expect(calcularPatrimonio([], [d]).pasivos.deudas).toBe(150000)
    // sin dato de pagos reales, no se inventa: se asume nada pagado (nunca la columna)
    const sinReal = makeDeuda({ monto_total: 200000, monto_pendiente: 10 })
    expect(calcularPatrimonio([], [sinReal]).pasivos.deudas).toBe(200000)
  })

  it('una deuda "me deben" es activo por cobrar, no pasivo', () => {
    const d = deudaReal(20000, 5000, { direccion: 'me_deben' })
    const p = calcularPatrimonio([], [d])
    expect(p.pasivos.deudas).toBe(0)
    expect(p.activos.porCobrar).toBe(15000)
  })

  it('cuentas por cobrar canceladas o pagadas no cuentan', () => {
    const p = calcularPatrimonio([], [], [
      makeCobrar({ monto_original: 10000, estado: 'cancelado' }),
      makeCobrar({ monto_original: 10000, monto_pagado: 10000, estado: 'pagado' }),
    ])
    expect(p.activos.porCobrar).toBe(0)
  })

  it('cuentas inactivas no cuentan; inversión suma por su valor actual', () => {
    const cs = [
      makeCuenta({ saldo_actual: 1000000, activa: false }),
      makeCuenta({ tipo: 'inversion', saldo_actual: 1461991 }),
    ]
    const p = calcularPatrimonio(cs, [])
    expect(p.activos).toMatchObject({ cuentas: 0, inversiones: 1461991, total: 1461991 })
  })

  it('calcularResumen usa la misma fórmula (única fuente de verdad)', () => {
    const r = calcularResumen(cuentas, deudas, [], porCobrar)
    expect(r.patrimonioNeto).toBe(calcularPatrimonio(cuentas, deudas, porCobrar).patrimonioNeto)
    expect(r.patrimonioNeto).toBe(-841644)
    expect(r.totalDeudas).toBe(350279)
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
