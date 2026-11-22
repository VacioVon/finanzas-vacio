import { describe, it, expect } from 'vitest'
import { repartirPago, resumenTarjetas } from '@/utils/deudasTarjeta'
import type { Cuenta, Deuda } from '@/types/app.types'

const item = (id: string, pendiente: number, cuota: number, prox: string | null = null) =>
  ({ deuda: { id, nombre: `D${id}`, fecha_prox_pago: prox }, pendiente, cuotaSugerida: Math.min(cuota, pendiente) })

describe('repartirPago', () => {
  const items = [item('a', 50000, 10000, '2026-11-10'), item('b', 30000, 8000, '2026-11-05'), item('c', 6000, 6000, '2026-11-20')]

  it('cuotas primero: paga la cuota de cada una y el resto cierra la más chica', () => {
    const r = repartirPago(30000, items, 'cuotas')
    // cuotas: b 8.000 (vence antes), a 10.000, c 6.000 = 24.000; sobran 6.000 → cierra la más chica (c ya está cerrada) → b
    expect(r.lineas.find(l => l.deudaId === 'b')!.monto).toBe(14000)
    expect(r.lineas.find(l => l.deudaId === 'a')!.monto).toBe(10000)
    expect(r.lineas.find(l => l.deudaId === 'c')!.monto).toBe(6000)
    expect(r.asignado).toBe(30000)
    expect(r.sobrante).toBe(0)
  })
  it('monto menor que las cuotas: se alcanza por orden de vencimiento', () => {
    const r = repartirPago(12000, items, 'cuotas')
    expect(r.lineas.map(l => [l.deudaId, l.monto])).toEqual([['a', 4000], ['b', 8000]])
  })
  it('menor saldo: cierra primero la más chica', () => {
    const r = repartirPago(20000, items, 'menor_saldo')
    expect(r.lineas.find(l => l.deudaId === 'c')).toMatchObject({ monto: 6000, pendienteDespues: 0 })
    expect(r.lineas.find(l => l.deudaId === 'b')).toMatchObject({ monto: 14000, pendienteDespues: 16000 })
    expect(r.lineas.find(l => l.deudaId === 'a')).toBeUndefined()
  })
  it('nunca se pasa de lo pendiente y informa el sobrante', () => {
    const r = repartirPago(200000, items, 'cuotas')
    expect(r.asignado).toBe(86000)
    expect(r.sobrante).toBe(114000)
    for (const l of r.lineas) expect(l.pendienteDespues).toBe(0)
  })
  it('monto 0 o negativo no asigna nada', () => {
    expect(repartirPago(0, items, 'cuotas').lineas).toEqual([])
    expect(repartirPago(-5, items, 'cuotas').asignado).toBe(0)
  })
  it('la suma asignada + sobrante siempre es el monto', () => {
    for (const m of [1, 999, 24000, 86000, 90000]) {
      for (const e of ['cuotas', 'menor_saldo'] as const) {
        const r = repartirPago(m, items, e)
        expect(r.asignado + r.sobrante).toBe(m)
      }
    }
  })
})

describe('resumenTarjetas', () => {
  const cmr = { id: 'cmr', nombre: 'CMR ', tipo: 'credito', activa: true } as unknown as Cuenta
  const debito = { id: 'deb', nombre: 'Débito', tipo: 'debito', activa: true } as unknown as Cuenta
  const d = (id: string, cuenta: string | null, total: number, cuota: number): Deuda => ({
    id, nombre: `Deuda ${id}`, cuenta_id: cuenta, monto_total: total, monto_pendiente: total, monto_pendiente_real: total,
    cuota_mensual: cuota, estado: 'activa', direccion: 'debo', fecha_prox_pago: null,
  } as unknown as Deuda)

  it('junta solo las deudas de tarjeta y suma lo pagado en el período', () => {
    const r = resumenTarjetas(
      [d('1', 'cmr', 40000, 10000), d('2', 'cmr', 20000, 5000), d('3', null, 99999, 1000)],
      [cmr, debito],
      [{ deuda_id: '1', monto: 10000 }, { deuda_id: '1', monto: 2000 }, { deuda_id: '3', monto: 500 }]
    )
    expect(r.cantidad).toBe(2)
    expect(r.totalPendiente).toBe(60000)
    expect(r.cuotasDelMes).toBe(15000)
    expect(r.pagadoPeriodo).toBe(12000)
    expect(r.tarjetas[0].nombre.trim()).toBe('CMR')
    expect(r.tarjetas[0].deudas.find(x => x.deuda.id === '1')!.pagadoPeriodo).toBe(12000)
  })
  it('sin deudas de tarjeta devuelve vacío', () => {
    expect(resumenTarjetas([d('3', null, 100, 10)], [cmr], []).tarjetas).toEqual([])
  })
})

describe('resumenTarjetas: lo mío vs. de otras personas', () => {
  const cmr = { id: 'cmr', nombre: 'CMR', tipo: 'credito', activa: true } as unknown as Cuenta
  const d = (id: string, total: number, cuota: number, persona: string | null): Deuda => ({
    id, nombre: `Deuda ${id}`, cuenta_id: 'cmr', monto_total: total, monto_pendiente: total, monto_pendiente_real: total,
    cuota_mensual: cuota, estado: 'activa', direccion: 'debo', fecha_prox_pago: null, prestamista_nombre: persona,
  } as unknown as Deuda)

  it('separa lo tuyo de lo de tu mamá y el total del banco los suma', () => {
    const r = resumenTarjetas([d('1', 60000, 20000, null), d('2', 40000, 10000, '  Mamá '), d('3', 5000, 5000, '')], [cmr], [])
    expect(r.totalMio).toBe(65000)
    expect(r.totalDeOtros).toBe(40000)
    expect(r.totalPendiente).toBe(105000)
    expect(r.cuotasDelMesMio).toBe(25000)
    expect(r.personas).toEqual([{ nombre: 'Mamá', total: 40000 }])
    expect(r.tarjetas[0].deudas.find(x => x.deuda.id === '2')!.deOtro).toBe('Mamá')
    expect(r.tarjetas[0].deudas.find(x => x.deuda.id === '3')!.deOtro).toBeNull()
  })
  it('sin deudas de otros, lo tuyo es el total', () => {
    const r = resumenTarjetas([d('1', 1000, 500, null)], [cmr], [])
    expect(r.totalDeOtros).toBe(0)
    expect(r.totalMio).toBe(r.totalPendiente)
  })
})
