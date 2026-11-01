import { describe, it, expect } from 'vitest'
import { montoSegundaParte, validarPagoDividido, partesDePago } from '@/utils/pagoDividido'

const efectivo = { id: 'e', tipo: 'efectivo', activa: true } as const
const debito   = { id: 'd', tipo: 'debito',   activa: true } as const
const tarjeta  = { id: 't', tipo: 'credito',  activa: true } as const

describe('pago dividido', () => {
  it('arena de gatos: 18.000 = 8.000 efectivo + 10.000 débito', () => {
    expect(montoSegundaParte(18000, 8000)).toBe(10000)
    expect(partesDePago(18000, 'e', 8000, 'd')).toEqual([{ cuentaId: 'e', monto: 8000 }, { cuentaId: 'd', monto: 10000 }])
    expect(validarPagoDividido(18000, 8000, efectivo, debito)).toBeNull()
  })
  it('las dos partes siempre suman el total', () => {
    const [a, b] = partesDePago(12345, 'e', 5000, 'd')
    expect(a.monto + b.monto).toBe(12345)
  })
  it('rechaza la misma cuenta, tarjeta de crédito, montos fuera de rango', () => {
    expect(validarPagoDividido(18000, 8000, efectivo, efectivo)).toMatch(/distintas/)
    expect(validarPagoDividido(18000, 8000, efectivo, tarjeta)).toMatch(/tarjeta/)
    expect(validarPagoDividido(18000, 0, efectivo, debito)).toMatch(/mayor a 0/)
    expect(validarPagoDividido(18000, 18000, efectivo, debito)).toMatch(/menor al total/)
    expect(validarPagoDividido(18000, 20000, efectivo, debito)).toMatch(/menor al total/)
    expect(validarPagoDividido(0, 0, efectivo, debito)).toMatch(/total/)
  })
  it('exige elegir ambas cuentas e ignora cuentas inactivas', () => {
    expect(validarPagoDividido(18000, 8000, null, debito)).toMatch(/primera/)
    expect(validarPagoDividido(18000, 8000, efectivo, undefined)).toMatch(/segunda/)
    expect(validarPagoDividido(18000, 8000, efectivo, { ...debito, activa: false })).toMatch(/inactiva/)
  })
  it('segunda parte nunca es negativa', () => {
    expect(montoSegundaParte(1000, 5000)).toBe(0)
  })
})
