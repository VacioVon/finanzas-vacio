import { describe, it, expect } from 'vitest'
import { agruparDeudasPagables, describirPago, opcionesRapidas, validarPagoMultiple, totalLineas } from '../utils/pagoVariasDeudas'
import type { Cuenta, Deuda } from '../types/app.types'

const cuenta = (o: Partial<Cuenta>): Cuenta => ({ id: 'c', nombre: 'X', tipo: 'debito', activa: true, saldo_actual: 0, ...o }) as Cuenta
const deuda = (o: Partial<Deuda> & { pend?: number }): Deuda => {
  const total = o.monto_total ?? 100000, pend = o.pend ?? total
  return { id: 'd', nombre: 'Deuda', estado: 'activa', cuenta_id: null, cuota_mensual: null, monto_total: total,
    monto_pagado_real: total - pend, monto_pendiente_real: pend, monto_pendiente: 0, ...o } as Deuda
}
const cuentas = [cuenta({ id: 'cmr', tipo: 'credito', nombre: 'Cmr Falabella ' }), cuenta({ id: 'deb' })]

describe('agruparDeudasPagables', () => {
  const ds = [
    deuda({ id: 'a', nombre: 'Deuda Diego', cuenta_id: 'cmr', pend: 155346, monto_total: 233019, cuota_mensual: 77673 }),
    deuda({ id: 'b', nombre: 'Comida gatos', cuenta_id: 'cmr', monto_total: 43290, pend: 43290, cuota_mensual: 14430, fecha_prox_pago: '2026-10-10' }),
    deuda({ id: 'c', nombre: 'Deuda auto', pend: 2535181, monto_total: 4000000, cuota_mensual: 150000 }),
    deuda({ id: 'd', nombre: 'Pagada', estado: 'pagada', pend: 0 }),
    deuda({ id: 'e', nombre: 'Me deben', direccion: 'me_deben', pend: 1000 }),
    deuda({ id: 'f', nombre: 'Saldada', pend: 0 }),
  ]
  it('separa las deudas de la tarjeta de las otras y deja fuera pagadas, "me deben" y saldadas', () => {
    const g = agruparDeudasPagables(ds, cuentas)
    expect(g.map(x => x.titulo)).toEqual(['Tarjeta Cmr Falabella', 'Otras deudas'])
    expect(g[0].items.map(i => i.deuda.id).sort()).toEqual(['a', 'b'])
    expect(g[1].items.map(i => i.deuda.id)).toEqual(['c'])
  })
  it('trae cuota sugerida, cuotas restantes y % pagado', () => {
    const b = agruparDeudasPagables(ds, cuentas)[0].items.find(i => i.deuda.id === 'b')!
    expect(b).toMatchObject({ pendiente: 43290, cuota: 14430, cuotaSugerida: 14430, cuotasRestantes: 3, pagadoPct: 0 })
    const a = agruparDeudasPagables(ds, cuentas)[0].items.find(i => i.deuda.id === 'a')!
    expect(a.cuotasRestantes).toBe(2)
    expect(a.pagadoPct).toBeCloseTo(77673 / 233019)
  })
  it('una deuda sin cuota definida tiene cuotasRestantes null y sugiere todo lo pendiente', () => {
    const g = agruparDeudasPagables([deuda({ id: 'z', pend: 11220 })], cuentas)
    expect(g[0].items[0]).toMatchObject({ cuota: null, cuotasRestantes: null, cuotaSugerida: 11220 })
  })
  it('ordena por próxima fecha de pago', () => {
    const g = agruparDeudasPagables([
      deuda({ id: 'x', nombre: 'B', cuenta_id: 'cmr', fecha_prox_pago: '2026-11-05' }),
      deuda({ id: 'y', nombre: 'A', cuenta_id: 'cmr', fecha_prox_pago: '2026-10-05' }),
    ], cuentas)
    expect(g[0].items.map(i => i.deuda.id)).toEqual(['y', 'x'])
  })
})

describe('describirPago (comida $43.290 en cuotas de $14.430)', () => {
  it('1 cuota completa', () => expect(describirPago(43290, 14430, 14430)).toMatchObject({ texto: '1 cuota completa · quedan 2', cuotasCompletas: 1, pendienteDespues: 28860, cuotasRestantesDespues: 2 }))
  it('2 cuotas completas', () => expect(describirPago(43290, 28860, 14430).texto).toBe('2 cuotas completas · quedan 1'))
  it('$25.000 = 1 cuota + parte de la siguiente', () => expect(describirPago(43290, 25000, 14430).texto).toBe('1 cuota + $10.570 de la siguiente · quedan 2'))
  it('menos de una cuota es abono parcial', () => expect(describirPago(43290, 5000, 14430).texto).toMatch(/^Abono parcial \(35% de una cuota\)/))
  it('pagar todo salda la deuda e indica cuántas cuotas quedaban', () => {
    expect(describirPago(43290, 43290, 14430)).toMatchObject({ texto: 'Salda la deuda (quedaban 3 cuotas)', saldaLaDeuda: true, pendienteDespues: 0 })
    expect(describirPago(14430, 14430, 14430)).toMatchObject({ texto: 'Salda la deuda', saldaLaDeuda: true })
  })
  it('sin cuota definida es un abono libre', () => expect(describirPago(11220, 5000, null).texto).toBe('Abono libre · quedan $6.220'))
  it('monto 0 o mayor al pendiente se acota', () => {
    expect(describirPago(1000, 0, 500).texto).toBe('Sin pago')
    expect(describirPago(1000, 9999, 500).saldaLaDeuda).toBe(true)
  })
  it('la última cuota se ajusta sola (pendiente 20.000, cuota 14.430)', () => {
    expect(describirPago(20000, 14430, 14430)).toMatchObject({ pendienteDespues: 5570, cuotasRestantesDespues: 1 })
  })
})

describe('opcionesRapidas', () => {
  it('1 cuota, 2 cuotas y saldar cuando hay varias cuotas', () => {
    expect(opcionesRapidas(43290, 14430)).toEqual([{ etiqueta: '1 cuota', monto: 14430 }, { etiqueta: '2 cuotas', monto: 28860 }, { etiqueta: 'Saldar', monto: 43290 }])
  })
  it('con una sola cuota (o sin cuota) solo ofrece saldar', () => {
    expect(opcionesRapidas(14430, 14430)).toEqual([{ etiqueta: 'Saldar', monto: 14430 }])
    expect(opcionesRapidas(11220, null)).toEqual([{ etiqueta: 'Saldar', monto: 11220 }])
  })
})

describe('validarPagoMultiple y total', () => {
  const ok = { tipo: 'debito', activa: true } as Cuenta
  const l = (monto: number, pendiente = 43290) => ({ deudaId: 'x', nombre: 'Comida', pendiente, monto })
  it('sin errores con datos válidos', () => expect(validarPagoMultiple([l(14430)], ok)).toEqual([]))
  it('exige cuenta, al menos una deuda y rechaza tarjeta como origen', () => {
    expect(validarPagoMultiple([l(1)], null)[0]).toMatch(/cuenta/)
    expect(validarPagoMultiple([], ok)).toContain('Selecciona al menos una deuda')
    expect(validarPagoMultiple([l(1)], { tipo: 'credito', activa: true } as Cuenta)[0]).toMatch(/misma tarjeta/)
  })
  it('rechaza montos en cero, negativos o mayores al pendiente', () => {
    expect(validarPagoMultiple([l(0)], ok)[0]).toMatch(/mayor a 0/)
    expect(validarPagoMultiple([l(43291)], ok)[0]).toMatch(/más de lo pendiente/)
  })
  it('totalLineas suma solo montos positivos: caso real 155.164', () => {
    expect(totalLineas([l(77673), l(57781), l(14430), l(5280), l(-5)])).toBe(155164)
  })
})
