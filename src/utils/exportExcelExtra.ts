import type {
  Cuenta, Deuda, Movimiento, Suscripcion, ObjetivoAhorro, CuotaCredito, Valorizacion, CuentaPorCobrar,
} from '@/types/app.types'
import type { IngresoRecurrente, FuenteIngreso, InstanciaEsperada } from '@/types/ingresos-recurrentes.types'
import type { Hoja, DatosExport } from '@/utils/exportExcel'
import { calcularPlanCuotas } from '@/utils/planCuotas'
import { calcularPatrimonio, deudaPendienteReal, cobrarPendiente } from '@/utils/financial'
import { nombresSeParecen } from '@/utils/pagoCompromisoDeuda'
import { esInstanciaAjustada } from '@/utils/ingresosRecurrentes'

/**
 * Hojas adicionales del Excel: deudas con su detalle y de quién son, compromisos, ingresos
 * recurrentes, objetivos, cuotas de tarjeta, inversiones y un PANORAMA MENSUAL que compara el
 * ingreso esperado con lo ya comprometido (compromisos + cuotas de deuda).
 */

export interface DatosExtra {
  suscripciones:       Suscripcion[]
  fuentesIngreso:      FuenteIngreso[]
  ingresosRecurrentes: IngresoRecurrente[]
  ingresosEsperados:   InstanciaEsperada[]
  objetivos:           ObjetivoAhorro[]
  cuotas:              CuotaCredito[]
  valorizaciones:      Valorizacion[]
}

// ─── Utilidades ──────────────────────────────────────────────────

/** Cuántas veces ocurre un pago de esta frecuencia en un mes promedio. */
export function vecesPorMes(frecuencia: string): number {
  switch (frecuencia) {
    case 'semanal':    return 52 / 12
    case 'quincenal':  return 2
    case 'mensual':    return 1
    case 'bimestral':  return 1 / 2
    case 'trimestral': return 1 / 3
    case 'semestral':  return 1 / 6
    case 'anual':      return 1 / 12
    default:           return 1
  }
}

export function montoMensualEquivalente(monto: number, frecuencia: string): number {
  return Math.round(monto * vecesPorMes(frecuencia))
}

function aFecha(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}
const fechaOrNull = (iso: string | null | undefined) => (iso ? aFecha(iso) : null)
const SIN_INDICAR = '(sin indicar)'

const TIPO_DEUDA: Record<string, string> = {
  credito_consumo: 'Crédito de consumo', prestamo_personal: 'Préstamo personal',
  credito_comercial: 'Crédito comercial', deuda_persona: 'Deuda con persona',
  tarjeta_credito: 'Tarjeta de crédito', otra: 'Otra',
}
const CONTEXTO: Record<string, string> = {
  deuda_propia: 'Deuda propia', devolucion_prestamo: 'Devolución de préstamo',
  deuda_compartida: 'Deuda compartida', otro: 'Otro',
}
const TIPO_COMPROMISO: Record<string, string> = {
  servicio: 'Servicio', gasto_fijo: 'Gasto fijo', membresia: 'Membresía', seguro: 'Seguro', arriendo: 'Arriendo',
  educacion: 'Educación', salud: 'Salud', pareja: 'Pareja', mascotas: 'Mascotas', otro: 'Otro',
}
const FRECUENCIA: Record<string, string> = {
  semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual', bimestral: 'Bimestral',
  trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual',
}

// ─── Deudas (con detalle y de quién son) ─────────────────────────

export function hojaDeudas(d: DatosExport): Hoja {
  const tarjetaDe = new Map(d.cuentas.map(c => [c.id, c]))
  const pagosPor = new Map<string, Movimiento[]>()
  for (const m of d.movimientos) {
    if (m.tipo === 'pago_deuda' && m.deuda_id) {
      if (!pagosPor.has(m.deuda_id)) pagosPor.set(m.deuda_id, [])
      pagosPor.get(m.deuda_id)!.push(m)
    }
  }
  const compNombre = new Map((d.compromisos ?? []).map(c => [c.id, c.nombre]))

  return {
    nombre: 'Deudas',
    columnas: [
      { header: 'Deuda', key: 'nombre', width: 26, formato: 'texto' },
      { header: 'Persona / acreedor (de quién es)', key: 'persona', width: 24, formato: 'texto' },
      { header: 'Dirección', key: 'dir', width: 12, formato: 'texto' },
      { header: 'Tipo de deuda', key: 'tipo', width: 20, formato: 'texto' },
      { header: 'Ligada a tarjeta', key: 'tarjeta', width: 18, formato: 'texto' },
      { header: 'Estado', key: 'estado', width: 10, formato: 'texto' },
      { header: 'Fecha de origen', key: 'origen', width: 13, formato: 'fecha' },
      { header: 'Monto total (CLP)', key: 'total', width: 16, formato: 'clp' },
      { header: 'Pagado real (CLP)', key: 'pagado', width: 16, formato: 'clp' },
      { header: '% pagado', key: 'pct', width: 10, formato: 'pct' },
      { header: 'Saldo pendiente (CLP)', key: 'pend', width: 18, formato: 'clp' },
      { header: 'Cuota definida (CLP)', key: 'cuota', width: 16, formato: 'clp' },
      { header: 'Cuotas restantes (plan)', key: 'restantes', width: 14, formato: 'entero' },
      { header: 'Última cuota (CLP)', key: 'ultima', width: 16, formato: 'clp' },
      { header: 'Interés anual', key: 'interes', width: 10, formato: 'texto' },
      { header: 'Próximo pago', key: 'prox', width: 12, formato: 'fecha' },
      { header: 'Vencimiento', key: 'vence', width: 12, formato: 'fecha' },
      { header: 'N° de pagos', key: 'npagos', width: 10, formato: 'entero' },
      { header: 'Último pago (fecha)', key: 'ultFecha', width: 13, formato: 'fecha' },
      { header: 'Último pago (CLP)', key: 'ultMonto', width: 15, formato: 'clp' },
      { header: 'Compromiso ligado a sus pagos', key: 'compromiso', width: 24, formato: 'texto' },
      { header: 'Nota', key: 'nota', width: 30, formato: 'texto' },
    ],
    filas: d.deudas.map(x => {
      const pagos = (pagosPor.get(x.id) ?? []).sort((a, b) => a.fecha.localeCompare(b.fecha))
      const pagado = x.monto_pagado_real ?? pagos.reduce((s, p) => s + p.monto, 0)
      const pend = deudaPendienteReal({ ...x, monto_pagado_real: pagado, monto_pendiente_real: x.monto_pendiente_real })
      const plan = x.estado !== 'pagada' ? calcularPlanCuotas(pend, x.cuota_mensual) : null
      const ult = pagos[pagos.length - 1]
      const compromiso = pagos.map(p => p.compromiso_id).find(Boolean)
      const tarjeta = x.cuenta_id ? tarjetaDe.get(x.cuenta_id) : undefined
      return {
        nombre: x.nombre, persona: x.prestamista_nombre?.trim() || SIN_INDICAR,
        dir: x.direccion === 'me_deben' ? 'Me deben' : 'Yo debo',
        tipo: x.tipo_deuda ? (TIPO_DEUDA[x.tipo_deuda] ?? x.tipo_deuda) : null,
        tarjeta: tarjeta?.tipo === 'credito' ? tarjeta.nombre : null,
        estado: x.estado === 'activa' ? 'Activa' : x.estado === 'pagada' ? 'Pagada' : 'En mora',
        origen: fechaOrNull(x.fecha_compra), total: x.monto_total, pagado,
        pct: x.monto_total > 0 ? pagado / x.monto_total : null, pend,
        cuota: x.cuota_mensual, restantes: plan?.cuotasRestantes ?? null, ultima: plan?.montoUltima ?? null,
        interes: x.interes > 0 ? `${x.interes}%` : null,
        prox: fechaOrNull(x.fecha_prox_pago), vence: fechaOrNull(x.fecha_vencimiento),
        npagos: pagos.length, ultFecha: fechaOrNull(ult?.fecha), ultMonto: ult?.monto ?? null,
        compromiso: compromiso ? (compNombre.get(compromiso) ?? null) : null, nota: x.nota,
      }
    }),
  }
}

/** Historial de pagos de deuda, uno por fila. */
export function hojaPagosDeuda(d: DatosExport): Hoja {
  const deudaPor = new Map(d.deudas.map(x => [x.id, x]))
  const compNombre = new Map((d.compromisos ?? []).map(c => [c.id, c.nombre]))
  return {
    nombre: 'Pagos de deuda',
    columnas: [
      { header: 'Fecha', key: 'fecha', width: 12, formato: 'fecha' },
      { header: 'Deuda', key: 'deuda', width: 26, formato: 'texto' },
      { header: 'Persona / acreedor', key: 'persona', width: 22, formato: 'texto' },
      { header: 'Monto (CLP)', key: 'monto', width: 14, formato: 'clp' },
      { header: 'Cuenta de origen', key: 'cuenta', width: 22, formato: 'texto' },
      { header: 'Compromiso ligado', key: 'compromiso', width: 22, formato: 'texto' },
      { header: 'Contexto', key: 'contexto', width: 22, formato: 'texto' },
      { header: 'Comprobante', key: 'comprobante', width: 12, formato: 'texto' },
      { header: 'Nota', key: 'nota', width: 40, formato: 'texto' },
    ],
    filas: d.movimientos
      .filter(m => m.tipo === 'pago_deuda')
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map(m => {
        const x = m.deuda_id ? deudaPor.get(m.deuda_id) : undefined
        return {
          fecha: aFecha(m.fecha), deuda: x?.nombre ?? null, persona: x ? (x.prestamista_nombre?.trim() || SIN_INDICAR) : null,
          monto: m.monto, cuenta: m.cuenta?.nombre ?? (m.cuenta_id ? null : '(pago histórico, sin cuenta)'),
          compromiso: m.compromiso_id ? (compNombre.get(m.compromiso_id) ?? null) : null,
          contexto: m.contexto_pago ? (CONTEXTO[m.contexto_pago] ?? m.contexto_pago) : null,
          comprobante: m.comprobante_url ? 'Sí' : 'No', nota: m.nota,
        }
      }),
  }
}

// ─── Compromisos ─────────────────────────────────────────────────

export function hojaCompromisos(d: DatosExport, e: DatosExtra): Hoja {
  const hoy = d.generado
  const pagosPor = new Map<string, Movimiento[]>()
  for (const m of d.movimientos) {
    if (m.compromiso_id && (m.tipo === 'gasto' || m.tipo === 'pago_deuda')) {
      if (!pagosPor.has(m.compromiso_id)) pagosPor.set(m.compromiso_id, [])
      pagosPor.get(m.compromiso_id)!.push(m)
    }
  }
  return {
    nombre: 'Compromisos',
    columnas: [
      { header: 'Compromiso', key: 'nombre', width: 26, formato: 'texto' },
      { header: 'Tipo', key: 'tipo', width: 14, formato: 'texto' },
      { header: 'Categoría', key: 'cat', width: 18, formato: 'texto' },
      { header: 'Subcategoría', key: 'sub', width: 18, formato: 'texto' },
      { header: 'Estado', key: 'estado', width: 10, formato: 'texto' },
      { header: 'Monto (CLP)', key: 'monto', width: 14, formato: 'clp' },
      { header: 'Tipo de monto', key: 'tipoMonto', width: 12, formato: 'texto' },
      { header: 'Frecuencia', key: 'frec', width: 12, formato: 'texto' },
      { header: 'Monto mensual equivalente (CLP)', key: 'mensual', width: 20, formato: 'clp' },
      { header: 'Día de cobro', key: 'dia', width: 10, formato: 'entero' },
      { header: 'Próxima fecha', key: 'prox', width: 13, formato: 'fecha' },
      { header: 'Días para el próximo cobro', key: 'dias', width: 14, formato: 'entero' },
      { header: 'Último pago', key: 'ult', width: 13, formato: 'fecha' },
      { header: 'Fecha de término', key: 'fin', width: 13, formato: 'fecha' },
      { header: 'Cuenta de pago', key: 'cuenta', width: 22, formato: 'texto' },
      { header: 'Pagos registrados', key: 'npagos', width: 11, formato: 'entero' },
      { header: 'Total pagado histórico (CLP)', key: 'totalPagado', width: 18, formato: 'clp' },
      { header: 'Nota', key: 'nota', width: 30, formato: 'texto' },
    ],
    filas: e.suscripciones.map(s => {
      const pagos = pagosPor.get(s.id) ?? []
      const prox = s.proxima_fecha ? aFecha(s.proxima_fecha) : null
      return {
        nombre: s.nombre, tipo: TIPO_COMPROMISO[s.tipo] ?? s.tipo,
        cat: s.categoria?.nombre ?? null, sub: s.subcategoria?.nombre ?? null,
        estado: s.activa ? 'Activo' : 'Pausado', monto: s.monto,
        tipoMonto: s.monto_tipo === 'estimado' ? 'Estimado' : 'Fijo',
        frec: FRECUENCIA[s.frecuencia] ?? s.frecuencia,
        mensual: montoMensualEquivalente(s.monto, s.frecuencia), dia: s.dia_cobro,
        prox, dias: prox ? Math.round((prox.getTime() - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime()) / 86400000) : null,
        ult: fechaOrNull(s.ultimo_pago_fecha), fin: fechaOrNull(s.fecha_fin),
        cuenta: s.cuenta?.nombre ?? null, npagos: pagos.length,
        totalPagado: pagos.reduce((sum, p) => sum + p.monto, 0), nota: s.nota,
      }
    }),
  }
}

// ─── Ingresos recurrentes y sus instancias ───────────────────────

export function hojaIngresosRecurrentes(e: DatosExtra): Hoja {
  return {
    nombre: 'Ingresos recurrentes',
    columnas: [
      { header: 'Ingreso', key: 'nombre', width: 26, formato: 'texto' },
      { header: 'Fuente (agrupa pagos)', key: 'fuente', width: 22, formato: 'texto' },
      { header: 'Estado', key: 'estado', width: 10, formato: 'texto' },
      { header: 'Monto esperado (CLP)', key: 'monto', width: 18, formato: 'clp' },
      { header: 'Frecuencia', key: 'frec', width: 12, formato: 'texto' },
      { header: 'Monto mensual equivalente (CLP)', key: 'mensual', width: 20, formato: 'clp' },
      { header: 'Día esperado', key: 'dia', width: 11, formato: 'entero' },
      { header: 'Tolerancia (±días)', key: 'tol', width: 12, formato: 'entero' },
      { header: 'Tipo de fecha', key: 'tipoFecha', width: 12, formato: 'texto' },
      { header: 'Cuenta destino', key: 'cuenta', width: 22, formato: 'texto' },
      { header: 'Nota', key: 'nota', width: 30, formato: 'texto' },
    ],
    filas: e.ingresosRecurrentes.map(r => ({
      nombre: r.nombre, fuente: r.fuente_nombre, estado: r.activo ? 'Activo' : 'Pausado',
      monto: r.monto_esperado, frec: FRECUENCIA[r.frecuencia] ?? r.frecuencia,
      mensual: montoMensualEquivalente(r.monto_esperado, r.frecuencia), dia: r.dia_esperado,
      tol: r.tolerancia_dias, tipoFecha: r.tipo_fecha === 'aproximado' ? 'Aproximada' : 'Fija',
      cuenta: r.cuenta_nombre, nota: r.nota,
    })),
  }
}

export function hojaIngresosEsperados(d: DatosExport, e: DatosExtra): Hoja {
  const rec = new Map(e.ingresosRecurrentes.map(r => [r.id, r]))
  const mov = new Map(d.movimientos.map(m => [m.id, m]))
  return {
    nombre: 'Ingresos esperados',
    columnas: [
      { header: 'Período', key: 'periodo', width: 10, formato: 'texto' },
      { header: 'Ingreso', key: 'nombre', width: 26, formato: 'texto' },
      { header: 'Fuente', key: 'fuente', width: 20, formato: 'texto' },
      { header: 'Fecha esperada', key: 'fecha', width: 13, formato: 'fecha' },
      { header: 'Monto esperado (CLP)', key: 'esperado', width: 18, formato: 'clp' },
      { header: 'Estado', key: 'estado', width: 12, formato: 'texto' },
      { header: 'Monto recibido (CLP)', key: 'recibido', width: 18, formato: 'clp' },
      { header: 'Diferencia (CLP)', key: 'dif', width: 15, formato: 'clp' },
      { header: 'Ajuste manual del mes', key: 'ajuste', width: 12, formato: 'texto' },
      { header: 'Nota', key: 'nota', width: 40, formato: 'texto' },
    ],
    filas: [...e.ingresosEsperados].sort((a, b) => a.periodo_ref.localeCompare(b.periodo_ref)).map(i => {
      const r = rec.get(i.ingreso_recurrente_id)
      const recibido = i.movimiento_id ? (mov.get(i.movimiento_id)?.monto ?? null) : null
      const estado = { pendiente: 'Pendiente', confirmado: 'Confirmado', pospuesto: 'Pospuesto', no_recibido: 'No recibido' }[i.estado] ?? i.estado
      return {
        periodo: i.periodo_ref, nombre: r?.nombre ?? null, fuente: r?.fuente_nombre ?? null,
        fecha: aFecha(i.fecha_esperada), esperado: i.monto_esperado, estado,
        recibido, dif: recibido != null ? recibido - i.monto_esperado : null,
        ajuste: esInstanciaAjustada(i.nota) ? 'Sí' : 'No', nota: i.nota,
      }
    }),
  }
}

// ─── Objetivos, cuotas de tarjeta e inversiones (solo si hay datos) ──

export function hojaObjetivos(d: DatosExport, e: DatosExtra): Hoja {
  const cuentaDe = new Map(d.cuentas.map(c => [c.id, c]))
  return {
    nombre: 'Objetivos de ahorro',
    columnas: [
      { header: 'Objetivo', key: 'nombre', width: 26, formato: 'texto' },
      { header: 'Estado', key: 'estado', width: 11, formato: 'texto' },
      { header: 'Meta (CLP)', key: 'meta', width: 15, formato: 'clp' },
      { header: 'Acumulado (CLP)', key: 'actual', width: 15, formato: 'clp' },
      { header: '% de avance', key: 'pct', width: 11, formato: 'pct' },
      { header: 'Falta (CLP)', key: 'falta', width: 15, formato: 'clp' },
      { header: 'Fecha objetivo', key: 'fecha', width: 13, formato: 'fecha' },
      { header: 'Cuenta de inversión vinculada', key: 'cuenta', width: 26, formato: 'texto' },
      { header: 'Descripción', key: 'desc', width: 30, formato: 'texto' },
    ],
    filas: e.objetivos.map(o => {
      const vinc = o.cuenta_vinculada_id ? cuentaDe.get(o.cuenta_vinculada_id) : undefined
      const actual = vinc ? vinc.saldo_actual : o.monto_actual
      return {
        nombre: o.nombre, estado: { activo: 'Activo', completado: 'Completado', pausado: 'Pausado' }[o.estado] ?? o.estado,
        meta: o.monto_objetivo, actual, pct: o.monto_objetivo > 0 ? actual / o.monto_objetivo : null,
        falta: Math.max(0, o.monto_objetivo - actual), fecha: fechaOrNull(o.fecha_objetivo),
        cuenta: vinc?.nombre ?? null, desc: o.descripcion,
      }
    }),
  }
}

export function hojaCuotasTarjeta(d: DatosExport, e: DatosExtra): Hoja {
  const cuentaDe = new Map(d.cuentas.map(c => [c.id, c]))
  return {
    nombre: 'Cuotas de tarjeta',
    columnas: [
      { header: 'Compra', key: 'nombre', width: 26, formato: 'texto' },
      { header: 'Tarjeta', key: 'tarjeta', width: 20, formato: 'texto' },
      { header: 'Fecha de compra', key: 'fecha', width: 13, formato: 'fecha' },
      { header: 'Monto total (CLP)', key: 'total', width: 16, formato: 'clp' },
      { header: 'Cuota (CLP)', key: 'cuota', width: 13, formato: 'clp' },
      { header: 'Cuotas totales', key: 'ct', width: 10, formato: 'entero' },
      { header: 'Cuotas pagadas', key: 'cp', width: 10, formato: 'entero' },
      { header: 'Cuotas restantes', key: 'cr', width: 10, formato: 'entero' },
      { header: 'Pendiente (CLP)', key: 'pend', width: 15, formato: 'clp' },
      { header: 'Para tercero', key: 'tercero', width: 16, formato: 'texto' },
      { header: 'Estado', key: 'estado', width: 11, formato: 'texto' },
      { header: 'Nota', key: 'nota', width: 30, formato: 'texto' },
    ],
    filas: e.cuotas.map(c => ({
      nombre: c.nombre, tarjeta: cuentaDe.get(c.cuenta_id)?.nombre ?? null, fecha: aFecha(c.fecha_inicio),
      total: c.monto_total, cuota: c.monto_cuota, ct: c.cuotas_total, cp: c.cuotas_pagadas,
      cr: c.cuotas_total - c.cuotas_pagadas, pend: (c.cuotas_total - c.cuotas_pagadas) * c.monto_cuota,
      tercero: c.para_tercero ? `Sí${c.tercero_nombre ? ` · ${c.tercero_nombre}` : ''}` : null,
      estado: { activa: 'Activa', completada: 'Completada', cancelada: 'Cancelada' }[c.estado] ?? c.estado, nota: c.nota,
    })),
  }
}

export function hojaInversiones(d: DatosExport, e: DatosExtra): Hoja {
  const cuentaDe = new Map(d.cuentas.map(c => [c.id, c]))
  const filas: Hoja['filas'] = []
  for (const c of d.cuentas.filter(x => x.tipo === 'inversion')) {
    filas.push({
      tipo: 'Valor actual', cuenta: c.nombre, fecha: null, valor: c.saldo_actual,
      capital: c.saldo_inicial, ganancia: c.saldo_actual - c.saldo_inicial, nota: 'Estado actual de la cuenta',
    })
  }
  for (const v of [...e.valorizaciones].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    filas.push({ tipo: 'Valorización', cuenta: cuentaDe.get(v.cuenta_id)?.nombre ?? null, fecha: aFecha(v.fecha), valor: v.valor, capital: null, ganancia: null, nota: v.nota })
  }
  return {
    nombre: 'Inversiones',
    columnas: [
      { header: 'Registro', key: 'tipo', width: 14, formato: 'texto' },
      { header: 'Cuenta de inversión', key: 'cuenta', width: 26, formato: 'texto' },
      { header: 'Fecha', key: 'fecha', width: 12, formato: 'fecha' },
      { header: 'Valor (CLP)', key: 'valor', width: 15, formato: 'clp' },
      { header: 'Capital inicial (CLP)', key: 'capital', width: 17, formato: 'clp' },
      { header: 'Ganancia / pérdida (CLP)', key: 'ganancia', width: 18, formato: 'clp' },
      { header: 'Nota', key: 'nota', width: 30, formato: 'texto' },
    ],
    filas,
  }
}

// ─── Panorama mensual ────────────────────────────────────────────

export interface Panorama {
  ingresoEsperado:   number
  compromisos:       number
  cuotasDeuda:       number
  margen:            number
  comprometidoPct:   number | null
  solapamientos:     string[]
}

/** Ingreso mensual esperado frente a lo ya comprometido (compromisos activos + cuotas de deudas). */
export function calcularPanorama(d: DatosExport, e: DatosExtra): Panorama {
  const ingresoEsperado = e.ingresosRecurrentes.filter(r => r.activo)
    .reduce((s, r) => s + montoMensualEquivalente(r.monto_esperado, r.frecuencia), 0)
  const compActivos = e.suscripciones.filter(s => s.activa)
  const compromisos = compActivos.reduce((s, c) => s + montoMensualEquivalente(c.monto, c.frecuencia), 0)
  const deudasConCuota = d.deudas.filter(x => (x.estado === 'activa' || x.estado === 'en_mora') && x.direccion !== 'me_deben' && (x.cuota_mensual ?? 0) > 0)
  const cuotasDeuda = deudasConCuota.reduce((s, x) => s + Math.min(x.cuota_mensual ?? 0, deudaPendienteReal(x)), 0)
  const solapamientos: string[] = []
  for (const c of compActivos) for (const x of deudasConCuota) {
    if (nombresSeParecen(c.nombre, x.nombre)) solapamientos.push(`${c.nombre.trim()} ↔ ${x.nombre.trim()}`)
  }
  const margen = ingresoEsperado - compromisos - cuotasDeuda
  return {
    ingresoEsperado, compromisos, cuotasDeuda, margen,
    comprometidoPct: ingresoEsperado > 0 ? (compromisos + cuotasDeuda) / ingresoEsperado : null,
    solapamientos,
  }
}

export function hojaPanorama(d: DatosExport, e: DatosExtra, ingresoRealUltimoPeriodo: { etiqueta: string; monto: number } | null,
  gastoPromedio: { periodos: number; monto: number } | null): Hoja {
  const p = calcularPanorama(d, e)
  const pat = calcularPatrimonio(d.cuentas, d.deudas, d.cobrar)
  const compActivos = e.suscripciones.filter(s => s.activa)
  const porTipo = new Map<string, number>()
  for (const c of compActivos) porTipo.set(TIPO_COMPROMISO[c.tipo] ?? c.tipo, (porTipo.get(TIPO_COMPROMISO[c.tipo] ?? c.tipo) ?? 0) + montoMensualEquivalente(c.monto, c.frecuencia))
  const sinCuota = d.deudas.filter(x => (x.estado === 'activa' || x.estado === 'en_mora') && x.direccion !== 'me_deben' && !((x.cuota_mensual ?? 0) > 0))

  const filas: { concepto: string; monto: number | null; detalle: string }[] = [
    { concepto: 'INGRESOS (configurados)', monto: null, detalle: '' },
    { concepto: 'Ingreso mensual esperado', monto: p.ingresoEsperado, detalle: e.ingresosRecurrentes.filter(r => r.activo).map(r => `${r.nombre.trim()} ${Math.round(r.monto_esperado).toLocaleString('es-CL')}`).join(' + ') || 'No hay ingresos recurrentes configurados' },
    ...(ingresoRealUltimoPeriodo ? [{ concepto: `Ingreso personal real · ${ingresoRealUltimoPeriodo.etiqueta}`, monto: ingresoRealUltimoPeriodo.monto, detalle: 'Último período completo. Si es muy distinto del esperado, revisa la hoja "Ingresos recurrentes".' }] : []),
    { concepto: 'LO YA COMPROMETIDO CADA MES', monto: null, detalle: '' },
    { concepto: 'Compromisos mensuales (activos)', monto: p.compromisos, detalle: `${compActivos.length} compromisos activos, llevados a su equivalente mensual` },
    ...[...porTipo.entries()].sort((a, b) => b[1] - a[1]).map(([t, m]) => ({ concepto: `   · ${t}`, monto: m, detalle: '' })),
    { concepto: 'Cuotas de deudas mensuales', monto: p.cuotasDeuda, detalle: 'Suma de la cuota definida de cada deuda activa (la última cuota se limita a lo pendiente)' },
    { concepto: 'Total comprometido', monto: p.compromisos + p.cuotasDeuda, detalle: p.comprometidoPct != null ? `${(p.comprometidoPct * 100).toFixed(1)}% del ingreso mensual esperado` : 'Sin ingreso esperado configurado' },
    { concepto: 'Margen mensual (ingreso − comprometido)', monto: p.margen, detalle: 'Lo que queda cada mes antes de gastos variables (comida, transporte, etc.)' },
    ...(gastoPromedio ? [{ concepto: 'Gasto personal real promedio por período', monto: gastoPromedio.monto, detalle: `Promedio de ${gastoPromedio.periodos} período(s) completo(s). Incluye compromisos pagados desde cuentas; no es aditivo con el total comprometido.` }] : []),
    ...(p.solapamientos.length ? [{ concepto: 'Aviso: posible solapamiento', monto: null, detalle: `${p.solapamientos.join('; ')} — un compromiso y una deuda de tarjeta pueden ser la misma compra y estar contados dos veces.` }] : []),
    ...(sinCuota.length ? [{ concepto: 'Deudas sin cuota definida', monto: sinCuota.reduce((s, x) => s + deudaPendienteReal(x), 0), detalle: `Pendiente total de pago libre: ${sinCuota.map(x => x.nombre.trim()).join(', ')}` }] : []),
    { concepto: 'PATRIMONIO (hoy)', monto: null, detalle: '' },
    { concepto: 'Activos', monto: pat.activos.total, detalle: `Cuentas ${pat.activos.cuentas.toLocaleString('es-CL')} · Inversiones ${pat.activos.inversiones.toLocaleString('es-CL')} · Por cobrar ${pat.activos.porCobrar.toLocaleString('es-CL')}` },
    { concepto: 'Pasivos', monto: pat.pasivos.total, detalle: `Tarjetas ${pat.pasivos.tarjetas.toLocaleString('es-CL')} · Deudas propias ${pat.pasivos.deudas.toLocaleString('es-CL')} (las deudas ligadas a la tarjeta ya están dentro de la tarjeta)` },
    { concepto: 'Patrimonio neto', monto: pat.patrimonioNeto, detalle: 'Activos − Pasivos' },
  ]
  return {
    nombre: 'Panorama mensual',
    columnas: [
      { header: 'Concepto', key: 'concepto', width: 46, formato: 'texto' },
      { header: 'Monto (CLP)', key: 'monto', width: 16, formato: 'clp' },
      { header: 'Detalle', key: 'detalle', width: 110, formato: 'texto' },
    ],
    filas,
  }
}

/** Resumen de "por cobrar" ampliado: cuántos cobros llegaron y cuál fue el último. */
export function hojaPorCobrarDetalle(cobrar: CuentaPorCobrar[]): Hoja['filas'] {
  return cobrar.map(c => {
    const pagos = [...(c.pagos_cobrar ?? [])].sort((a, b) => a.fecha.localeCompare(b.fecha))
    const ult = pagos[pagos.length - 1]
    return {
      persona: c.persona, desc: c.descripcion, fecha: aFecha(c.fecha), orig: c.monto_original, rec: c.monto_pagado,
      pend: cobrarPendiente(c), estado: c.estado === 'pendiente' ? 'Pendiente' : c.estado === 'pagado' ? 'Pagado' : 'Cancelado',
      ncobros: pagos.length, ultFecha: fechaOrNull(ult?.fecha), vence: fechaOrNull(c.fecha_vencimiento),
    }
  })
}

export type { Cuenta, Deuda }
