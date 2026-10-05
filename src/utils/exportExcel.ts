import type {
  Movimiento, Cuenta, Deuda, GastoCompartido, CuentaPorCobrar,
} from '@/types/app.types'
import {
  CATEGORIA_RECUPERACION,
  esGastoCompartidoPagadoTotal,
  resumenGastoCompartido,
} from '@/utils/gastosCompartidos'
import { calcularPlanCuotas } from '@/utils/planCuotas'
import { getPeriodoPresupuestal } from '@/utils/periodo'
import {
  hojaDeudas, hojaPagosDeuda, hojaCompromisos, hojaIngresosRecurrentes, hojaIngresosEsperados,
  hojaObjetivos, hojaCuotasTarjeta, hojaInversiones, hojaPanorama, hojaPorCobrarDetalle,
  type DatosExtra,
} from '@/utils/exportExcelExtra'

// ─── Tipos del libro ─────────────────────────────────────────────

export type Formato = 'texto' | 'fecha' | 'clp' | 'pct' | 'entero'

export interface Columna { header: string; key: string; width: number; formato?: Formato }
export interface Hoja {
  nombre:   string
  columnas: Columna[]
  filas:    Record<string, string | number | Date | null>[]
}

export interface PresupuestoExport {
  mes: number; anio: number; categoria_id: string
  monto_presupuestado: number; categoria_nombre: string
}

export interface DatosExport {
  movimientos:  Movimiento[]
  cuentas:      Cuenta[]
  deudas:       Deuda[]
  compartidos:  GastoCompartido[]
  cobrar:       CuentaPorCobrar[]
  presupuestos: PresupuestoExport[]
  compromisos:  { id: string; nombre: string }[]
  fechaSueldo:  number
  desde:        string | null   // YYYY-MM-DD, null = sin límite
  hasta:        string | null
  generado:     Date
  /** Datos adicionales (compromisos, ingresos recurrentes, objetivos…). Si falta, solo salen las hojas base. */
  extra?:       DatosExtra
}

export const CAT_AJUSTE   = 'Ajuste de dinero'
export const CAT_PRESTAMO = 'Préstamos'

// ─── Clasificación para análisis ─────────────────────────────────

export type Clasificacion =
  | 'Ingreso personal'
  | 'Reembolso / dinero recuperado (no es ingreso)'
  | 'Dinero de terceros (no es ingreso)'
  | 'Ajuste de saldo (no es ingreso)'
  | 'Gasto personal'
  | 'Gasto para tercero (excluido de mi gasto)'
  | 'Transferencia entre mis cuentas'
  | 'Pago de deuda'
  | 'Pago de tarjeta de crédito'
  | 'Ahorro'

export function clasificar(m: Movimiento): Clasificacion {
  const cat = m.categoria?.nombre
  switch (m.tipo) {
    case 'ingreso':
      if (cat === CATEGORIA_RECUPERACION) return 'Reembolso / dinero recuperado (no es ingreso)'
      if (m.fondos_tercero)               return 'Dinero de terceros (no es ingreso)'
      if (cat === CAT_AJUSTE)             return 'Ajuste de saldo (no es ingreso)'
      return 'Ingreso personal'
    case 'gasto':         return m.para_tercero ? 'Gasto para tercero (excluido de mi gasto)' : 'Gasto personal'
    case 'transferencia': return 'Transferencia entre mis cuentas'
    case 'pago_deuda':    return 'Pago de deuda'
    case 'pago_tarjeta':  return 'Pago de tarjeta de crédito'
    case 'ahorro':        return 'Ahorro'
    default:              return 'Gasto personal'
  }
}

const TIPO_LABEL: Record<string, string> = {
  ingreso: 'Ingreso', gasto: 'Gasto', ahorro: 'Ahorro', pago_deuda: 'Pago de deuda',
  transferencia: 'Transferencia', pago_tarjeta: 'Pago de tarjeta',
}
const TIPO_CUENTA: Record<string, string> = {
  bancaria: 'Cuenta bancaria', digital: 'Cuenta digital', debito: 'Débito',
  credito: 'Tarjeta de crédito', efectivo: 'Efectivo', inversion: 'Inversión',
}
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ─── Utilidades de fecha / período ───────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtISO(dt: Date) { return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}` }

/** 'YYYY-MM-DD' → Date local (sin desfase de zona horaria) */
export function aFecha(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Período presupuestal al que pertenece una fecha, igual que Análisis (inicia el día de sueldo). */
export function periodoDe(fecha: string, fechaSueldo: number): { clave: string; mes: number; anio: number } {
  let [y, m] = fecha.split('-').map(Number)
  const d = Number(fecha.slice(8, 10))
  if (fechaSueldo > 1 && d >= fechaSueldo) {
    m += 1
    if (m > 12) { m = 1; y += 1 }
  }
  return { clave: `${y}-${pad(m)}`, mes: m, anio: y }
}

function etiquetaPeriodo(clave: string, fechaSueldo: number): string {
  const [y, m] = clave.split('-').map(Number)
  const { start, end } = getPeriodoPresupuestal(m, y, fechaSueldo)
  return `${MESES[m - 1]} ${y} (${start.split('-').reverse().join('/')} al ${end.split('-').reverse().join('/')})`
}

// ─── Construcción de hojas ───────────────────────────────────────

export function construirLibro(d: DatosExport): Hoja[] {
  const dentro = (f: string) => (!d.desde || f >= d.desde) && (!d.hasta || f <= d.hasta)
  const movs = d.movimientos.filter(m => dentro(m.fecha))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.created_at.localeCompare(b.created_at))

  const gcPorMov = new Map(d.compartidos.map(g => [g.movimiento_id, g]))
  const deudaPorId = new Map(d.deudas.map(x => [x.id, x.nombre]))
  const compromisoPorId = new Map(d.compromisos.map(x => [x.id, x.nombre]))

  // Por movimiento: gasto neto asumido (descontando reembolsos recibidos de gastos compartidos)
  interface Calc { cls: Clasificacion; neto: number; reembolso: number; pendiente: number; miParte: number | null; total: number | null; participantes: string }
  const calc = new Map<string, Calc>()
  for (const m of movs) {
    const cls = clasificar(m)
    let neto = cls === 'Gasto personal' ? m.monto : 0
    let reembolso = 0, pendiente = 0
    let miParte: number | null = null, total: number | null = null, participantes = ''
    const gc = m.tipo === 'gasto' ? gcPorMov.get(m.id) : undefined
    if (gc) {
      total = gc.monto_total; miParte = gc.monto_usuario
      participantes = gc.participantes.map(p => `${p.nombre} ($${p.monto.toLocaleString('es-CL')})`).join(', ')
      if (esGastoCompartidoPagadoTotal(gc)) {
        const r = resumenGastoCompartido(gc, d.cobrar)
        reembolso = r.recibido; pendiente = r.pendiente
        if (cls === 'Gasto personal') neto = m.monto - reembolso
      }
    }
    calc.set(m.id, { cls, neto, reembolso, pendiente, miParte, total, participantes })
  }

  // ── Hoja: Movimientos
  const movimientos: Hoja = {
    nombre: 'Movimientos',
    columnas: [
      { header: 'Fecha', key: 'fecha', width: 12, formato: 'fecha' },
      { header: 'Período presupuestal', key: 'periodo', width: 14, formato: 'texto' },
      { header: 'Tipo', key: 'tipo', width: 14, formato: 'texto' },
      { header: 'Clasificación para análisis', key: 'cls', width: 38, formato: 'texto' },
      { header: 'Categoría', key: 'cat', width: 22, formato: 'texto' },
      { header: 'Subcategoría', key: 'sub', width: 22, formato: 'texto' },
      { header: 'Comercio / lugar', key: 'comercio', width: 24, formato: 'texto' },
      { header: 'Comentario', key: 'nota', width: 42, formato: 'texto' },
      { header: 'Monto (CLP)', key: 'monto', width: 14, formato: 'clp' },
      { header: 'Gasto personal neto (CLP)', key: 'neto', width: 18, formato: 'clp' },
      { header: 'Cuenta / tarjeta', key: 'cuenta', width: 22, formato: 'texto' },
      { header: 'Tipo de cuenta', key: 'tipoCuenta', width: 18, formato: 'texto' },
      { header: 'Cuenta destino', key: 'destino', width: 22, formato: 'texto' },
      { header: 'Saldo antes (CLP)', key: 'saldoAntes', width: 16, formato: 'clp' },
      { header: 'Gasto compartido', key: 'compartido', width: 11, formato: 'texto' },
      { header: 'Total del gasto compartido (CLP)', key: 'totalComp', width: 18, formato: 'clp' },
      { header: 'Mi parte (CLP)', key: 'miParte', width: 14, formato: 'clp' },
      { header: 'Reembolso recibido (CLP)', key: 'reembolso', width: 16, formato: 'clp' },
      { header: 'Pendiente de recibir (CLP)', key: 'pendiente', width: 16, formato: 'clp' },
      { header: 'Participantes', key: 'participantes', width: 30, formato: 'texto' },
      { header: 'Para tercero', key: 'tercero', width: 18, formato: 'texto' },
      { header: 'Deuda asociada', key: 'deuda', width: 22, formato: 'texto' },
      { header: 'Compromiso asociado', key: 'compromiso', width: 22, formato: 'texto' },
      { header: 'Comisión (CLP)', key: 'comision', width: 12, formato: 'clp' },
    ],
    filas: movs.map(m => {
      const c = calc.get(m.id)!
      return {
        fecha: aFecha(m.fecha),
        periodo: periodoDe(m.fecha, d.fechaSueldo).clave,
        tipo: TIPO_LABEL[m.tipo] ?? m.tipo,
        cls: c.cls,
        cat: m.categoria?.nombre ?? null,
        sub: m.subcategoria?.nombre ?? null,
        comercio: m.comercio ?? null,
        nota: m.nota ?? null,
        monto: m.monto,
        neto: c.cls === 'Gasto personal' ? c.neto : null,
        cuenta: m.cuenta?.nombre ?? (m.tipo === 'pago_deuda' && !m.cuenta_id ? '(pago histórico, sin cuenta)' : null),
        tipoCuenta: m.cuenta ? (TIPO_CUENTA[m.cuenta.tipo] ?? m.cuenta.tipo) : null,
        destino: m.cuenta_destino?.nombre ?? null,
        saldoAntes: m.saldo_anterior,
        compartido: c.total != null ? 'Sí' : 'No',
        totalComp: c.total, miParte: c.miParte,
        reembolso: c.total != null ? c.reembolso : null,
        pendiente: c.total != null ? c.pendiente : null,
        participantes: c.participantes || null,
        tercero: m.para_tercero ? `Sí${m.tercero_nombre ? ` · ${m.tercero_nombre}` : ''}` : null,
        deuda: m.deuda_id ? (deudaPorId.get(m.deuda_id) ?? null) : null,
        compromiso: m.compromiso_id ? (compromisoPorId.get(m.compromiso_id) ?? null) : null,
        comision: m.comision > 0 ? m.comision : null,
      }
    }),
  }

  // ── Hoja: Resumen por período
  interface Acum { ingresos: number; bruto: number; reemb: number; ahorro: number; deuda: number; tercero: number; n: number }
  const porPeriodo = new Map<string, Acum>()
  const acum = (k: string) => {
    if (!porPeriodo.has(k)) porPeriodo.set(k, { ingresos: 0, bruto: 0, reemb: 0, ahorro: 0, deuda: 0, tercero: 0, n: 0 })
    return porPeriodo.get(k)!
  }
  for (const m of movs) {
    const c = calc.get(m.id)!
    const a = acum(periodoDe(m.fecha, d.fechaSueldo).clave)
    a.n++
    if (c.cls === 'Ingreso personal') a.ingresos += m.monto
    else if (c.cls === 'Gasto personal') { a.bruto += m.monto; a.reemb += c.reembolso }
    else if (c.cls === 'Ahorro') a.ahorro += m.monto
    else if (c.cls === 'Pago de deuda') a.deuda += m.monto
    else if (c.cls === 'Gasto para tercero (excluido de mi gasto)') a.tercero += m.monto
  }
  const periodos = [...porPeriodo.keys()].sort()
  const resumen: Hoja = {
    nombre: 'Resumen por período',
    columnas: [
      { header: 'Período', key: 'periodo', width: 44, formato: 'texto' },
      { header: 'Ingresos personales (CLP)', key: 'ingresos', width: 20, formato: 'clp' },
      { header: 'Gasto bruto (CLP)', key: 'bruto', width: 16, formato: 'clp' },
      { header: 'Reembolsos recibidos (CLP)', key: 'reemb', width: 20, formato: 'clp' },
      { header: 'Gasto neto asumido (CLP)', key: 'neto', width: 20, formato: 'clp' },
      { header: 'Flujo neto (ingresos − gasto neto)', key: 'flujo', width: 22, formato: 'clp' },
      { header: 'Tasa de ahorro (%)', key: 'tasa', width: 14, formato: 'pct' },
      { header: 'Ahorros registrados (CLP)', key: 'ahorro', width: 20, formato: 'clp' },
      { header: 'Pagos de deuda (CLP)', key: 'deuda', width: 18, formato: 'clp' },
      { header: 'Gastos para terceros excluidos (CLP)', key: 'tercero', width: 24, formato: 'clp' },
      { header: 'N° de movimientos', key: 'n', width: 12, formato: 'entero' },
    ],
    filas: periodos.map(k => {
      const a = porPeriodo.get(k)!
      const neto = a.bruto - a.reemb
      const flujo = a.ingresos - neto
      return {
        periodo: etiquetaPeriodo(k, d.fechaSueldo), ingresos: a.ingresos, bruto: a.bruto, reemb: a.reemb,
        neto, flujo, tasa: a.ingresos > 0 ? Math.max(0, flujo) / a.ingresos : null,
        ahorro: a.ahorro, deuda: a.deuda, tercero: a.tercero, n: a.n,
      }
    }),
  }

  // ── Hoja: Gasto por categoría (período × categoría × subcategoría)
  interface AcC { periodo: string; cat: string; sub: string; bruto: number; neto: number; n: number }
  const porCat = new Map<string, AcC>()
  const totalPeriodoNeto = new Map<string, number>()
  for (const m of movs) {
    const c = calc.get(m.id)!
    if (c.cls !== 'Gasto personal') continue
    const per = periodoDe(m.fecha, d.fechaSueldo).clave
    const cat = m.categoria?.nombre ?? 'Sin categoría'
    const sub = m.subcategoria?.nombre ?? '(sin subcategoría)'
    const key = `${per}|${cat}|${sub}`
    const a = porCat.get(key) ?? { periodo: per, cat, sub, bruto: 0, neto: 0, n: 0 }
    a.bruto += m.monto; a.neto += c.neto; a.n++
    porCat.set(key, a)
    totalPeriodoNeto.set(per, (totalPeriodoNeto.get(per) ?? 0) + c.neto)
  }
  const gastoCategoria: Hoja = {
    nombre: 'Gasto por categoría',
    columnas: [
      { header: 'Período', key: 'periodo', width: 12, formato: 'texto' },
      { header: 'Categoría', key: 'cat', width: 24, formato: 'texto' },
      { header: 'Subcategoría', key: 'sub', width: 26, formato: 'texto' },
      { header: 'Gasto bruto (CLP)', key: 'bruto', width: 16, formato: 'clp' },
      { header: 'Gasto neto asumido (CLP)', key: 'neto', width: 20, formato: 'clp' },
      { header: '% del gasto neto del período', key: 'pct', width: 18, formato: 'pct' },
      { header: 'N° de movimientos', key: 'n', width: 12, formato: 'entero' },
      { header: 'Promedio por movimiento (CLP)', key: 'prom', width: 20, formato: 'clp' },
    ],
    filas: [...porCat.values()]
      .sort((a, b) => a.periodo.localeCompare(b.periodo) || b.neto - a.neto)
      .map(a => ({
        periodo: a.periodo, cat: a.cat, sub: a.sub, bruto: a.bruto, neto: a.neto,
        pct: (totalPeriodoNeto.get(a.periodo) ?? 0) > 0 ? a.neto / totalPeriodoNeto.get(a.periodo)! : null,
        n: a.n, prom: Math.round(a.bruto / a.n),
      })),
  }

  // ── Hoja: Presupuesto vs real (gasto bruto por categoría dentro del período del presupuesto)
  const presupuesto: Hoja = {
    nombre: 'Presupuesto vs real',
    columnas: [
      { header: 'Período', key: 'periodo', width: 44, formato: 'texto' },
      { header: 'Categoría', key: 'cat', width: 24, formato: 'texto' },
      { header: 'Presupuestado (CLP)', key: 'pres', width: 18, formato: 'clp' },
      { header: 'Gastado bruto (CLP)', key: 'gast', width: 18, formato: 'clp' },
      { header: 'Diferencia (CLP)', key: 'dif', width: 16, formato: 'clp' },
      { header: '% usado', key: 'pct', width: 10, formato: 'pct' },
      { header: 'Estado', key: 'estado', width: 14, formato: 'texto' },
    ],
    filas: d.presupuestos
      .map(p => {
        const { start, end } = getPeriodoPresupuestal(p.mes, p.anio, d.fechaSueldo)
        return { p, start, end }
      })
      .filter(x => (!d.desde || x.end >= d.desde) && (!d.hasta || x.start <= d.hasta))
      .sort((a, b) => a.start.localeCompare(b.start) || a.p.categoria_nombre.localeCompare(b.p.categoria_nombre))
      .map(({ p, start, end }) => {
        const gast = d.movimientos
          .filter(m => m.tipo === 'gasto' && !m.para_tercero && m.categoria_id === p.categoria_id && m.fecha >= start && m.fecha <= end)
          .reduce((s, m) => s + m.monto, 0)
        const dif = p.monto_presupuestado - gast
        return {
          periodo: `${MESES[p.mes - 1]} ${p.anio} (${start.split('-').reverse().join('/')} al ${end.split('-').reverse().join('/')})`,
          cat: p.categoria_nombre, pres: p.monto_presupuestado, gast, dif,
          pct: p.monto_presupuestado > 0 ? gast / p.monto_presupuestado : null,
          estado: dif < 0 ? 'Excedido' : gast >= p.monto_presupuestado * 0.8 ? 'Casi al límite' : 'Dentro',
        }
      }),
  }

  // ── Hoja: Cuentas (estado actual)
  const cuentas: Hoja = {
    nombre: 'Cuentas',
    columnas: [
      { header: 'Cuenta / tarjeta', key: 'nombre', width: 24, formato: 'texto' },
      { header: 'Tipo', key: 'tipo', width: 18, formato: 'texto' },
      { header: 'Institución', key: 'inst', width: 16, formato: 'texto' },
      { header: 'Saldo actual (CLP)', key: 'saldo', width: 16, formato: 'clp' },
      { header: 'Cupo total (CLP)', key: 'cupo', width: 16, formato: 'clp' },
      { header: 'Cupo utilizado / deuda (CLP)', key: 'usado', width: 20, formato: 'clp' },
      { header: 'Cupo disponible (CLP)', key: 'disp', width: 18, formato: 'clp' },
      { header: 'Día de facturación', key: 'fact', width: 12, formato: 'entero' },
      { header: 'Día de vencimiento', key: 'venc', width: 12, formato: 'entero' },
      { header: 'Activa', key: 'activa', width: 8, formato: 'texto' },
    ],
    filas: d.cuentas.map(c => {
      const credito = c.tipo === 'credito'
      const usado = credito ? Math.abs(c.saldo_actual) : null
      return {
        nombre: c.nombre, tipo: TIPO_CUENTA[c.tipo] ?? c.tipo, inst: c.institucion,
        saldo: credito ? null : c.saldo_actual,
        cupo: credito ? c.limite : null, usado,
        disp: credito && c.limite ? Math.max(0, c.limite - (usado ?? 0)) : null,
        fact: c.dia_facturacion, venc: c.dia_vencimiento, activa: c.activa ? 'Sí' : 'No',
      }
    }),
  }

  // ── Hoja: Deudas (detalle y de quién son)
  const deudas = hojaDeudas(d)

  // ── Hoja: Cuentas por cobrar
  const porCobrar: Hoja = {
    nombre: 'Por cobrar',
    columnas: [
      { header: 'Persona', key: 'persona', width: 20, formato: 'texto' },
      { header: 'Concepto', key: 'desc', width: 40, formato: 'texto' },
      { header: 'Fecha', key: 'fecha', width: 12, formato: 'fecha' },
      { header: 'Monto original (CLP)', key: 'orig', width: 18, formato: 'clp' },
      { header: 'Recibido (CLP)', key: 'rec', width: 14, formato: 'clp' },
      { header: 'Pendiente (CLP)', key: 'pend', width: 14, formato: 'clp' },
      { header: 'Estado', key: 'estado', width: 12, formato: 'texto' },
      { header: 'N° de cobros recibidos', key: 'ncobros', width: 12, formato: 'entero' },
      { header: 'Último cobro', key: 'ultFecha', width: 12, formato: 'fecha' },
      { header: 'Vence', key: 'vence', width: 12, formato: 'fecha' },
    ],
    filas: hojaPorCobrarDetalle(d.cobrar),
  }

  if (!d.extra) {
    const base = [movimientos, resumen, gastoCategoria, presupuesto, cuentas, deudas, porCobrar]
    return [leeme(d, movs.length, base), ...base]
  }

  // Panorama: último período completo y promedio de gasto neto de los períodos completos
  const periodoActual = periodoDe(fmtISO(d.generado), d.fechaSueldo).clave
  const completos = periodos.filter(k => k < periodoActual)
  const ultimo = completos[completos.length - 1]
  const ingresoReal = ultimo ? { etiqueta: etiquetaPeriodo(ultimo, d.fechaSueldo), monto: porPeriodo.get(ultimo)!.ingresos } : null
  const gastoProm = completos.length
    ? { periodos: completos.length, monto: Math.round(completos.reduce((sum, k) => { const a = porPeriodo.get(k)!; return sum + (a.bruto - a.reemb) }, 0) / completos.length) }
    : null
  const e = d.extra
  const opcionales = [
    e.objetivos.length ? hojaObjetivos(d, e) : null,
    e.cuotas.length ? hojaCuotasTarjeta(d, e) : null,
    (e.valorizaciones.length || d.cuentas.some(c => c.tipo === 'inversion')) ? hojaInversiones(d, e) : null,
  ].filter((h): h is Hoja => h !== null)

  // Orden pensado para el análisis: primero el panorama y lo comprometido (compromisos, deudas, ingresos),
  // después el detalle de movimientos y el resto.
  const hojas = [
    hojaPanorama(d, e, ingresoReal, gastoProm),
    hojaCompromisos(d, e), deudas, hojaPagosDeuda(d),
    hojaIngresosRecurrentes(e), hojaIngresosEsperados(d, e),
    movimientos, resumen, gastoCategoria, presupuesto, cuentas, porCobrar, ...opcionales,
  ]
  return [leeme(d, movs.length, hojas), ...hojas]
}

// ─── Hoja Léeme (diccionario para humanos y para IA) ─────────────

function leeme(d: DatosExport, n: number, hojas: Hoja[] = []): Hoja {
  const rango = `${d.desde ? d.desde.split('-').reverse().join('/') : 'inicio'} al ${d.hasta ? d.hasta.split('-').reverse().join('/') : 'hoy'}`
  const filas: string[][] = [
    ['Exportación QloB (Quemen los Barcos)', ''],
    ['Generado', d.generado.toLocaleString('es-CL')],
    ['Rango de fechas de los movimientos', rango],
    ['Movimientos exportados', String(n)],
    ['Hojas de este archivo', ['Léeme', ...hojas.map(h => h.nombre)].join(' · ')],
    ['Moneda', 'Pesos chilenos (CLP), sin decimales'],
    ['Día de sueldo configurado', `${d.fechaSueldo} → cada período presupuestal va del día ${d.fechaSueldo} del mes anterior al ${d.fechaSueldo - 1} del mes indicado`],
    ['', ''],
    ['CÓMO INTERPRETAR LOS DATOS', ''],
    ['Clasificación para análisis', 'Úsala para filtrar. Solo "Ingreso personal" es ganancia y solo "Gasto personal" es consumo. Transferencias entre cuentas, pagos de deuda/tarjeta, ahorros, ajustes de saldo, dinero de terceros y reembolsos NO son ingreso ni gasto de consumo.'],
    ['Monto (CLP)', 'Siempre positivo. Es lo que realmente se movió en la cuenta.'],
    ['Gasto personal neto (CLP)', 'Lo que realmente costó asumir el gasto: Monto menos los reembolsos ya recibidos de gastos compartidos. Si no es compartido, es igual al Monto.'],
    ['Gasto compartido', 'Yo pagué el total; el Total, Mi parte, Reembolso recibido y Pendiente describen cómo se repartió. El reembolso aparece aparte como "Reembolso / dinero recuperado" y no es ingreso.'],
    ['Para tercero', 'Gasto que hice por otra persona y que me deben. Se excluye de mi gasto personal.'],
    ['Pago de deuda', 'Abono a una deuda: no es un gasto de consumo (el gasto original ya ocurrió). Los "pagos históricos sin cuenta" son pagos anteriores al uso de QloB y no movieron ningún saldo.'],
    ['Categoría "Préstamos"', 'Dinero prestado a alguien: puede no ser consumo. Revísalo según tu caso.'],
    ['Nota sobre las pantallas de la app', 'Esta exportación excluye de "Ingreso personal" el dinero de terceros y los ajustes de saldo, por lo que sus totales pueden diferir levemente de las pantallas de la app.'],
    ['', ''],
    ['HOJAS', ''],
    ['Movimientos', 'Un movimiento por fila, ordenado por fecha. Es la fuente de verdad.'],
    ['Resumen por período', 'Ingresos, gasto bruto/neto, flujo y tasa de ahorro por período presupuestal.'],
    ['Gasto por categoría', 'Gasto por período, categoría y subcategoría con su % del total y promedio por movimiento.'],
    ['Presupuesto vs real', 'Presupuesto de cada categoría frente al gasto bruto de su período.'],
    ['Panorama mensual', 'Ingreso mensual esperado frente a lo ya comprometido cada mes (compromisos + cuotas de deudas), margen y patrimonio. Punto de partida para buscar dónde mejorar.'],
    ['Cuentas', 'Foto del estado actual al momento de exportar (no depende del rango de fechas).'],
    ['Deudas', 'Cada deuda con de quién es (persona/acreedor), tipo, si está ligada a una tarjeta, pagado, pendiente, cuota, cuotas restantes y último pago. "(sin indicar)" = no se registró a quién se le debe.'],
    ['Pagos de deuda', 'Historial de cada abono a una deuda, con cuenta de origen y el compromiso al que se ligó (si corresponde).'],
    ['Compromisos', 'Pagos programados (servicios, suscripciones, gastos fijos): monto, frecuencia, equivalente mensual, próxima fecha y total pagado histórico.'],
    ['Ingresos recurrentes / Ingresos esperados', 'Lo que esperas recibir (sueldo, quincena…) y cada período con su estado y el monto realmente recibido.'],
    ['Por cobrar', 'Dinero que otros te deben, con cuánto llevas recibido.'],
    ['Objetivos de ahorro / Cuotas de tarjeta / Inversiones', 'Solo aparecen si tienes registros.'],
    ['Equivalente mensual', 'Lleva cualquier frecuencia a un mes promedio (semanal ×52/12, quincenal ×2, bimestral ×1/2, anual ×1/12) para poder compararlas.'],
    ['Cuidado con el doble conteo', 'Una compra con tarjeta puede aparecer como compromiso y como deuda de tarjeta; el Panorama avisa cuando los nombres se parecen.'],
  ]
  return {
    nombre: 'Léeme',
    columnas: [
      { header: 'Concepto', key: 'a', width: 36, formato: 'texto' },
      { header: 'Detalle', key: 'b', width: 110, formato: 'texto' },
    ],
    filas: filas.map(([a, b]) => ({ a, b })),
  }
}

// ─── Escritura del .xlsx (exceljs se carga solo al exportar) ─────

const FMT: Record<Formato, string | undefined> = {
  texto: undefined, fecha: 'dd-mm-yyyy', clp: '#,##0', pct: '0.0%', entero: '0',
}

export async function generarXlsx(hojas: Hoja[]): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'QloB'
  wb.created = new Date()

  for (const h of hojas) {
    const ws = wb.addWorksheet(h.nombre, { views: h.nombre === 'Léeme' ? [] : [{ state: 'frozen', ySplit: 1 }] })
    ws.columns = h.columnas.map(c => ({ header: c.header, key: c.key, width: c.width }))
    // Los textos se limpian de espacios sobrantes (hay nombres guardados con espacio al final)
    for (const fila of h.filas) {
      ws.addRow(Object.fromEntries(Object.entries(fila).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])))
    }

    const head = ws.getRow(1)
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    head.alignment = { vertical: 'middle', wrapText: true }
    head.height = 32
    head.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3A5F' } } })

    h.columnas.forEach((c, i) => {
      const fmt = FMT[c.formato ?? 'texto']
      if (fmt) ws.getColumn(i + 1).numFmt = fmt
      if (c.formato === 'clp' || c.formato === 'pct' || c.formato === 'entero') ws.getColumn(i + 1).alignment = { horizontal: 'right' }
    })
    if (h.nombre === 'Léeme') {
      ws.eachRow((row, i) => { if (i > 1) row.alignment = { vertical: 'top', wrapText: true } })
    } else if (h.filas.length > 0) {
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: h.columnas.length } }
    }
  }

  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
