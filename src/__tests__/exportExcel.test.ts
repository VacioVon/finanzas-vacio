import { describe, it, expect } from 'vitest'
import { construirLibro, generarXlsx, periodoDe, clasificar, type DatosExport } from '../utils/exportExcel'
import type { Movimiento, GastoCompartido, CuentaPorCobrar } from '../types/app.types'

function mov(o: Partial<Movimiento>): Movimiento {
  return {
    id: 'm', tipo: 'gasto', fecha: '2026-10-01', monto: 0, comision: 0, para_tercero: false, fondos_tercero: false,
    cuenta_id: 'c1', created_at: '2026-10-01T10:00:00Z', saldo_anterior: null, ...o,
  } as Movimiento
}
const cat = (nombre: string) => ({ id: nombre, nombre }) as Movimiento['categoria']

const compartido: GastoCompartido = {
  id: 'g1', movimiento_id: 'combustible', usuario_id: 'u', monto_total: 40_000, monto_usuario: 25_000,
  participantes: [{ nombre: 'Suegra', monto: 15_000, cobrar_id: 'cb1' }], descripcion: 'Combustible', created_at: '',
}
const cobrar: CuentaPorCobrar = {
  id: 'cb1', usuario_id: 'u', movimiento_origen_id: 'combustible', persona: 'Suegra', descripcion: 'Gasto compartido: Combustible',
  monto_original: 15_000, monto_pagado: 10_000, fecha: '2026-10-01', fecha_vencimiento: null, estado: 'pendiente',
  nota: null, created_at: '', updated_at: '',
}

const datos: DatosExport = {
  movimientos: [
    mov({ id: 'sueldo', tipo: 'ingreso', fecha: '2026-09-28', monto: 150_000, categoria: cat('Sueldo') }),
    mov({ id: 'combustible', tipo: 'gasto', fecha: '2026-10-01', monto: 40_000, categoria: cat('Vehículo'), subcategoria: { id: 's', nombre: 'Combustible' } as Movimiento['subcategoria'], nota: 'Bencina palomo', cuenta: { nombre: 'Banco Falabella Débito', tipo: 'debito' } as Movimiento['cuenta'] }),
    mov({ id: 'reemb', tipo: 'ingreso', fecha: '2026-10-02', monto: 10_000, categoria: cat('Recuperación de dinero') }),
    mov({ id: 'transf', tipo: 'transferencia', fecha: '2026-10-03', monto: 15_000 }),
    mov({ id: 'hist', tipo: 'pago_deuda', fecha: '2026-10-03', monto: 1_464_000, cuenta_id: null }),
    mov({ id: 'tercero', tipo: 'gasto', fecha: '2026-10-04', monto: 9_000, para_tercero: true, tercero_nombre: 'Víctor', categoria: cat('Alimentación') }),
    mov({ id: 'fuera', tipo: 'gasto', fecha: '2026-08-01', monto: 5_000, categoria: cat('Hogar') }),
  ],
  cuentas: [], deudas: [], compartidos: [compartido], cobrar: [cobrar], presupuestos: [], compromisos: [],
  fechaSueldo: 28, desde: '2026-09-01', hasta: '2026-10-31', generado: new Date(2026, 9, 1),
}

describe('exportación a Excel', () => {
  it('período presupuestal: el día de sueldo (28) abre el período del mes siguiente', () => {
    expect(periodoDe('2026-09-28', 28).clave).toBe('2026-10')
    expect(periodoDe('2026-10-01', 28).clave).toBe('2026-10')
    expect(periodoDe('2026-10-28', 28).clave).toBe('2026-11')
    expect(periodoDe('2026-12-30', 28).clave).toBe('2027-01')
    expect(periodoDe('2026-10-28', 1).clave).toBe('2026-10')
  })

  it('clasifica cada tipo sin confundir reembolsos, transferencias ni pagos de deuda', () => {
    const c = Object.fromEntries(datos.movimientos.map(m => [m.id, clasificar(m)]))
    expect(c.sueldo).toBe('Ingreso personal')
    expect(c.reemb).toBe('Reembolso / dinero recuperado (no es ingreso)')
    expect(c.transf).toBe('Transferencia entre mis cuentas')
    expect(c.hist).toBe('Pago de deuda')
    expect(c.tercero).toBe('Gasto para tercero (excluido de mi gasto)')
    expect(c.combustible).toBe('Gasto personal')
  })

  const hojas = construirLibro(datos)
  const por = (n: string) => hojas.find(h => h.nombre === n)!

  it('respeta el rango de fechas y conserva comentario, categoría, subcategoría y tarjeta', () => {
    const f = por('Movimientos').filas
    expect(f.length).toBe(6)                       // el movimiento de agosto queda fuera
    const c = f.find(x => x.cat === 'Vehículo')!
    expect(c).toMatchObject({ sub: 'Combustible', nota: 'Bencina palomo', cuenta: 'Banco Falabella Débito', monto: 40_000 })
  })

  it('gasto compartido: bruto 40.000, reembolso recibido 10.000, neto 30.000, pendiente 5.000', () => {
    const c = por('Movimientos').filas.find(x => x.cat === 'Vehículo')!
    expect(c).toMatchObject({ compartido: 'Sí', totalComp: 40_000, miParte: 25_000, reembolso: 10_000, pendiente: 5_000, neto: 30_000 })
  })

  it('resumen: reembolso y transferencia no son ingreso; el gasto no se duplica', () => {
    const r = por('Resumen por período').filas.find(x => String(x.periodo).startsWith('Octubre 2026'))!
    expect(r.ingresos).toBe(150_000)               // solo el sueldo (28-09 cae en el período de octubre)
    expect(r.bruto).toBe(40_000)
    expect(r.reemb).toBe(10_000)
    expect(r.neto).toBe(30_000)
    expect(r.flujo).toBe(120_000)
    expect(r.deuda).toBe(1_464_000)
    expect(r.tercero).toBe(9_000)
  })

  it('gasto por categoría suma el neto del período', () => {
    const g = por('Gasto por categoría').filas
    expect(g).toHaveLength(1)
    expect(g[0]).toMatchObject({ cat: 'Vehículo', sub: 'Combustible', bruto: 40_000, neto: 30_000, pct: 1 })
  })

  it('el pago histórico sin cuenta se marca como tal', () => {
    const h = por('Movimientos').filas.find(x => x.tipo === 'Pago de deuda')!
    expect(h.cuenta).toBe('(pago histórico, sin cuenta)')
  })

  it('genera un .xlsx válido que se puede leer de vuelta con todas las hojas', async () => {
    const blob = await generarXlsx(hojas)
    expect(blob.size).toBeGreaterThan(2000)
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await blob.arrayBuffer())
    expect(wb.worksheets.map(w => w.name)).toEqual(
      ['Léeme', 'Movimientos', 'Resumen por período', 'Gasto por categoría', 'Presupuesto vs real', 'Cuentas', 'Deudas', 'Por cobrar'])
    const ws = wb.getWorksheet('Movimientos')!
    expect(ws.getRow(1).getCell(8).value).toBe('Comentario')
    const fila = ws.getRow(3)                      // sueldo(28-09) es la fila 2; combustible es la 3
    expect(fila.getCell(9).value).toBe(40_000)
    expect(fila.getCell(8).value).toBe('Bencina palomo')
  })
})
