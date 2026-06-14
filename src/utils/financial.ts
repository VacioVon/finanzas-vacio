import type { Cuenta, Deuda, ResumenFinanciero, Movimiento } from '@/types/app.types'

export function calcularPatrimonioNeto(cuentas: Cuenta[], deudas: Deuda[]): number {
  const totalCuentas = cuentas
    .filter(c => c.activa && c.tipo !== 'inversion' && c.tipo !== 'credito')
    .reduce((sum, c) => sum + c.saldo_actual, 0)

  const totalInversiones = cuentas
    .filter(c => c.activa && c.tipo === 'inversion')
    .reduce((sum, c) => sum + c.saldo_actual, 0)

  const totalDeudas = deudas
    .filter(d => d.estado === 'activa' || d.estado === 'en_mora')
    .reduce((sum, d) => sum + d.monto_pendiente, 0)

  return totalCuentas + totalInversiones - totalDeudas
}

export function calcularDineroDisponible(cuentas: Cuenta[]): number {
  return cuentas
    .filter(c => c.activa && c.tipo !== 'inversion' && c.tipo !== 'credito')
    .reduce((sum, c) => sum + c.saldo_actual, 0)
}

export function calcularResumen(
  cuentas: Cuenta[],
  deudas: Deuda[],
  movimientos: Movimiento[]
): ResumenFinanciero {
  const totalCuentas = cuentas
    .filter(c => c.activa && c.tipo !== 'inversion' && c.tipo !== 'credito')
    .reduce((sum, c) => sum + c.saldo_actual, 0)

  const totalInversiones = cuentas
    .filter(c => c.activa && c.tipo === 'inversion')
    .reduce((sum, c) => sum + c.saldo_actual, 0)

  const totalDeudas = deudas
    .filter(d => d.estado === 'activa' || d.estado === 'en_mora')
    .reduce((sum, d) => sum + d.monto_pendiente, 0)

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
    totalCuentas,
    totalInversiones,
    totalDeudas,
    patrimonioNeto: totalCuentas + totalInversiones - totalDeudas,
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
