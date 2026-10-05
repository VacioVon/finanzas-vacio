import { describe, it, expect } from 'vitest'
import { calcularSaldoTerceros, sobranteTrasPago, type MovTerceros } from '../utils/saldoTerceros'

const m = (tipo: string, monto: number, fecha: string, o: Partial<MovTerceros> = {}): MovTerceros =>
  ({ tipo, monto, fecha, fondos_tercero: true, created_at: fecha + 'T10:00:00Z', cuenta_id: 'falabella', ...o })

// Historial real de QloB (fondos de terceros)
const historial = [
  m('ingreso', 57781, '2026-08-31'),        // Deuda lavadora
  m('pago_deuda', 57781, '2026-09-03'),     // cuota Deuda Mamá
  m('gasto', 9638, '2026-09-04'),           // Entel mamá
  m('gasto', 17062, '2026-09-04'),          // WiFi mamá y Sebastián
  m('ingreso', 8000, '2026-10-05'),         // Sebastián (para el WiFi)
]

describe('calcularSaldoTerceros', () => {
  it('caso real: el exceso de septiembre ($26.700) no consume los $8.000 de hoy → saldo $8.000', () => {
    const s = calcularSaldoTerceros(historial)
    expect(s.disponible).toBe(8000)
    expect(s.absorbidoPropio).toBe(26700)
    expect(s.fondos).toBe(65781)
    expect(s.gastadoTerceros).toBe(84481)
    expect(s.primaryCuentaId).toBe('falabella')
  })

  it('sin la regla de piso el saldo sería −18.700 (lo que mostraba antes)', () => {
    const ingresos = historial.filter(x => x.tipo === 'ingreso').reduce((s, x) => s + x.monto, 0)
    const egresos  = historial.filter(x => x.tipo !== 'ingreso').reduce((s, x) => s + x.monto, 0)
    expect(ingresos - egresos).toBe(-18700)
  })

  it('pagar el WiFi de $7.500 deja $500 de sobrante', () => {
    const s = calcularSaldoTerceros([...historial, m('pago_deuda', 7500, '2026-10-06')])
    expect(s.disponible).toBe(500)
    expect(sobranteTrasPago(8000, 7500)).toBe(500)
  })

  it('pasar el sobrante a mi dinero (egreso sin cuenta) deja el saldo en 0', () => {
    const s = calcularSaldoTerceros([...historial, m('pago_deuda', 7500, '2026-10-06'), m('gasto', 500, '2026-10-06', { cuenta_id: null, created_at: '2026-10-06T11:00:00Z' })])
    expect(s.disponible).toBe(0)
  })

  it('un gasto mayor al saldo solo consume lo que había (el resto es propio)', () => {
    const s = calcularSaldoTerceros([m('ingreso', 10000, '2026-10-01'), m('gasto', 15000, '2026-10-02')])
    expect(s).toMatchObject({ disponible: 0, absorbidoPropio: 5000 })
  })

  it('el orden es cronológico aunque lleguen desordenados, y desempata por created_at', () => {
    const desordenado = [m('gasto', 4000, '2026-10-02'), m('ingreso', 10000, '2026-10-01')]
    expect(calcularSaldoTerceros(desordenado).disponible).toBe(6000)
    const mismoDia = [
      m('gasto', 3000, '2026-10-01', { created_at: '2026-10-01T12:00:00Z' }),
      m('ingreso', 5000, '2026-10-01', { created_at: '2026-10-01T09:00:00Z' }),
    ]
    expect(calcularSaldoTerceros(mismoDia).disponible).toBe(2000)
  })

  it('ignora los movimientos que no son de terceros', () => {
    expect(calcularSaldoTerceros([{ tipo: 'ingreso', monto: 999, fecha: '2026-10-01', fondos_tercero: false }]).disponible).toBe(0)
  })

  it('sin movimientos: todo en cero', () => {
    expect(calcularSaldoTerceros([])).toEqual({ fondos: 0, gastadoTerceros: 0, disponible: 0, absorbidoPropio: 0, primaryCuentaId: null })
  })

  it('sobranteTrasPago nunca es negativo', () => {
    expect(sobranteTrasPago(5000, 7500)).toBe(0)
    expect(sobranteTrasPago(8000, 8000)).toBe(0)
  })
})

import { montoParaMi } from '../utils/saldoTerceros'

describe('montoParaMi (cuánto del sobrante pasa a mi dinero)', () => {
  it('un monto válido se respeta', () => expect(montoParaMi('300', 500)).toBe(300))
  it('no puede superar el sobrante', () => expect(montoParaMi(900, 500)).toBe(500))
  it('vacío, cero, negativo o texto inválido = 0 (no pasa nada a mi dinero)', () => {
    expect(montoParaMi('', 500)).toBe(0)
    expect(montoParaMi('0', 500)).toBe(0)
    expect(montoParaMi('-50', 500)).toBe(0)
    expect(montoParaMi('abc', 500)).toBe(0)
  })
  it('acepta puntos de miles escritos a mano y redondea', () => expect(montoParaMi('1.5', 500)).toBe(2))
  it('con sobrante 0 siempre es 0', () => expect(montoParaMi(100, 0)).toBe(0))
})
