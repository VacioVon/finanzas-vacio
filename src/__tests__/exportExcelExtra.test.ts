import { describe, it, expect } from 'vitest'
import { construirLibro, generarXlsx, type DatosExport } from '../utils/exportExcel'
import { vecesPorMes, montoMensualEquivalente, calcularPanorama, type DatosExtra } from '../utils/exportExcelExtra'
import type { Cuenta, Deuda, Movimiento, Suscripcion } from '../types/app.types'
import type { IngresoRecurrente } from '../types/ingresos-recurrentes.types'

const cuenta = (o: Partial<Cuenta>): Cuenta => ({ id: 'c', nombre: 'X', tipo: 'debito', saldo_actual: 0, saldo_inicial: 0, activa: true, limite: null, ...o }) as Cuenta
const deuda = (o: Partial<Deuda> & { pend?: number }): Deuda => {
  const total = o.monto_total ?? 100000, pend = o.pend ?? total
  return { id: 'd', nombre: 'Deuda', estado: 'activa', cuenta_id: null, cuota_mensual: null, interes: 0, monto_total: total,
    monto_pendiente: 0, monto_pagado_real: total - pend, monto_pendiente_real: pend, prestamista_nombre: null, ...o } as Deuda
}
const comp = (o: Partial<Suscripcion>): Suscripcion => ({ id: 's', nombre: 'Comp', monto: 0, frecuencia: 'mensual', activa: true, tipo: 'servicio', monto_tipo: 'fijo',
  proxima_fecha: '2026-10-10', ultimo_pago_fecha: null, dia_cobro: 10, fecha_fin: null, nota: null, ...o }) as Suscripcion
const ingreso = (o: Partial<IngresoRecurrente>): IngresoRecurrente => ({ id: 'i', nombre: 'Sueldo', monto_esperado: 0, frecuencia: 'mensual', dia_esperado: 28,
  tolerancia_dias: 2, tipo_fecha: 'aproximado', activo: true, nota: null, fuente_nombre: null, cuenta_nombre: null, ...o }) as IngresoRecurrente

function datos(extra: Partial<DatosExtra>, o: Partial<DatosExport> = {}): DatosExport {
  return {
    movimientos: [], cuentas: [cuenta({ id: 'cmr', tipo: 'credito', saldo_actual: -526779, nombre: 'CMR' }), cuenta({ id: 'deb', saldo_actual: 37735 })],
    deudas: [], compartidos: [], cobrar: [], presupuestos: [], compromisos: [], fechaSueldo: 28, desde: null, hasta: null,
    generado: new Date(2026, 9, 5),
    extra: { suscripciones: [], fuentesIngreso: [], ingresosRecurrentes: [], ingresosEsperados: [], objetivos: [], cuotas: [], valorizaciones: [], ...extra },
    ...o,
  }
}

describe('equivalente mensual', () => {
  it('lleva cada frecuencia a un mes promedio', () => {
    expect(vecesPorMes('mensual')).toBe(1)
    expect(vecesPorMes('quincenal')).toBe(2)
    expect(vecesPorMes('bimestral')).toBe(0.5)
    expect(vecesPorMes('anual')).toBeCloseTo(1 / 12)
    expect(montoMensualEquivalente(18000, 'bimestral')).toBe(9000)   // arena de gatos
    expect(montoMensualEquivalente(120000, 'anual')).toBe(10000)
    expect(montoMensualEquivalente(1000, 'semanal')).toBe(4333)
  })
})

describe('panorama mensual', () => {
  const extra: Partial<DatosExtra> = {
    ingresosRecurrentes: [ingreso({ monto_esperado: 150000, dia_esperado: 15 }), ingreso({ id: 'i2', nombre: 'Pago principal', monto_esperado: 650000 })],
    suscripciones: [
      comp({ id: 's1', nombre: 'Claude Pro', monto: 22182 }),
      comp({ id: 's2', nombre: 'Comida gaticas', monto: 25000, tipo: 'mascotas' }),
      comp({ id: 's3', nombre: 'Arena gaticas', monto: 18000, frecuencia: 'bimestral', tipo: 'mascotas' }),
      comp({ id: 's4', nombre: 'Pausado', monto: 99999, activa: false }),
    ],
  }
  const ds = [
    deuda({ id: 'a', nombre: 'Deuda auto Suegrita', monto_total: 4000000, pend: 2535181, cuota_mensual: 150000, prestamista_nombre: 'Suegra' }),
    deuda({ id: 'b', nombre: 'Comida gatos', monto_total: 43290, cuota_mensual: 14430, cuenta_id: 'cmr' }),
    deuda({ id: 'c', nombre: 'Linterna papa', monto_total: 21590 }),                         // sin cuota
    deuda({ id: 'd', nombre: 'Pagada', estado: 'pagada', pend: 0, cuota_mensual: 5000 }),     // no cuenta
  ]
  it('ingreso 800.000, compromisos activos y cuotas de deudas activas', () => {
    const p = calcularPanorama(datos(extra, { deudas: ds }), extra as DatosExtra)
    expect(p.ingresoEsperado).toBe(800000)
    expect(p.compromisos).toBe(22182 + 25000 + 9000)      // el pausado no cuenta; la arena bimestral = 9.000/mes
    expect(p.cuotasDeuda).toBe(150000 + 14430)             // sin la deuda sin cuota ni la pagada
    expect(p.margen).toBe(800000 - 56182 - 164430)
    expect(p.comprometidoPct).toBeCloseTo((56182 + 164430) / 800000)
  })
  it('avisa del posible doble conteo entre un compromiso y una deuda de tarjeta', () => {
    const p = calcularPanorama(datos(extra, { deudas: ds }), extra as DatosExtra)
    expect(p.solapamientos).toEqual(['Comida gaticas ↔ Comida gatos'])
  })
  it('sin ingresos configurados no divide por cero', () => {
    const d0 = datos({ suscripciones: [comp({ monto: 1000 })] })
    const p = calcularPanorama(d0, d0.extra!)
    expect(p.comprometidoPct).toBeNull()
  })
})

describe('libro completo con datos extra', () => {
  const extra: Partial<DatosExtra> = {
    ingresosRecurrentes: [ingreso({ monto_esperado: 800000, fuente_nombre: 'Sueldo mensual' })],
    suscripciones: [comp({ nombre: 'Spotify', monto: 2700, categoria: { nombre: 'Aplicaciones' } as Suscripcion['categoria'] })],
  }
  const movs = [
    { id: 'p1', tipo: 'pago_deuda', fecha: '2026-09-03', monto: 57781, cuenta_id: 'deb', deuda_id: 'a', compromiso_id: 's',
      cuenta: { nombre: 'Falabella' }, contexto_pago: 'deuda_propia', comision: 0, created_at: '2026-09-03', para_tercero: false, fondos_tercero: false } as unknown as Movimiento,
  ]
  const d = datos(extra, {
    movimientos: movs, compromisos: [{ id: 's', nombre: 'Comida gaticas' }],
    deudas: [deuda({ id: 'a', nombre: 'Deuda Mama', monto_total: 231124, pend: 173343, cuota_mensual: 57781, cuenta_id: 'cmr', prestamista_nombre: 'Mamá' })],
  })
  const hojas = construirLibro(d)
  const por = (n: string) => hojas.find(h => h.nombre === n)!

  it('incluye las hojas nuevas y omite las vacías (objetivos, cuotas, inversiones)', () => {
    const nombres = hojas.map(h => h.nombre)
    expect(nombres).toEqual(expect.arrayContaining(['Panorama mensual', 'Deudas', 'Pagos de deuda', 'Compromisos', 'Ingresos recurrentes', 'Ingresos esperados', 'Por cobrar']))
    expect(nombres).not.toContain('Objetivos de ahorro')
    expect(nombres).not.toContain('Cuotas de tarjeta')
  })
  it('Deudas dice de quién es, a qué tarjeta está ligada y cuántas cuotas faltan', () => {
    expect(por('Deudas').filas[0]).toMatchObject({ persona: 'Mamá', tarjeta: 'CMR', pend: 173343, restantes: 3, npagos: 1, ultMonto: 57781, compromiso: 'Comida gaticas' })
  })
  it('una deuda sin persona indicada se marca explícitamente', () => {
    const h = construirLibro(datos({}, { deudas: [deuda({ nombre: 'Linterna' })] }))
    expect(h.find(x => x.nombre === 'Deudas')!.filas[0].persona).toBe('(sin indicar)')
  })
  it('Pagos de deuda lista cada abono con su compromiso', () => {
    expect(por('Pagos de deuda').filas[0]).toMatchObject({ deuda: 'Deuda Mama', persona: 'Mamá', monto: 57781, cuenta: 'Falabella', compromiso: 'Comida gaticas', contexto: 'Deuda propia' })
  })
  it('Compromisos trae el equivalente mensual y la categoría', () => {
    expect(por('Compromisos').filas[0]).toMatchObject({ nombre: 'Spotify', cat: 'Aplicaciones', mensual: 2700, estado: 'Activo' })
  })
  it('el Panorama incluye el patrimonio sin duplicar la deuda ligada a la tarjeta', () => {
    const f = por('Panorama mensual').filas
    expect(f.find(x => x.concepto === 'Ingreso mensual esperado')!.monto).toBe(800000)
    expect(f.find(x => x.concepto === 'Pasivos')!.monto).toBe(526779)   // solo la tarjeta; la Deuda Mamá está dentro
  })
  it('se genera un .xlsx válido y legible con todas las hojas', async () => {
    const blob = await generarXlsx(hojas)
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await blob.arrayBuffer())
    expect(wb.worksheets.map(w => w.name)).toEqual(hojas.map(h => h.nombre))
  })
})
