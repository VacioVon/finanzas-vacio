import type { Cuenta, Deuda, ResumenFinanciero, Movimiento, CuentaPorCobrar } from '@/types/app.types'

// ─── Patrimonio: ÚNICA fuente de verdad ──────────────────────────
//
//   PATRIMONIO NETO = ACTIVOS − PASIVOS
//
//   ACTIVOS  = cuentas líquidas activas        (bancaria, digital, débito, efectivo)
//            + inversiones activas             (valor actual)
//            + por cobrar pendiente            (cuentas por cobrar + deudas "me_deben")
//   PASIVOS  = tarjetas de crédito             (SIEMPRE |saldo|, sin importar el signo guardado)
//            + deudas propias activas/en mora  (pendiente REAL = monto_total − pagos registrados)
//
// Notas:
//  - El "por cobrar" es patrimonio pero NO es dinero disponible: no se suma a las cuentas.
//  - El pendiente de una deuda se deriva de los pagos reales (movimientos pago_deuda);
//    la columna monto_pendiente de la base NO se usa porque puede quedar desactualizada.
//  - Cuando una deuda está ligada a una tarjeta de crédito, su saldo puede estar ya incluido
//    en el saldo de la tarjeta. Con deduplicarDeudasDeTarjeta=true esa deuda no se resta de nuevo.

export interface DesglosePatrimonio {
  activos: { cuentas: number; inversiones: number; porCobrar: number; total: number }
  pasivos: { tarjetas: number; deudas: number; total: number }
  patrimonioNeto: number
}

export interface OpcionesPatrimonio {
  /** No restar deudas ligadas a una tarjeta (evita doble conteo si ya están en el saldo de la tarjeta). */
  deduplicarDeudasDeTarjeta?: boolean
}

/** Pendiente real de una deuda: monto_total − pagos registrados (nunca la columna monto_pendiente). */
export function deudaPendienteReal(d: Deuda): number {
  return d.monto_pendiente_real ?? Math.max(0, d.monto_total - (d.monto_pagado_real ?? 0))
}

/** Saldo aún por cobrar de una cuenta por cobrar (0 si está pagada o cancelada). */
export function cobrarPendiente(c: CuentaPorCobrar): number {
  return c.estado === 'pendiente' ? Math.max(0, c.monto_original - c.monto_pagado) : 0
}

export function calcularPatrimonio(
  cuentas: Cuenta[],
  deudas: Deuda[],
  porCobrar: CuentaPorCobrar[] = [],
  opciones: OpcionesPatrimonio = {}
): DesglosePatrimonio {
  const activas = cuentas.filter(c => c.activa)

  const cuentasLiquidas = activas
    .filter(c => c.tipo !== 'inversion' && c.tipo !== 'credito')
    .reduce((sum, c) => sum + c.saldo_actual, 0)

  const inversiones = activas
    .filter(c => c.tipo === 'inversion')
    .reduce((sum, c) => sum + c.saldo_actual, 0)

  // Tarjeta = deuda: el signo guardado en la base puede variar, siempre es un pasivo.
  const tarjetas = activas
    .filter(c => c.tipo === 'credito')
    .reduce((sum, c) => sum + Math.abs(c.saldo_actual), 0)

  const idsTarjetas = new Set(activas.filter(c => c.tipo === 'credito').map(c => c.id))
  const vigentes = deudas.filter(d => d.estado === 'activa' || d.estado === 'en_mora')

  const meDeben = vigentes
    .filter(d => d.direccion === 'me_deben')
    .reduce((sum, d) => sum + deudaPendienteReal(d), 0)

  const deudasPropias = vigentes
    .filter(d => d.direccion !== 'me_deben')
    .filter(d => !(opciones.deduplicarDeudasDeTarjeta && d.cuenta_id && idsTarjetas.has(d.cuenta_id)))
    .reduce((sum, d) => sum + deudaPendienteReal(d), 0)

  const porCobrarTotal = porCobrar.reduce((sum, c) => sum + cobrarPendiente(c), 0) + meDeben

  const totalActivos = cuentasLiquidas + inversiones + porCobrarTotal
  const totalPasivos = tarjetas + deudasPropias

  return {
    activos: { cuentas: cuentasLiquidas, inversiones, porCobrar: porCobrarTotal, total: totalActivos },
    pasivos: { tarjetas, deudas: deudasPropias, total: totalPasivos },
    patrimonioNeto: totalActivos - totalPasivos,
  }
}

export function calcularDineroDisponible(cuentas: Cuenta[]): number {
  return cuentas
    .filter(c => c.activa && c.tipo !== 'inversion' && c.tipo !== 'credito')
    .reduce((sum, c) => sum + c.saldo_actual, 0)
}

export function calcularResumen(
  cuentas: Cuenta[],
  deudas: Deuda[],
  movimientos: Movimiento[],
  porCobrar: CuentaPorCobrar[] = [],
  opciones: OpcionesPatrimonio = {}
): ResumenFinanciero {
  const p = calcularPatrimonio(cuentas, deudas, porCobrar, opciones)

  const ingresosDelMes = movimientos
    .filter(m => m.tipo === 'ingreso')
    .reduce((sum, m) => sum + m.monto, 0)

  const gastosDelMes = movimientos
    .filter(m => m.tipo === 'gasto')
    .reduce((sum, m) => sum + m.monto, 0)

  const ahorrosDelMes = movimientos
    .filter(m => m.tipo === 'ahorro')
    .reduce((sum, m) => sum + m.monto, 0)

  return {
    totalCuentas: p.activos.cuentas,
    totalInversiones: p.activos.inversiones,
    totalDeudas: p.pasivos.deudas,
    patrimonioNeto: p.patrimonioNeto,
    ingresosDelMes,
    gastosDelMes,
    ahorrosDelMes
  }
}

export function calcularSaludFinanciera(
  presupuestosExcedidos: number,
  totalPresupuestos: number,
  ahorroEsteMes: boolean,
  deudas: Deuda[],
  ingresosDelMes: number,
  gastosDelMes: number
): number {
  if (totalPresupuestos === 0 && ingresosDelMes === 0) return 0

  // Componente presupuestos (25 pts)
  let compPresupuestos = 25
  if (totalPresupuestos > 0) {
    const pctExcedidos = presupuestosExcedidos / totalPresupuestos
    if (pctExcedidos === 0) compPresupuestos = 25
    else if (pctExcedidos <= 0.2) compPresupuestos = 15
    else compPresupuestos = 5
  }

  // Componente ahorros (25 pts)
  let compAhorros = ahorroEsteMes ? 20 : 5

  // Componente deudas (25 pts)
  const totalDeudas = deudas
    .filter(d => d.estado === 'activa')
    .reduce((sum, d) => sum + d.monto_pendiente, 0)
  let compDeudas = 25
  if (ingresosDelMes > 0) {
    const ratioDeuda = totalDeudas / ingresosDelMes
    if (ratioDeuda === 0) compDeudas = 25
    else if (ratioDeuda < 0.3) compDeudas = 20
    else if (ratioDeuda < 0.5) compDeudas = 10
    else compDeudas = 5
  }

  // Componente flujo (25 pts)
  let compFlujo = 0
  if (ingresosDelMes > 0) {
    if (ingresosDelMes > gastosDelMes) compFlujo = 25
    else if (ingresosDelMes === gastosDelMes) compFlujo = 12
    else compFlujo = 0
  }

  return compPresupuestos + compAhorros + compDeudas + compFlujo
}

export function etiquetaSaludFinanciera(puntaje: number): {
  label: string
  color: string
  bgColor: string
} {
  if (puntaje >= 90) return { label: 'Excelente', color: 'text-success-700', bgColor: 'bg-success-50' }
  if (puntaje >= 75) return { label: 'Buena', color: 'text-primary-700', bgColor: 'bg-primary-50' }
  if (puntaje >= 50) return { label: 'Atención', color: 'text-warning-700', bgColor: 'bg-warning-50' }
  return { label: 'Riesgo', color: 'text-danger-700', bgColor: 'bg-danger-50' }
}

export function colorCuenta(tipo: string): string {
  const map: Record<string, string> = {
    bancaria:  '#2563EB',
    digital:   '#7C3AED',
    debito:    '#0891B2',
    credito:   '#DC2626',
    efectivo:  '#16A34A',
    inversion: '#D97706'
  }
  return map[tipo] ?? '#6B7280'
}

export function iconoCuenta(tipo: string): string {
  const map: Record<string, string> = {
    bancaria:  '🏦',
    digital:   '📱',
    debito:    '💳',
    credito:   '💳',
    efectivo:  '💵',
    inversion: '📈'
  }
  return map[tipo] ?? '💰'
}

export function labelTipoCuenta(tipo: string): string {
  const map: Record<string, string> = {
    bancaria:  'Cuenta Bancaria',
    digital:   'Cuenta Digital',
    debito:    'Tarjeta Débito',
    credito:   'Tarjeta Crédito',
    efectivo:  'Efectivo',
    inversion: 'Inversión'
  }
  return map[tipo] ?? tipo
}

export function colorMovimiento(tipo: string): string {
  const map: Record<string, string> = {
    ingreso:     'text-success-600',
    gasto:       'text-danger-600',
    ahorro:      'text-primary-600',
    pago_deuda:  'text-warning-600',
    transferencia: 'text-slate-600'
  }
  return map[tipo] ?? 'text-slate-600'
}

export function signMovimiento(tipo: string): '+' | '-' | '' {
  if (tipo === 'ingreso') return '+'
  if (tipo === 'gasto' || tipo === 'ahorro' || tipo === 'pago_deuda') return '-'
  return ''
}

/**
 * Calcula la Tasa de Costo Total (TCT) anual de una cuota de crédito.
 * Fórmula simplificada (lineal sobre el principal):
 *   TCT = (interés_total + comision) / monto_total / (meses / 12) × 100
 * Devuelve null si no hay costo financiero o si los parámetros son inválidos.
 */
export function calcularTCT(
  montoTotal:  number,
  interes:     number,  // tasa anual %
  comision:    number,  // cargo fijo adicional
  cuotasTotal: number   // plazo en meses
): number | null {
  if (montoTotal <= 0 || cuotasTotal <= 0) return null
  if (interes <= 0 && comision <= 0)       return null

  const anos          = cuotasTotal / 12
  const interesTotal  = montoTotal * (interes / 100) * anos
  const costoExtra    = interesTotal + comision
  const tct           = (costoExtra / montoTotal) / anos * 100

  return Math.round(tct * 10) / 10  // 1 decimal
}
