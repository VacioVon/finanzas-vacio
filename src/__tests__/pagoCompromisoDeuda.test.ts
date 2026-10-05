import { describe, it, expect } from 'vitest'
import {
  deudasPagablesDeTarjeta, nombresSeParecen, validarPagoConDeuda, resumenPagoConDeuda,
} from '../utils/pagoCompromisoDeuda'
import type { Cuenta, Deuda } from '../types/app.types'

function cuenta(o: Partial<Cuenta>): Cuenta {
  return { id: 'c', nombre: 'X', tipo: 'debito', saldo_actual: 0, activa: true, ...o } as Cuenta
}
function deuda(o: Partial<Deuda> & { pendiente?: number }): Deuda {
  const total = o.monto_total ?? 43290
  const pend = o.pendiente ?? total
  return {
    id: 'd', nombre: 'Deuda', estado: 'activa', cuenta_id: 'cmr', cuota_mensual: null, monto_total: total,
    monto_pendiente: 0, monto_pagado_real: total - pend, monto_pendiente_real: pend, ...o,
  } as Deuda
}

const cuentas = [cuenta({ id: 'cmr', tipo: 'credito', nombre: 'CMR' }), cuenta({ id: 'deb', tipo: 'debito' })]

describe('nombresSeParecen', () => {
  it('"Comida gaticas" ↔ "Comida gatos" comparten "comida"', () => {
    expect(nombresSeParecen('Comida gaticas', 'Comida gatos')).toBe(true)
  })
  it('ignora tildes y mayúsculas', () => {
    expect(nombresSeParecen('Pastillas Amor', 'pastíllas amor')).toBe(true)
  })
  it('nombres sin palabras en común no coinciden', () => {
    expect(nombresSeParecen('Spotify Diego', 'Frutilla con crema')).toBe(false)
  })
  it('palabras cortas (de, con, la) no cuentan', () => {
    expect(nombresSeParecen('Pago de luz', 'Frutilla con crema de la casa')).toBe(false)
  })
})

describe('deudasPagablesDeTarjeta', () => {
  const ds = [
    deuda({ id: 'a', nombre: 'Deuda Diego', pendiente: 155346, monto_total: 233019, cuota_mensual: 77673 }),
    deuda({ id: 'b', nombre: 'Comida gatos', pendiente: 43290, cuota_mensual: 14430 }),
    deuda({ id: 'c', nombre: 'Deuda auto', cuenta_id: null, pendiente: 2535181 }),        // sin tarjeta
    deuda({ id: 'd', nombre: 'Pagada', estado: 'pagada', pendiente: 0 }),                  // pagada
    deuda({ id: 'e', nombre: 'Me deben', direccion: 'me_deben', pendiente: 5000 }),        // no es mía
    deuda({ id: 'f', nombre: 'Saldada', pendiente: 0 }),                                   // sin saldo
    deuda({ id: 'g', nombre: 'Otra tarjeta', cuenta_id: 'deb', pendiente: 100 }),          // ligada a débito
  ]
  it('solo deudas activas, mías, con saldo y ligadas a una tarjeta', () => {
    expect(deudasPagablesDeTarjeta(ds, cuentas, 'Otro').map(x => x.deuda.id).sort()).toEqual(['a', 'b'])
  })
  it('la que coincide con el compromiso va primero', () => {
    expect(deudasPagablesDeTarjeta(ds, cuentas, 'Comida gaticas').map(x => x.deuda.id)).toEqual(['b', 'a'])
  })
  it('cuota sugerida = cuota; la última se ajusta al saldo; cuotas restantes del plan', () => {
    const r = deudasPagablesDeTarjeta(ds, cuentas, 'Comida gaticas')
    expect(r[0]).toMatchObject({ pendiente: 43290, cuotaSugerida: 14430, cuotasRestantes: 3 })
    const ultima = deudasPagablesDeTarjeta([deuda({ id: 'z', pendiente: 9000, cuota_mensual: 14430 })], cuentas, 'x')[0]
    expect(ultima).toMatchObject({ cuotaSugerida: 9000, cuotasRestantes: 1 })
  })
  it('una tarjeta inactiva no aparece', () => {
    expect(deudasPagablesDeTarjeta(ds, [cuenta({ id: 'cmr', tipo: 'credito', activa: false })], 'x')).toHaveLength(0)
  })
})

describe('validarPagoConDeuda', () => {
  const debito = cuenta({ tipo: 'debito' })
  it('pago válido', () => expect(validarPagoConDeuda(43290, 14430, debito)).toBeNull())
  it('no se puede pagar con la tarjeta ni con inversión', () => {
    expect(validarPagoConDeuda(43290, 14430, cuenta({ tipo: 'credito' }))).toMatch(/misma tarjeta/)
    expect(validarPagoConDeuda(43290, 14430, cuenta({ tipo: 'inversion' }))).not.toBeNull()
  })
  it('monto 0, negativo o mayor al pendiente es inválido', () => {
    expect(validarPagoConDeuda(43290, 0, debito)).not.toBeNull()
    expect(validarPagoConDeuda(43290, -5, debito)).not.toBeNull()
    expect(validarPagoConDeuda(43290, 43291, debito)).toMatch(/superar/)
  })
  it('pagar exactamente el pendiente es válido', () => expect(validarPagoConDeuda(43290, 43290, debito)).toBeNull())
  it('sin cuenta o cuenta inactiva es inválido', () => {
    expect(validarPagoConDeuda(100, 10, null)).not.toBeNull()
    expect(validarPagoConDeuda(100, 10, cuenta({ activa: false }))).not.toBeNull()
  })
})

describe('resumenPagoConDeuda (ejemplo real: comida $43.290 en 3 cuotas de $14.430)', () => {
  it('pagar una cuota deja 28.860 pendiente y 2 cuotas', () => {
    const r = resumenPagoConDeuda(43290, 14430, 14430)
    expect(r.pendienteDespues).toBe(28860)
    expect(r.plan).toMatchObject({ cuotasRestantes: 2, montoUltima: 14430 })
    expect(r.saldaLaDeuda).toBe(false)
  })
  it('pagar $25.000 de golpe: queda 18.290 → 2 cuotas, la última de 3.860', () => {
    const r = resumenPagoConDeuda(43290, 25000, 14430)
    expect(r.pendienteDespues).toBe(18290)
    expect(r.plan).toMatchObject({ cuotasRestantes: 2, cuotasCompletas: 1, montoUltima: 3860 })
  })
  it('la última cuota salda la deuda y no deja plan', () => {
    const r = resumenPagoConDeuda(14430, 14430, 14430)
    expect(r).toMatchObject({ pendienteDespues: 0, saldaLaDeuda: true, plan: null })
  })
})
