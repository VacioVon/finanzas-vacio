import { describe, it, expect } from 'vitest'
import { resolverEdicion, deudasInvolucradas } from '../utils/movimientosEdicion'
import type { Movimiento, MovimientoFormData } from '../types/app.types'

function mov(o: Partial<Movimiento>): Movimiento {
  return {
    id: 'm1', tipo: 'gasto', fecha: '2026-09-03', monto: 57781, cuenta_id: 'c1', cuenta_destino_id: null,
    objetivo_ahorro_id: null, deuda_id: null, para_tercero: false, tercero_nombre: null, ...o,
  } as Movimiento
}
function form(o: Partial<MovimientoFormData>): MovimientoFormData {
  return { tipo: 'gasto', fecha: '2026-09-03', monto: 57781, cuenta_id: 'c1', ...o } as MovimientoFormData
}

describe('resolverEdicion', () => {
  const pago = mov({ tipo: 'pago_deuda', deuda_id: 'deuda1' })

  it('cambiar solo la fecha de un pago de deuda NO es un cambio financiero', () => {
    const r = resolverEdicion(pago, form({ tipo: 'pago_deuda', fecha: '2026-09-05', deuda_id: 'deuda1' }))
    expect(r.cambioFinanciero).toBe(false)
    expect(r.deudaNueva).toBe('deuda1')
  })

  it('el formulario no recuerda la deuda (undefined): se CONSERVA el vínculo', () => {
    const r = resolverEdicion(pago, form({ tipo: 'pago_deuda', deuda_id: undefined }))
    expect(r.deudaNueva).toBe('deuda1')
    expect(r.cambioFinanciero).toBe(false)
  })

  it('cambiar el monto sí es financiero', () => {
    expect(resolverEdicion(pago, form({ tipo: 'pago_deuda', deuda_id: 'deuda1', monto: 60000 })).cambioFinanciero).toBe(true)
  })

  it('cambiar la cuenta o la deuda es financiero', () => {
    expect(resolverEdicion(pago, form({ tipo: 'pago_deuda', deuda_id: 'deuda1', cuenta_id: 'c2' })).cambioFinanciero).toBe(true)
    expect(resolverEdicion(pago, form({ tipo: 'pago_deuda', deuda_id: 'deuda2' })).cambioFinanciero).toBe(true)
  })

  it('un gasto para tercero conserva para_tercero y el nombre al editar', () => {
    const g = mov({ para_tercero: true, tercero_nombre: 'Suegra', monto: 22900 })
    const r = resolverEdicion(g, form({ monto: 22900, fecha: '2026-09-10' }))
    expect(r.paraTercero).toBe(true)
    expect(r.terceroNombre).toBe('Suegra')
    expect(r.cambioFinanciero).toBe(false)
  })

  it('si el movimiento deja de ser pago de deuda, la deuda se desvincula', () => {
    expect(resolverEdicion(pago, form({ tipo: 'gasto' })).deudaNueva).toBeNull()
  })

  it('un gasto normal editado solo en nota/categoría no recalcula saldos', () => {
    const g = mov({ monto: 5000 })
    expect(resolverEdicion(g, form({ monto: 5000, nota: 'x', categoria_id: 'cat' })).cambioFinanciero).toBe(false)
  })

  it('el monto se compara como número (string vs number)', () => {
    expect(resolverEdicion(mov({ monto: 5000 }), form({ monto: '5000' as unknown as number })).cambioFinanciero).toBe(false)
  })

  it('deudasInvolucradas devuelve la original y la nueva sin duplicar', () => {
    expect(deudasInvolucradas(pago, 'deuda1')).toEqual(['deuda1'])
    expect(deudasInvolucradas(pago, 'deuda2').sort()).toEqual(['deuda1', 'deuda2'])
    expect(deudasInvolucradas(mov({}), null)).toEqual([])
  })
})
